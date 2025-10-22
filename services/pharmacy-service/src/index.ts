import express from "express";
import "dotenv/config";
import mq from "../../common/events/src/broker.ts";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4004;
const RABBITMQ_URL =
  process.env.RABBITMQ_URL || "amqp://guest:guest@localhost:5672";

console.log("[pharmacy] broker keys:", Object.keys(mq)); // should include getChannel,publish,subscribe

app.get("/health", (_req, res) => res.json({ service: "pharmacy", ok: true }));

async function startPharmacySubscribers() {
  try {
    await mq.subscribe(RABBITMQ_URL, "pharmacy.*", async (key, msg) => {
      console.log("[pharmacy] 💊 received:", key, msg);
    });
  } catch (err) {
    console.error("[pharmacy] failed to start subscriber:", err);
  }
}

startPharmacySubscribers();
app.listen(PORT, () =>
  console.log(`pharmacy-service 💊 running on port ${PORT}`)
);
