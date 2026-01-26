import { Queue, QueueOptions } from "bullmq";
import IORedis from "ioredis";

// Redis 连接配置
const redisConnection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null, // BullMQ 要求
  },
);

// BullMQ 队列配置
const queueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 4, // 初始尝试 + 3 次重试
    backoff: {
      type: "exponential",
      delay: 5000, // 初始延迟 5 秒
    },
    removeOnComplete: {
      age: 86400, // 保留成功任务 24 小时
      count: 1000, // 最多保留 1000 个成功任务
    },
    removeOnFail: {
      age: 604800, // 保留失败任务 7 天
    },
  },
};

// 创建 Care Plan 队列
export const carePlanQueue = new Queue("careplan", queueOptions);

// 队列事件监听（可选，用于调试）
carePlanQueue.on("error", (err) => {
  console.error("❌ Queue error:", err);
});

// 优雅关闭
export async function closeQueue() {
  await carePlanQueue.close();
  await redisConnection.quit();
}
