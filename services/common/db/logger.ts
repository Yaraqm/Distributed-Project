import { pool } from "../../lab-service/src/db.js";

export default async function logEvent(
  service: string,
  direction: "sent" | "received",
  routingKey: string,
  payload: any
) {
  try {
    const query = `
      INSERT INTO event_logs (service, direction, routing_key, payload, created_at)
      VALUES ($1, $2, $3, $4, now())
      RETURNING id
    `;
    const result = await pool.query(query, [
      service,
      direction,
      routingKey,
      JSON.stringify(payload),
    ]);
    console.log(
      `[db] ✅ logged ${direction} event from ${service}: ${routingKey}`
    );
  } catch (err) {
    console.error("[db] ❌ logEvent error:", err);
  }
}
