import amqplib, { Connection, Channel } from "amqplib";

let conn: Connection | null = null;
let ch: Channel | null = null;

export async function getChannel(url: string): Promise<Channel> {
  console.log("[broker] connecting to", url);
  if (!conn) conn = await (amqplib as any).connect(url);
  if (!ch) ch = await (conn as any).createChannel();
  console.log("[broker] channel created");
  return ch!;
}

/** Publish an event on a topic routing key */
export async function publish<T>(
  url: string,
  routingKey: string,
  message: T,
  logEvent?: (
    service: string,
    direction: "sent" | "received",
    routingKey: string,
    payload: any
  ) => Promise<void>
) {
  const channel = await getChannel(url);
  const exchange = "hms.topic";
  await channel.assertExchange(exchange, "topic", { durable: true });

  // ✅ Always have a safe payload
  const safeMessage: any = message || {};
  const payload = (safeMessage.payload ?? safeMessage) || {};

  channel.publish(
    exchange,
    routingKey,
    Buffer.from(JSON.stringify(safeMessage)),
    {
      contentType: "application/json",
      persistent: true,
    }
  );

  const service = process.env.SERVICE_NAME || "unknown";

  if (logEvent) {
    try {
      await logEvent(service, "sent", routingKey, payload);
    } catch (err) {
      console.error("[broker] ⚠️ logEvent (sent) failed:", err);
    }
  }
}

/** Subscribe to topic pattern (e.g., "lab.test.requested" or "pharmacy.*") */
export async function subscribe(
  url: string,
  pattern: string,
  onMessage: (key: string, msg: any) => Promise<void> | void,
  logEvent?: (
    service: string,
    direction: "sent" | "received",
    routingKey: string,
    payload: any
  ) => Promise<void>
) {
  const channel = await getChannel(url);
  const exchange = "hms.topic";
  await channel.assertExchange(exchange, "topic", { durable: true });

  const q = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(q.queue, exchange, pattern);

  const service = process.env.SERVICE_NAME || "unknown";

  channel.consume(q.queue, async (m) => {
    if (!m) return;
    try {
      const body = JSON.parse(m.content.toString());
      const payload = (body?.payload ?? body) || {}; // ✅ Safe default

      if (logEvent) {
        try {
          await logEvent(service, "received", m.fields.routingKey, payload);
        } catch (err) {
          console.error("[broker] ⚠️ logEvent (received) failed:", err);
        }
      }

      await onMessage(m.fields.routingKey, body);
      channel.ack(m);
    } catch (e) {
      console.error("Consumer error", e);
      channel.nack(m, false, false);
    }
  });
}

const mq = { getChannel, publish, subscribe };
export default mq;
