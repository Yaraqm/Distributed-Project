import amqplib, { Connection, Channel } from "amqplib";

let conn: Connection | null = null;
let ch: Channel | null = null;

export async function getChannel(url: string): Promise<Channel> {
  console.log("[broker] connecting to", url);
  if (!conn) conn = await (amqplib as any).connect(url);
  if (!ch) ch = await (conn as any).createChannel();
  console.log("[broker] channel created");
  return ch!; // assert non-null for the Promise<Channel> return type
}

/** Publish an event on a topic routing key */
export async function publish<T>(url: string, routingKey: string, message: T) {
  const channel = await getChannel(url);
  const exchange = "hms.topic";
  await channel.assertExchange(exchange, "topic", { durable: true });
  channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(message)), {
    contentType: "application/json",
    persistent: true,
  });
}

/** Subscribe to topic pattern (e.g., "lab.test.requested" or "pharmacy.*") */
export async function subscribe(
  url: string,
  pattern: string,
  onMessage: (key: string, msg: any) => Promise<void> | void
) {
  const channel = await getChannel(url);
  const exchange = "hms.topic";
  await channel.assertExchange(exchange, "topic", { durable: true });

  const q = await channel.assertQueue("", { exclusive: true });
  await channel.bindQueue(q.queue, exchange, pattern);

  channel.consume(q.queue, async (m) => {
    if (!m) return;
    try {
      const body = JSON.parse(m.content.toString());
      await onMessage(m.fields.routingKey, body);
      channel.ack(m);
    } catch (e) {
      console.error("Consumer error", e);
      channel.nack(m, false, false);
    }
  });
}

/** Default export so namespace/default imports also work */
const mq = { getChannel, publish, subscribe };
export default mq;
