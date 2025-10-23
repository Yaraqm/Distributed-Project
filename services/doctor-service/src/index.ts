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

// 👉 Publish new test orders
app.post("/tests/order", async (req, res) => {
  const { patientId, testType, orderedBy } = req.body;
  const evt = {
    key: "lab.test.requested",
    payload: { patientId, testType, orderedBy },
    timestamp: new Date().toISOString(),
  };
  await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
  res.status(202).json({ status: "queued", event: evt });
});

// 👉 Subscribe to lab and pharmacy updates
async function startDoctorSubscribers() {
  try {
    await mq.subscribe(
      RABBITMQ_URL,
      "lab.test.completed",
      async (_key, msg) => {
        console.log("[doctor] 🧬 received lab result:", msg);
      },
      logEvent
    );

    await mq.subscribe(
      RABBITMQ_URL,
      "pharmacy.prescription.fulfilled",
      async (_key, msg) => {
        console.log("[doctor] 💊 received pharmacy update:", msg);
      },
      logEvent
    );
  } catch (err) {
    console.error("[doctor] subscriber error:", err);
  }
}

// ✅ Create a prescription (publish to pharmacy)
app.post("/doctor/prescription", async (req, res) => {
  const { patientId, medicine, dosage, doctorId } = req.body;
  await pool.query(
    "INSERT INTO prescriptions (patient_id, doctor_id, medicine, dosage) VALUES ($1,$2,$3,$4)",
    [patientId, doctorId, medicine, dosage]
  );
  const evt = {
    key: "pharmacy.prescription.created",
    payload: { patientId, medicine, dosage, doctorId },
  };
  await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
  res.json({ ok: true, event: evt });
});

// ✅ Subscribe to admin room assignments
await mq.subscribe(
  RABBITMQ_URL,
  "admin.room.assigned",
  async (_key, msg) => {
    console.log(`[doctor] 🏥 assigned room ${msg.payload.roomNumber}`);
  },
  logEvent
);

// 👉 Example periodic publisher (heartbeat)
setInterval(async () => {
  const evt = {
    key: "doctor.heartbeat",
    payload: { status: "alive", time: new Date().toISOString() },
  };
  await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
}, 60_000);

startDoctorSubscribers();
app.listen(PORT, () => console.log(`doctor-service 🩺 on ${PORT}`));
