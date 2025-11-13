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

/* =============================================================================
   🩺 HEALTH CHECK
============================================================================= */
app.get("/health", (_req, res) => res.json({ service: "lab", ok: true }));

/* =============================================================================
   🧬 SUBSCRIBERS
============================================================================= */
async function startLabSubscribers() {
  try {
    // 🔹 Listen for doctor test requests
    await mq.subscribe(
      RABBITMQ_URL,
      "lab.test.requested",
      async (_key, msg) => {
        const { patientId, testType, orderedBy } = msg.payload;

        try {
          // Get doctor name for reference
          const doctorQuery = await pool.query(
            `SELECT name FROM doctors WHERE id = $1 LIMIT 1`,
            [orderedBy]
          );
          const doctorName = doctorQuery.rows[0]?.name || `Doctor ${orderedBy}`;

          // Store new test
          await pool.query(
            `INSERT INTO lab_tests (patient_id, test_type, doctor_id)
            VALUES ($1, $2, $3)
            ON CONFLICT (patient_id, test_type, doctor_id) DO NOTHING`,
            [patientId, testType, orderedBy]
          );

          console.log(
            `[lab] 🧾 Stored new test (${testType}) for patient ${patientId}, ordered by ${doctorName}`
          );
        } catch (err) {
          console.error("[lab] ❌ DB insert error:", err);
        }
      },
      logEvent
    );

    // 🔸 Optional: listen for doctor heartbeat
    await mq.subscribe(
      RABBITMQ_URL,
      "doctor.heartbeat",
      async (_key, msg) => {
        console.log("[lab] ❤️ Doctor heartbeat received:", msg);
      },
      logEvent
    );

    console.log("[lab] ✅ Subscribers started successfully");
  } catch (e) {
    console.error("[lab] ❌ Failed to start subscriber:", e);
  }
}

/* =============================================================================
   🧪 ROUTES
============================================================================= */

// ✅ Fetch all pending lab tests (with doctor name)
app.get("/lab/tests/pending", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT lt.id, lt.patient_id, lt.test_type, lt.doctor_id, d.name AS doctor_name
       FROM lab_tests lt
       LEFT JOIN doctors d ON lt.doctor_id::INT8 = d.id
       WHERE lt.result IS NULL
       ORDER BY lt.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("[lab] ❌ Failed to fetch pending tests:", err);
    res.status(500).json({ error: "Failed to fetch pending tests" });
  }
});

// ✅ Publish completed test and update DB
app.post("/lab/result", async (req, res) => {
  const { patientId, result } = req.body;
  if (!patientId || !result)
    return res
      .status(400)
      .json({ error: "Missing patientId or result field." });

  try {
    // Fetch the latest pending test for that patient
    const testQuery = await pool.query(
      `SELECT lt.id, lt.test_type, lt.doctor_id, d.name AS doctor_name
       FROM lab_tests lt
       LEFT JOIN doctors d ON lt.doctor_id::INT8 = d.id
       WHERE lt.patient_id = $1 AND lt.result IS NULL
       ORDER BY lt.created_at DESC
       LIMIT 1`,
      [patientId]
    );

    if (testQuery.rows.length === 0)
      return res.status(404).json({ error: "No pending test found for patient" });

    const { id, test_type, doctor_id, doctor_name } = testQuery.rows[0];

    // Update result in DB
    await pool.query(`UPDATE lab_tests SET result = $1 WHERE id = $2`, [
      result,
      id,
    ]);

    const evt = {
      key: "lab.test.completed",
      payload: {
        patientId,
        testType: test_type,
        result,
        doctorName: doctor_name || `Doctor ${doctor_id}`,
        completedAt: new Date().toISOString(),
      },
    };

    await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
    console.log(`[lab] ✅ Published test completion for patient ${patientId}`);

    res.json({
      ok: true,
      message: `Result successfully published for Test ${id}`,
      event: evt,
    });
  } catch (err) {
    console.error("[lab] ❌ Failed to publish result:", err);
    res.status(500).json({ error: "Failed to complete test" });
  }
});

// ✅ Optional: view completed tests
app.get("/lab/tests/completed", async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT lt.id, lt.patient_id, lt.test_type, lt.doctor_id, lt.result, lt.created_at, d.name AS doctor_name
       FROM lab_tests lt
       LEFT JOIN doctors d ON lt.doctor_id::INT8 = d.id
       WHERE lt.result IS NOT NULL
       ORDER BY lt.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("[lab] ❌ Failed to fetch completed tests:", err);
    res.status(500).json({ error: "Failed to fetch completed tests" });
  }
});

/* =============================================================================
   📦 PERIODIC EVENTS (Inventory Example)
============================================================================= */
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

/* =============================================================================
   🚀 START SERVER
============================================================================= */
startLabSubscribers();
app.listen(PORT, () => console.log(`lab-service 🧪 running on ${PORT}`));
