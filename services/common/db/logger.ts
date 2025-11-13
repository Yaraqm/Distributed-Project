import { pool } from "../../lab-service/src/db.js";

export default async function logEvent(
  service: string,
  direction: string,
  routingKey: string,
  payload: any
) {
  try {
    const cleanDirection =
      direction && typeof direction === "string"
        ? direction.trim().toLowerCase()
        : "sent";

    const finalDirection =
      cleanDirection === "sent" || cleanDirection === "received"
        ? cleanDirection
        : "sent";

    // ✅ Normalize keys to lowercase for consistent dashboard display
    const normalizeKeys = (obj: Record<string, any>): Record<string, any> => {
      if (!obj || typeof obj !== "object") return obj;
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [
          k.charAt(0).toLowerCase() + k.slice(1),
          typeof v === "object" && v !== null ? normalizeKeys(v) : v,
        ])
      );
    };


    const normalizedPayload = normalizeKeys(payload ?? {});

    // ✅ Avoid double-stringifying: only stringify once for DB storage
    const safePayload = JSON.stringify(normalizedPayload);

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
