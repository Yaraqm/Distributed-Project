import amqplib, { Connection, Channel } from "amqplib";

let conn: Connection | null = null;
let ch: Channel | null = null;

/** Create or reuse RabbitMQ channel */
export async function getChannel(url: string): Promise<Channel> {
  if (!conn) conn = await (amqplib as any).connect(url);
  if (!ch) ch = await (conn as any).createChannel();
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

  // Sanitize message
  const safeMessage: any = message || {};
  let cleanPayload: any = {};

  if (typeof safeMessage === "object") {
    if (safeMessage.Key && safeMessage.Payload) {
      cleanPayload = safeMessage.Payload;
    } else if (safeMessage.payload) {
      cleanPayload = safeMessage.payload;
    } else {
      cleanPayload = safeMessage;
    }
  }

  // Always lowercase keys for consistency
  const normalized = {
    key: (safeMessage.key || safeMessage.Key || routingKey).toLowerCase(),
    payload: cleanPayload,
    timestamp: new Date().toISOString(),
  };

  // Publish clean, normalized object
  channel.publish(
    exchange,
    routingKey,
    Buffer.from(JSON.stringify(normalized)),
    {
      contentType: "application/json",
      persistent: true,
    }
  );

  const service = process.env.SERVICE_NAME || "unknown";

  // Log clean payload
  if (logEvent) {
    try {
      await logEvent(service, "sent", routingKey, cleanPayload);
    } catch (err) {
      console.error("[broker] ⚠️ logEvent (sent) failed:", err);
    }
  }
}

/** Subscribe to a topic pattern */
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

  const service = process.env.SERVICE_NAME || "unknown";
  const queueName = `${service}.${pattern}`;
  const q = await channel.assertQueue(queueName, { durable: true });
  await channel.bindQueue(q.queue, exchange, pattern);

  channel.consume(q.queue, async (m) => {
    if (!m) return;
    try {
      const body = JSON.parse(m.content.toString());
      const payload = (body?.payload ?? body) || {};

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
