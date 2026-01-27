import IORedis from "ioredis";

const publisher = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
);

const CHANNEL = "careplan:updates";

export async function publishOrderUpdate(orderId: number) {
  try {
    await publisher.publish(CHANNEL, JSON.stringify({ orderId }));
    console.log(`📤 Published update for order ${orderId}`);
  } catch (error) {
    console.error("Error publishing to Redis:", error);
  }
}
