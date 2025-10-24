import express from "express";
import "dotenv/config";
import cors from "cors";
import mq from "../../common/events/src/broker.ts";
import { pool } from "./db.js";
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

// 🩺 Health check
app.get("/health", (_req, res) => res.json({ service: "lab", ok: true }));

/* 
===============================================================================
  🧬 SUBSCRIBERS
===============================================================================
*/
async function startLabSubscribers() {
  try {
    // 🔹 Listen for doctor test requests
    await mq.subscribe(
      RABBITMQ_URL,
      "lab.test.requested",
      async (_key, msg) => {
        const { patientId, testType, orderedBy } = msg.payload;

        try {
          // Store test request in DB
          await pool.query(
            `INSERT INTO lab_tests (patient_id, test_type, doctor_id)
             VALUES ($1, $2, $3)`,
            [patientId, testType, orderedBy]
          );

          console.log(`[lab] 🧾 stored new test for patient ${patientId}`);
        } catch (err) {
          console.error("[lab] ❌ DB insert error:", err);
        }
      },
      logEvent
    );

    // Optional: listen for heartbeat from doctors
    await mq.subscribe(
      RABBITMQ_URL,
      "doctor.heartbeat",
      async (_key, msg) => {
        console.log("[lab] ❤️ doctor heartbeat received:", msg);
      },
      logEvent
    );

    console.log("[lab] ✅ subscribers started");
  } catch (e) {
    console.error("[lab] ❌ failed to start subscriber:", e);
  }
}

/* 
===============================================================================
  🧪 ROUTES
===============================================================================
*/

// ✅ Return all pending lab tests
app.get("/lab/tests/pending", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, patient_id, test_type, doctor_id
       FROM lab_tests
       WHERE result IS NULL
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("[lab] ❌ failed to fetch pending tests:", err);
    res.status(500).json({ error: "Failed to fetch pending tests" });
  }
});

// ✅ Publish completed test and update DB
app.post("/lab/result", async (req, res) => {
  const { patientId, result } = req.body;
  if (!patientId || !result)
    return res.status(400).json({ error: "Missing patientId or result" });

  try {
    // Update test in DB
    await pool.query(
      `UPDATE lab_tests
       SET result = $1
       WHERE patient_id = $2
       AND result IS NULL
       LIMIT 1`,
      [result, patientId]
    );

    // Publish test completion event
    const evt = {
      key: "lab.test.completed",
      payload: { patientId, result, completedAt: new Date().toISOString() },
    };

    await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
    console.log(`[lab] ✅ published test completion for ${patientId}`);

    res.json({ ok: true, event: evt });
  } catch (err) {
    console.error("[lab] ❌ failed to publish result:", err);
    res.status(500).json({ error: "Failed to complete test" });
  }
});

// ✅ Optional route to see completed tests
app.get("/lab/tests/completed", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, patient_id, test_type, doctor_id, result, created_at
       FROM lab_tests
       WHERE result IS NOT NULL
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("[lab] ❌ failed to fetch completed tests:", err);
    res.status(500).json({ error: "Failed to fetch completed tests" });
  }
});

/* 
===============================================================================
  📦 PERIODIC EVENTS (optional inventory update)
===============================================================================
*/
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

/* 
===============================================================================
  🚀 START SERVER
===============================================================================
*/
startLabSubscribers();
app.listen(PORT, () => console.log(`lab-service 🧪 running on ${PORT}`));
