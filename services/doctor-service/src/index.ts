import express from "express";
import "dotenv/config";
import mq from "../../common/events/src/broker.ts";
import cors from "cors";
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

const PORT = process.env.PORT || 4001;
const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

app.get("/health", (_req, res) => res.json({ service: "doctor", ok: true }));

// ✅ Fetch assigned room for a doctor
app.get("/doctor/:id/room", async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    "SELECT room_number FROM room_assignments WHERE doctor_id = $1 ORDER BY assigned_at DESC LIMIT 1",
    [id]
  );
  res.json(result.rows[0] || { message: "No room assigned yet" });
});

// ✅ Order a new test
app.post("/tests/order", async (req, res) => {
  try {
    const { patientId, testType, orderedBy } = req.body;

    // Ensure lab_tests has doctor_id
    await pool.query(
      "INSERT INTO lab_tests (patient_id, test_type, doctor_id) VALUES ($1,$2,$3)",
      [patientId, testType, orderedBy]
    );

    const evt = {
      key: "lab.test.requested",
      payload: { patientId, testType, orderedBy },
      timestamp: new Date().toISOString(),
    };

    await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
    res.status(202).json({ status: "queued", event: evt });
  } catch (err) {
    console.error("[doctor] ❌ Error ordering test:", err);
    res.status(500).json({ error: "Failed to order test" });
  }
});

// ✅ Create a prescription
app.post("/doctor/prescription", async (req, res) => {
  try {
    const { patientId, medicine, dosage, doctorId } = req.body;

    await pool.query(
      "INSERT INTO prescriptions (patient_id, doctor_id, medicine, dosage) VALUES ($1,$2,$3,$4)",
      [patientId, doctorId, medicine, dosage]
    );

    const evt = {
      key: "pharmacy.prescription.created",
      payload: { patientId, medicine, dosage, doctorId },
      timestamp: new Date().toISOString(),
    };

    await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
    res.json({ ok: true, event: evt });
  } catch (err) {
    console.error("[doctor] ❌ Error sending prescription:", err);
    res.status(500).json({ error: "Failed to send prescription" });
  }
});

// ✅ Subscribe to other service events safely
async function startDoctorSubscribers() {
  try {
    await mq.subscribe(
      RABBITMQ_URL,
      "lab.test.completed",
      async (_key, msg) => {
        console.log("[doctor] 🧬 received lab result:", msg);
        await logEvent("received", "lab.test.completed", msg || {});
      },
      logEvent
    );

    await mq.subscribe(
      RABBITMQ_URL,
      "pharmacy.prescription.fulfilled",
      async (_key, msg) => {
        console.log("[doctor] 💊 received pharmacy update:", msg);
        await logEvent(
          "received",
          "pharmacy.prescription.fulfilled",
          msg || {}
        );
      },
      logEvent
    );

    await mq.subscribe(
      RABBITMQ_URL,
      "admin.room.assigned",
      async (_key, msg) => {
        console.log(`[doctor] 🏥 assigned room ${msg.payload.roomNumber}`);
        await logEvent("received", "admin.room.assigned", msg || {});
      },
      logEvent
    );
  } catch (err) {
    console.error("[doctor] subscriber error:", err);
  }
}

// ✅ Heartbeat with safe payload
setInterval(async () => {
  const evt = {
    key: "doctor.heartbeat",
    payload: { status: "alive", time: new Date().toISOString() },
  };
  await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
  // also log heartbeat safely
  await logEvent("sent", "doctor.heartbeat", evt.payload);
}, 60_000);

startDoctorSubscribers();
app.listen(PORT, () => console.log(`doctor-service 🩺 running on ${PORT}`));
