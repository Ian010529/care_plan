import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import pool from "./db";
import { generateCarePlan } from "./services/llm";

// Redis 连接配置
const redisConnection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null, // BullMQ 要求
  },
);

// 定义任务数据类型
interface CarePlanJobData {
  carePlanId: string;
}

// 核心处理函数
async function processCarePlanJob(job: Job<CarePlanJobData>) {
  const { carePlanId } = job.data;
  const attemptNumber = job.attemptsMade + 1;

  console.log(
    `[Attempt ${attemptNumber}/4] Processing care plan ${carePlanId}...`,
  );

  try {
    // 1. 从数据库获取订单信息
    const result = await pool.query(
      `
      SELECT 
        o.patient_records,
        o.medication_name,
        cp.id as care_plan_id
      FROM care_plans cp
      JOIN orders o ON cp.order_id = o.id
      WHERE cp.id = $1
    `,
      [carePlanId],
    );

    if (result.rows.length === 0) {
      // 数据不存在，不应重试
      throw new Error(`Care plan ${carePlanId} not found in database`);
    }

    const { patient_records, medication_name } = result.rows[0];

    // 更新状态为 processing（仅在首次尝试时更新）
    if (attemptNumber === 1) {
      await pool.query(
        "UPDATE care_plans SET status = $1, updated_at = NOW() WHERE id = $2",
        ["processing", carePlanId],
      );
    }

    // 2. 调用 LLM 生成 Care Plan
    console.log(`Generating care plan for ${medication_name}...`);
    const carePlanContent = await generateCarePlan(
      patient_records,
      medication_name,
    );

    // 3. 把 care plan 存到数据库
    await pool.query(
      `UPDATE care_plans 
       SET content = $1, status = $2, updated_at = NOW() 
       WHERE id = $3`,
      [carePlanContent, "completed", carePlanId],
    );

    console.log(`✅ Care plan ${carePlanId} completed successfully`);
  } catch (error) {
    const errorMessage = (error as Error).message;
    console.error(
      `❌ [Attempt ${attemptNumber}/4] Error processing care plan ${carePlanId}:`,
      errorMessage,
    );

    // 如果已达到最大重试次数（4次尝试），标记为最终失败
    if (attemptNumber >= 4) {
      await pool.query(
        `UPDATE care_plans 
         SET status = $1, error_message = $2, updated_at = NOW() 
         WHERE id = $3`,
        ["failed", errorMessage, carePlanId],
      );
      console.error(
        `❌ Care plan ${carePlanId} failed after ${attemptNumber} attempts`,
      );
    }

    // 抛出错误，让 BullMQ 处理重试逻辑
    throw error;
  }
}

// 创建 Worker
const worker = new Worker<CarePlanJobData>("careplan", processCarePlanJob, {
  connection: redisConnection,
  concurrency: 5, // 并发处理 5 个任务
});

// Worker 事件监听
worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  if (job) {
    console.error(
      `❌ Job ${job.id} failed after ${job.attemptsMade} attempts:`,
      err.message,
    );
  }
});

worker.on("error", (err) => {
  console.error("❌ Worker error:", err);
});

// 优雅关闭
async function shutdown() {
  console.log("\n⏹ Shutting down worker...");
  await worker.close();
  await redisConnection.quit();
  await pool.end();
  console.log("👋 Worker stopped gracefully");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

console.log("🚀 BullMQ Worker started, waiting for jobs...");
console.log(
  "📊 Config: 4 attempts max, exponential backoff starting at 5s, concurrency: 5",
);
