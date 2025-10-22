import express from "express";
import "dotenv/config";
import mq from "../../common/events/src/index.ts"; // <- namespace import

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4001;
const RABBITMQ_URL = process.env.RABBITMQ_URL!;

app.get("/health", (_req, res) => res.json({ service: "doctor", ok: true }));

app.post("/tests/order", async (req, res) => {
  const { patientId, testType, orderedBy } = req.body;
  const evt = {
    key: "lab.test.requested",
    payload: { patientId, testType, orderedBy },
    timestamp: new Date().toISOString(),
  };
  await mq.publish(RABBITMQ_URL, evt.key, evt);
  console.log("[doctor] 🩺 published test request:", evt);
  res.status(202).json({ status: "queued", event: evt });
});

async function startDoctorSubscribers() {
  try {
    await mq.subscribe(
      RABBITMQ_URL,
      "lab.test.completed",
      async (_key, msg) => {
        console.log("[doctor] 🧾 received lab result:", msg);
        // Here you could update a local DB, notify UI, etc.
      }
    );
  } catch (err) {
    console.error("[doctor] failed to start subscriber:", err);
  }
}
startDoctorSubscribers();

app.listen(PORT, () => console.log(`doctor-service on ${PORT}`));
