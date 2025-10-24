import { pool } from "../../lab-service/src/db.js";

export default async function logEvent(
  service: string,
  direction: string,
  routingKey: string,
  payload: any
) {
  try {
    // ✅ Ensure direction is always valid
    const cleanDirection =
      direction && typeof direction === "string"
        ? direction.trim().toLowerCase()
        : "sent";

    // ✅ Fallback to a safe default if direction is invalid
    const finalDirection =
      cleanDirection === "sent" || cleanDirection === "received"
        ? cleanDirection
        : "sent";

    // ✅ Safely serialize payload
    let safePayload: string;
    try {
      safePayload =
        payload !== undefined && payload !== null
          ? JSON.stringify(payload)
          : "{}";
    } catch {
      safePayload = "{}";
    }

    const query = `
      INSERT INTO event_logs (service, direction, routing_key, payload, created_at)
      VALUES ($1, $2, $3, $4, now())
      RETURNING id
    `;

    await pool.query(query, [service, finalDirection, routingKey, safePayload]);

    console.log(
      `[db] ✅ logged ${finalDirection} event from ${service}: ${routingKey}`
    );
  } catch (err: any) {
    console.error("[db] ❌ logEvent error:", err);
  }
}
