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

app.get("/health", (_req, res) => res.json({ service: "admin", ok: true }));

app.get("/doctors", async (_req, res) => {
  const result = await pool.query("SELECT * FROM doctors");
  res.json(result.rows);
});

app.get("/rooms", async (_req, res) => {
  const result = await pool.query("SELECT * FROM rooms");
  res.json(result.rows);
});

async function startAdminSubscribers() {
  try {
    await mq.subscribe(
      RABBITMQ_URL,
      "lab.*",
      async (_key, msg) => {
        console.log("[admin] 📊 lab event:", msg);
      },
      logEvent
    );

    await mq.subscribe(
      RABBITMQ_URL,
      "pharmacy.*",
      async (_key, msg) => {
        console.log("[admin] 💊 pharmacy event:", msg);
      },
      logEvent
    );

    await mq.subscribe(
      RABBITMQ_URL,
      "doctor.heartbeat",
      async (_key, msg) => {
        console.log("[admin] 🩺 doctor heartbeat:", msg);
      },
      logEvent
    );
  } catch (err) {
    console.error("[admin] subscriber error:", err);
  }
}

// ✅ Add this endpoint:
app.post("/admin/assign-room", async (req, res) => {
  const { doctorId, roomNumber } = req.body;

  await pool.query(
    "INSERT INTO room_assignments (doctor_id, room_number) VALUES ($1, $2)",
    [doctorId, roomNumber]
  );

  // Mark room as unavailable
  await pool.query(
    "UPDATE rooms SET is_available = false WHERE room_number = $1",
    [roomNumber]
  );

  const evt = {
    key: "admin.room.assigned",
    payload: { doctorId, roomNumber, assignedAt: new Date().toISOString() },
  };

  await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
  res.json({ ok: true, event: evt });
});

// ✅ periodic scheduler publisher
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

// Example periodic publisher: daily report
setInterval(async () => {
  const evt = {
    key: "admin.daily.report",
    payload: {
      date: new Date().toISOString(),
      stats: { patientsProcessed: Math.floor(Math.random() * 50) + 10 },
    },
  };
  await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
}, 60 * 60_000); // hourly (simulate daily)

app.get("/events", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM event_logs ORDER BY created_at DESC LIMIT 50"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: "Failed to load events" });
  }
});

startAdminSubscribers();
app.listen(PORT, () => console.log(`admin-service 🧾 running on ${PORT}`));
