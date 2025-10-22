import express from "express";
import "dotenv/config";
// safer namespace import:
import mq from "../../common/events/src/index.ts";
// or: import * as mq from "../../common/events/src/broker.ts";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 4002;
const RABBITMQ_URL = process.env.RABBITMQ_URL!;

app.get("/health", (_req, res) => res.json({ service: "admin", ok: true }));

app.post("/rooms/assign", async (req, res) => {
  const { patientId, room } = req.body;
  const evt = {
    key: "admin.room.assigned",
    payload: { patientId, room },
    timestamp: new Date().toISOString(),
  };
  // call through the namespace:
  await mq.publish(RABBITMQ_URL, "admin.room.assigned", evt);
  res.status(202).json({ status: "queued", event: evt });
});

app.listen(PORT, () => console.log(`admin-service on ${PORT}`));
