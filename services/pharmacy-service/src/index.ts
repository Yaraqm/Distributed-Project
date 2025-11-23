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

const PORT = process.env.PORT || 4004;
const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

/* ============================================================================
   HEALTH CHECK
============================================================================ */
app.get("/health", (_req, res) => res.json({ service: "pharmacy", ok: true }));

/* ============================================================================
   SUBSCRIBERS
============================================================================ */
async function startPharmacySubscribers() {
  try {
    // Listen for prescriptions created by the doctor
    await mq.subscribe(
      RABBITMQ_URL,
      "pharmacy.prescription.created",
      async (_key, msg) => {
        const { patientId, doctorId, medicine, dosage } = msg.payload;
        try {
          await pool.query(
            `INSERT INTO prescriptions (patient_id, doctor_id, medicine, dosage)
             VALUES ($1, $2, $3, $4) 
             ON CONFLICT (patient_id, doctor_id, medicine, dosage) DO NOTHING`,
            [patientId, doctorId, medicine, dosage]
          );
          console.log(
            `[pharmacy] 💾 Stored new prescription for patient ${patientId}`
          );
        } catch (err) {
          console.error("[pharmacy] ❌ Failed to insert prescription:", err);
        }
      },
      logEvent
    );

    // Optional heartbeat listener
    await mq.subscribe(
      RABBITMQ_URL,
      "doctor.heartbeat",
      async (_key, msg) => {
        console.log("[pharmacy] ❤️ Doctor heartbeat received:", msg);
      },
      logEvent
    );

    console.log("[pharmacy] ✅ Subscribers started");
  } catch (err) {
    console.error("[pharmacy] ❌ Subscriber error:", err);
  }
}

/* ============================================================================
   ROUTES
============================================================================ */

// Get all pending (unfulfilled) prescriptions (with doctor name)
app.get("/pharmacy/pending", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.id, p.patient_id, p.doctor_id, d.name AS doctor_name, p.medicine, p.dosage
      FROM prescriptions p
      LEFT JOIN doctors d ON p.doctor_id::INT8 = d.id
      LEFT JOIN prescriptions_fulfilled f ON f.prescription_id = p.id::text
      WHERE f.prescription_id IS NULL
      ORDER BY p.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("[pharmacy] ❌ Failed to fetch pending:", err);
    res.status(500).json({ error: "Failed to fetch pending prescriptions" });
  }
});

// Fulfill a prescription
app.post("/pharmacy/fulfill", async (req, res) => {
  const { prescriptionId } = req.body;
  if (!prescriptionId)
    return res.status(400).json({ error: "Missing prescriptionId" });

  try {
    // Lookup the prescription and join doctor name
    const prescResult = await pool.query(
      `SELECT p.*, d.name AS doctor_name
       FROM prescriptions p
       LEFT JOIN doctors d ON p.doctor_id::INT8 = d.id
       WHERE p.id = $1`,
      [prescriptionId]
    );
    const presc = prescResult.rows[0];
    if (!presc)
      return res.status(404).json({ error: "Prescription not found" });

    // Insert fulfillment record
    await pool.query(
      `INSERT INTO prescriptions_fulfilled (prescription_id, pharmacy_id)
       VALUES ($1, $2)`,
      [prescriptionId, "pharmacy-frontend"]
    );

    // Publish fulfillment event
    const evt = {
      key: "pharmacy.prescription.fulfilled",
      payload: {
        prescriptionId,
        patientId: presc.patient_id,
        medicine: presc.medicine,
        dosage: presc.dosage,
        doctorName: presc.doctor_name || `Doctor ${presc.doctor_id}`,
        fulfilledAt: new Date().toISOString(),
      },
    };

    await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
    console.log(`[pharmacy] ✅ Fulfilled prescription ${prescriptionId}`);

    res.json({
      ok: true,
      message: `Prescription ${prescriptionId} fulfilled successfully.`,
      event: evt,
    });
  } catch (err) {
    console.error("[pharmacy] ❌ Fulfill error:", err);
    res.status(500).json({ error: "Failed to fulfill prescription" });
  }
});

/* ============================================================================
   STOCK STATUS (optional)
============================================================================ */
setInterval(async () => {
  const evt = {
    key: "pharmacy.stock.update",
    payload: { stockLevel: "OK", timestamp: new Date().toISOString() },
  };
  await mq.publish(RABBITMQ_URL, evt.key, evt, logEvent);
}, 10 * 60_000);

/* ============================================================================
   START SERVER
============================================================================ */
startPharmacySubscribers();
app.listen(PORT, () => console.log(`pharmacy-service 💊 running on ${PORT}`));
