import express from "express";
import "dotenv/config";
import cors from "cors";
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

const PORT = process.env.PORT || 4004;
const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

app.get("/health", (_req, res) => res.json({ service: "pharmacy", ok: true }));

async function startPharmacySubscribers() {
  try {
    await mq.subscribe(
      RABBITMQ_URL,
      "lab.test.completed",
      async (_key, msg) => {
        console.log("[pharmacy] 💊 received lab result:", msg);
        // Example: automatically prepare prescription
        const evt = {
          key: "pharmacy.prescription.fulfilled",
          payload: {
            patientId: msg.payload.patientId,
            fulfilledAt: new Date().toISOString(),
          },
        };
        await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
      },
      logEvent
    );

    await mq.subscribe(
      RABBITMQ_URL,
      "doctor.heartbeat",
      async (_key, msg) => {
        console.log("[pharmacy] ❤️ doctor heartbeat received:", msg);
      },
      logEvent
    );
  } catch (err) {
    console.error("[pharmacy] subscriber error:", err);
  }
}

// ✅ Manual prescription fulfillment endpoint (called from frontend)
app.post("/pharmacy/fulfill", async (req, res) => {
  const { patientId, medicine, dosage } = req.body;

  try {
    // Insert into DB (optional, for tracking)
    await pool.query(
      "INSERT INTO prescriptions_fulfilled (prescription_id, pharmacy_id) VALUES ($1, $2)",
      [patientId, "pharmacy-frontend"]
    );

    // Publish fulfillment event
    const evt = {
      key: "pharmacy.prescription.fulfilled",
      payload: {
        patientId,
        medicine,
        dosage,
        fulfilledAt: new Date().toISOString(),
      },
    };

    await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
    res.json({ ok: true, event: evt });
  } catch (err) {
    console.error("[pharmacy] fulfill error:", err);
    res.status(500).json({ error: "Failed to fulfill prescription" });
  }
});

// ✅ Receive new prescriptions and mark them fulfilled
await mq.subscribe(
  RABBITMQ_URL,
  "pharmacy.prescription.created",
  async (_key, msg) => {
    const { patientId, medicine, dosage, doctorId } = msg.payload;
    await pool.query(
      "INSERT INTO prescriptions_fulfilled (prescription_id, pharmacy_id) VALUES ($1,$2)",
      [doctorId, "pharmacy-001"]
    );
    const evt = {
      key: "pharmacy.prescription.fulfilled",
      payload: { patientId, medicine, fulfilledAt: new Date().toISOString() },
    };
    await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
  },
  logEvent
);

// Example periodic publisher: stock status
setInterval(async () => {
  const evt = {
    key: "pharmacy.stock.update",
    payload: { stockLevel: "OK", timestamp: new Date().toISOString() },
  };
  await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
}, 10 * 60_000);

startPharmacySubscribers();
app.listen(PORT, () => console.log(`pharmacy-service 💊 on ${PORT}`));
