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

// Health check
app.get("/health", (_req, res) => res.json({ service: "doctor", ok: true }));

// Fetch assigned room for a doctor
app.get("/doctor/:id/room", async (req, res) => {
  const { id } = req.params;
  const result = await pool.query(
    "SELECT room_number FROM room_assignments WHERE doctor_id = $1 ORDER BY assigned_at DESC LIMIT 1",
    [id]
  );
  res.json(result.rows[0] || { message: "No room assigned yet" });
});

/* ============================================================================
   Order a new lab test (re-allow after fulfillment)
============================================================================ */
async function orderTestHandler(req: express.Request, res: express.Response) {
  try {
    const { patientId, testType, orderedBy } = req.body;

    const pending = await pool.query(
      `SELECT 1 FROM lab_tests 
       WHERE patient_id = $1 AND test_type = $2 AND doctor_id = $3 AND result IS NULL
       LIMIT 1`,
      [patientId, testType, orderedBy]
    );

    if (pending.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "duplicate_test", message: "Duplicate test. Please enter a new one." });
    }

    const nameResult = await pool.query(
      "SELECT name FROM doctors WHERE id = $1 LIMIT 1",
      [orderedBy]
    );
    const doctorName = nameResult.rows[0]?.name || `Doctor ${orderedBy}`;

    await pool.query(
      "INSERT INTO lab_tests (patient_id, test_type, doctor_id) VALUES ($1,$2,$3)",
      [patientId, testType, orderedBy]
    );

    const evt = {
      key: "lab.test.requested",
      payload: { patientId, testType, orderedBy, doctorName },
      timestamp: new Date().toISOString(),
    };

    await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
    res.status(202).json({
      status: "queued",
      message: "Lab test order queued successfully",
      event: evt,
    });
  } catch (err) {
    console.error("[doctor] Error ordering test:", err);
    res.status(500).json({ error: "Failed to order test" });
  }
}

// Support both direct service path and gateway-prefixed path
app.post("/tests/order", orderTestHandler);
app.post("/doctor/tests/order", orderTestHandler);

/* ============================================================================
   Create a prescription (re-allow after fulfillment)
============================================================================ */
app.post("/doctor/prescription", async (req, res) => {
  try {
    const { patientId, medicine, dosage, doctorId } = req.body;

    const unfulfilled = await pool.query(
      `SELECT p.id 
       FROM prescriptions p
       LEFT JOIN prescriptions_fulfilled f ON f.prescription_id = p.id::text
       WHERE p.patient_id = $1 AND p.doctor_id = $2 
             AND p.medicine = $3 AND p.dosage = $4
             AND f.prescription_id IS NULL
       LIMIT 1`,
      [patientId, doctorId, medicine, dosage]
    );

    if (unfulfilled.rows.length > 0) {
      return res.status(409).json({
        error: "duplicate_prescription",
        message: "Duplicate prescription. Please modify or fulfill existing one.",
      });
    }

    const nameResult = await pool.query(
      "SELECT name FROM doctors WHERE id = $1 LIMIT 1",
      [doctorId]
    );
    const doctorName = nameResult.rows[0]?.name || `Doctor ${doctorId}`;

    await pool.query(
      "INSERT INTO prescriptions (patient_id, doctor_id, medicine, dosage) VALUES ($1,$2,$3,$4)",
      [patientId, doctorId, medicine, dosage]
    );

    const evt = {
      key: "pharmacy.prescription.created",
      payload: { patientId, medicine, dosage, doctorId, doctorName },
      timestamp: new Date().toISOString(),
    };

    await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
    res.json({
      ok: true,
      message: "Prescription sent successfully",
      event: evt,
    });
  } catch (err) {
    console.error("[doctor] Error sending prescription:", err);
    res.status(500).json({ error: "Failed to send prescription" });
  }
});

/* ============================================================================
   Subscribers
============================================================================ */
async function startDoctorSubscribers() {
  try {
    await mq.subscribe(
      RABBITMQ_URL,
      "lab.test.completed",
      async (_key, msg) => {
        console.log("[doctor] received lab result:", msg);
        await logEvent("doctor", "received", "lab.test.completed", msg?.payload || msg || {});
      },
      logEvent
    );

    await mq.subscribe(
      RABBITMQ_URL,
      "pharmacy.prescription.fulfilled",
      async (_key, msg) => {
        console.log("[doctor] received pharmacy update:", msg);
        await logEvent(
          "doctor",
          "received",
          "pharmacy.prescription.fulfilled",
          msg?.payload || msg || {}
        );
      },
      logEvent
    );

    await mq.subscribe(
      RABBITMQ_URL,
      "admin.room.assigned",
      async (_key, msg) => {
        console.log(`[doctor] assigned room ${msg.payload.roomNumber}`);
        await logEvent("doctor", "received", "admin.room.assigned", msg?.payload || msg || {});
      },
      logEvent
    );
  } catch (err) {
    console.error("[doctor] subscriber error:", err);
  }
}

/* ============================================================================
   Heartbeat
============================================================================ */
setInterval(async () => {
  const payload = { status: "alive", time: new Date().toISOString() };
  const evt = { key: "doctor.heartbeat", payload };
  await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
  await logEvent("doctor", "sent", "doctor.heartbeat", payload);
}, 60_000);

startDoctorSubscribers();
app.listen(PORT, () => console.log(`doctor-service running on ${PORT}`));
