import express from "express";
import cors from "cors";
import "dotenv/config";
import mq from "../../common/events/src/broker.ts";
import logEventModule from "../../common/db/logger.ts";
import { pool } from "./db.js";

const logEvent = (logEventModule as any).default || logEventModule;

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const PORT = process.env.PORT || 4002;
const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

/* =============================================================================
   🩺 HEALTH CHECK
============================================================================= */
app.get("/health", (_req, res) => res.json({ service: "admin", ok: true }));

/* =============================================================================
   👨‍⚕ DOCTOR MANAGEMENT
============================================================================= */

// Fetch all doctors
app.get("/doctors", async (_req, res) => {
  const result = await pool.query("SELECT * FROM doctors");
  res.json(result.rows);
});

// Create a new doctor
app.post("/admin/doctors", async (req, res) => {
  const { name, specialty } = req.body || {};
  if (!name || !specialty)
    return res.status(400).json({ error: "name and specialty are required" });

  try {
    const result = await pool.query(
      "INSERT INTO doctors (name, specialty) VALUES ($1, $2) RETURNING *",
      [name, specialty]
    );

    const doctor = result.rows[0];
    const evt = {
      key: "admin.doctor.created",
      payload: {
        id: doctor.id,
        name: doctor.name,
        specialty: doctor.specialty,
        createdAt: new Date().toISOString(),
      },
    };

    await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
    res.json({ ok: true, doctor, event: evt });
  } catch (err) {
    console.error("[admin] create doctor error:", err);
    res.status(500).json({ error: "Failed to create doctor" });
  }
});

// 🗑️ Remove a doctor — merged improved version
app.delete("/admin/doctors/:id", async (req, res) => {
  const id = String(req.params.id || "");
  if (!id) return res.status(400).json({ error: "id is required" });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1️⃣ Free rooms occupied by this doctor
    await client.query(
      `UPDATE rooms r
         SET is_available = TRUE
       WHERE EXISTS (
         SELECT 1 FROM room_assignments ra
         WHERE ra.room_number = r.room_number
           AND ra.doctor_id::TEXT = $1
       )`,
      [id]
    );

    // 2️⃣ Delete room assignments for this doctor
    await client.query(
      `DELETE FROM room_assignments WHERE doctor_id::TEXT = $1`,
      [id]
    );

    // 3️⃣ Delete doctor (supports id or doctor_id legacy)
    let result = await client.query(
      `DELETE FROM doctors WHERE id::TEXT = $1 RETURNING id, name, specialty`,
      [id]
    );
    if (result.rowCount === 0) {
      try {
        result = await client.query(
          `DELETE FROM doctors WHERE doctor_id::TEXT = $1 RETURNING doctor_id AS id, name, specialty`,
          [id]
        );
      } catch {}
    }

    if (result.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Doctor not found" });
    }

    const deleted = result.rows[0];
    const evt = {
      key: "admin.doctor.deleted",
      payload: {
        id: String(deleted.id),
        name: deleted.name,
        specialty: deleted.specialty,
        deletedAt: new Date().toISOString(),
      },
    };

    await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
    await client.query("COMMIT");

    res.json({ ok: true, doctor: deleted, event: evt });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[admin] delete doctor error:", err);
    res.status(500).json({ error: "Failed to delete doctor" });
  } finally {
    client.release();
  }
});

/* =============================================================================
   🏥 ROOM MANAGEMENT
============================================================================= */

// Fetch all rooms
app.get("/rooms", async (_req, res) => {
  const result = await pool.query("SELECT * FROM rooms");
  res.json(result.rows);
});

// Fetch assigned rooms
app.get("/admin/assigned-rooms", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ra.room_number AS "roomNumber",
        d.name AS "doctorName",
        ra.doctor_id AS "doctorId"
      FROM room_assignments ra
      JOIN doctors d ON ra.doctor_id::INT = d.id
      ORDER BY ra.assigned_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching assigned rooms:", err);
    res.status(500).json({ error: "Failed to fetch assigned rooms" });
  }
});

// Assign doctor to a room
app.post("/admin/assign-room", async (req, res) => {
  const { doctorId, roomNumber } = req.body;
  if (!doctorId || !roomNumber)
    return res.status(400).json({ error: "Missing doctorId or roomNumber" });

  try {
    const roomCheck = await pool.query(
      "SELECT * FROM rooms WHERE room_number = $1",
      [roomNumber]
    );

    if (roomCheck.rows.length === 0)
      return res.status(404).json({ error: `Room ${roomNumber} not found` });

    const room = roomCheck.rows[0];
    if (!room.is_available)
      return res.status(400).json({ error: `Room ${roomNumber} is already occupied` });

    const doctorCheck = await pool.query(
      "SELECT * FROM doctors WHERE id::TEXT = $1",
      [doctorId]
    );

    if (doctorCheck.rows.length === 0)
      return res.status(404).json({ error: `Doctor with ID ${doctorId} not found` });

    await pool.query("DELETE FROM room_assignments WHERE room_number = $1", [roomNumber]);
    await pool.query(
      `INSERT INTO room_assignments (doctor_id, room_number, assigned_at)
       VALUES ($1, $2, NOW())`,
      [doctorId, roomNumber]
    );
    await pool.query("UPDATE rooms SET is_available = false WHERE room_number = $1", [
      roomNumber,
    ]);

    const evt = {
      key: "admin.room.assigned",
      payload: { doctorId, roomNumber, assignedAt: new Date().toISOString() },
    };
    await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);

    const doctorResult = await pool.query(
      "SELECT name FROM doctors WHERE id::TEXT = $1",
      [doctorId]
    );
    const doctorName = doctorResult.rows[0]?.name || "Unknown";

    res.json({
      ok: true,
      message: `Assigned ${doctorName} to room ${roomNumber}`,
      event: evt,
      doctorName,
      doctorId,
      roomNumber,
    });
  } catch (err) {
    console.error("❌ Error assigning room:", err);
    res.status(500).json({ error: "Failed to assign room" });
  }
});

