import express from "express";
import "dotenv/config";
import mq from "../../common/events/src/broker.ts";
import { pool } from "./db.js";

const app = express();
app.use(express.json());

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

        // ✅ Notify that lab test is completed
        await mq.publish(RABBITMQ_URL, "lab.test.completed", {
          patientId,
          testType,
          result: "Normal",
          timestamp: new Date().toISOString(),
        });
      }
    );
  } catch (e) {
    console.error("[lab] failed to start subscriber:", e);
  }
}

startLabSubscribers();
app.listen(PORT, () => console.log(`lab-service on ${PORT}`));
