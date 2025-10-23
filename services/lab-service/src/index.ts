import express from "express";
import "dotenv/config";
import mq from "../../common/events/src/broker.ts";
import { pool } from "./db.js";
import cors from "cors";
import logEventModule from "../../common/db/logger.ts";
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

const PORT = process.env.PORT || 4003;
const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

app.get("/health", (_req, res) => res.json({ service: "lab", ok: true }));

async function startLabSubscribers() {
  try {
    await mq.subscribe(
      RABBITMQ_URL,
      "lab.test.requested",
      async (_key, msg) => {
        const { patientId, testType, orderedBy } = msg.payload;
        await pool.query(
          "INSERT INTO lab_tests (patient_id, test_type, ordered_by) VALUES ($1,$2,$3)",
          [patientId, testType, orderedBy]
        );
        console.log("[lab] stored test request for", patientId);

        // Publish back test completion
        const resultEvt = {
          key: "lab.test.completed",
          payload: {
            patientId,
            result: "Normal",
            completedAt: new Date().toISOString(),
          },
        };
        await mq.publish(RABBITMQ_URL, resultEvt.key, resultEvt, logEvent);
      },
      logEvent
    );

    await mq.subscribe(
      RABBITMQ_URL,
      "doctor.heartbeat",
      async (_key, msg) => {
        console.log("[lab] ❤️ doctor heartbeat received:", msg);
      },
      logEvent
    );
  } catch (e) {
    console.error("[lab] failed to start subscriber:", e);
  }
}

// ✅ Create a test result manually
app.post("/lab/result", async (req, res) => {
  const { patientId, result } = req.body;
  const evt = {
    key: "lab.test.completed",
    payload: { patientId, result, completedAt: new Date().toISOString() },
  };
  await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
  res.json({ ok: true, event: evt });
});

// Example periodic publisher: inventory updates
setInterval(async () => {
  const evt = {
    key: "lab.inventory.update",
    payload: {
      itemsLow: ["ReagentA", "TubeSetB"],
      time: new Date().toISOString(),
    },
  };
  await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
}, 5 * 60_000);

startLabSubscribers();
app.listen(PORT, () => console.log(`lab-service 🧪 on ${PORT}`));