// Leave room (vacate)
app.post("/admin/leave-room", async (req, res) => {
  const { doctorId, roomNumber } = req.body;
  if (!doctorId || !roomNumber)
    return res.status(400).json({ error: "Missing doctorId or roomNumber" });

  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const deleteResult = await client.query(
        "DELETE FROM room_assignments WHERE doctor_id = $1 AND room_number = $2 RETURNING *",
        [doctorId, roomNumber]
      );

      if (deleteResult.rowCount === 0) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ error: "No room assignment found for this doctor and room" });
      }

      await client.query("UPDATE rooms SET is_available = true WHERE room_number = $1", [
        roomNumber,
      ]);

      const doctorResult = await client.query(
        "SELECT name FROM doctors WHERE id::TEXT = $1",
        [doctorId]
      );
      const doctorName = doctorResult.rows[0]?.name || "Unknown";

      const evt = {
        key: "admin.room.vacated",
        payload: {
          doctorId,
          doctorName,
          roomNumber,
          vacatedAt: new Date().toISOString(),
        },
      };

      await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
      await client.query("COMMIT");

      res.json({
        ok: true,
        message: `Room ${roomNumber} vacated by ${doctorName}`,
        event: evt,
        doctorName,
        doctorId,
        roomNumber,
      });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("❌ Error leaving room:", err);
    res.status(500).json({ error: "Failed to leave room" });
  }
});

// Reset all rooms
app.post("/admin/reset-rooms", async (_req, res) => {
  try {
    await pool.query("DELETE FROM room_assignments");
    await pool.query("UPDATE rooms SET is_available = true");
    res.json({ ok: true, message: "All rooms reset successfully." });
  } catch (err) {
    console.error("❌ Error resetting rooms:", err);
    res.status(500).json({ error: "Failed to reset rooms" });
  }
});

/* =============================================================================
   📜 EVENT LOGS
============================================================================= */
app.get("/events", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, service, direction, routing_key, payload, created_at FROM event_logs ORDER BY created_at DESC LIMIT 50"
    );

    const cleaned = result.rows.map((row) => {
      let parsed: any = row.payload;
      try {
        if (typeof row.payload === "string") {
          parsed = JSON.parse(row.payload);
          if (typeof parsed === "string") {
            try {
              parsed = JSON.parse(parsed);
            } catch {}
          }
        }
      } catch {}
      return { ...row, payload: parsed };
    });

    res.json(cleaned);
  } catch (err) {
    console.error("[admin] ❌ Failed to fetch events:", err);
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

/* =============================================================================
   🧠 SUBSCRIBERS
============================================================================= */
async function startAdminSubscribers() {
  try {
    await mq.subscribe(
      RABBITMQ_URL,
      "lab.*",
      async (_key, msg) => console.log("[admin] 📊 lab event:", msg),
      logEvent
    );

    await mq.subscribe(
      RABBITMQ_URL,
      "pharmacy.*",
      async (_key, msg) => console.log("[admin] 💊 pharmacy event:", msg),
      logEvent
    );

    await mq.subscribe(
      RABBITMQ_URL,
      "doctor.heartbeat",
      async (_key, msg) => console.log("[admin] 🩺 doctor heartbeat:", msg),
      logEvent
    );
  } catch (err) {
    console.error("[admin] subscriber error:", err);
  }
}

/* =============================================================================
   🕒 PERIODIC EVENTS
============================================================================= */
setInterval(async () => {
  const evt = {
    key: "admin.schedule.update",
    payload: {
      date: new Date().toISOString(),
      rooms: ["101A", "102B", "203C"],
      message: "Daily room schedule published",
    },
  };
  await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
}, 5 * 60_000);

setInterval(async () => {
  const evt = {
    key: "admin.daily.report",
    payload: {
      date: new Date().toISOString(),
      stats: { patientsProcessed: Math.floor(Math.random() * 50) + 10 },
    },
  };
  await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
}, 60 * 60_000);

/* =============================================================================
   🚀 START SERVER
============================================================================= */
startAdminSubscribers();
app.listen(PORT, () => console.log(`admin-service 🧾 running on ${PORT}`));
