import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import pool from "./db";
import { generateCarePlan } from "./services/llm";
import { publishOrderUpdate } from "./services/publisher";

// Redis 连接配置
const redisConnection = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
  {
    maxRetriesPerRequest: null, // BullMQ 要求
  },
);

// Job 数据类型
interface CarePlanJobData {
  carePlanId: string;
}

// 处理 Care Plan 生成任务
async function processCarePlanJob(job: Job<CarePlanJobData>) {
  const { carePlanId } = job.data;
  console.log(`Processing care plan ${carePlanId}...`);

  try {
    // 1. 从数据库获取订单信息
    const result = await pool.query(
      `
      SELECT 
        o.id as order_id,
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
      throw new Error(`Care plan ${carePlanId} not found`);
    }

    const { order_id, patient_records, medication_name } = result.rows[0];

    // 更新状态为 processing
    await pool.query(
      "UPDATE care_plans SET status = $1, updated_at = NOW() WHERE id = $2",
      ["processing", carePlanId],
    );

    // 通知前端状态变更
    await publishOrderUpdate(order_id);

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

    // 通知前端生成完成
    await publishOrderUpdate(order_id);

    console.log(`✅ Care plan ${carePlanId} completed successfully`);
  } catch (error) {
    console.error(`❌ Error processing care plan ${carePlanId}:`, error);

    // 标记为失败
    await pool.query(
      `UPDATE care_plans 
       SET status = $1, error_message = $2, updated_at = NOW() 
       WHERE id = $3`,
      ["failed", (error as Error).message, carePlanId],
    );

    // 获取 order_id 并通知前端
    const orderResult = await pool.query(
      "SELECT order_id FROM care_plans WHERE id = $1",
      [carePlanId],
    );
    if (orderResult.rows.length > 0) {
      await publishOrderUpdate(orderResult.rows[0].order_id);
    }

    // 重新抛出错误让 BullMQ 处理重试
    throw error;
  }
}

// 创建 BullMQ Worker
const worker = new Worker<CarePlanJobData>("careplan", processCarePlanJob, {
  connection: redisConnection,
  concurrency: 5, // 同时处理 5 个任务
});

// Worker 事件监听
worker.on("ready", () => {
  console.log("🚀 Worker is ready and waiting for jobs...");
});

worker.on("active", (job: Job<CarePlanJobData>) => {
  console.log(`▶️  Job ${job.id} is now active`);
});

worker.on("completed", (job: Job<CarePlanJobData>) => {
  console.log(`✅ Job ${job.id} completed successfully`);
});

worker.on("failed", (job: Job<CarePlanJobData> | undefined, err: Error) => {
  if (job) {
    console.log(`❌ Job ${job.id} failed with error: ${err.message}`);
  } else {
    console.log(`❌ A job failed with error: ${err.message}`);
  }
});

worker.on("error", (err: Error) => {
  console.error("❌ Worker error:", err);
});

// 优雅关闭
async function gracefulShutdown() {
  console.log("\n⏹ Shutting down worker...");
  await worker.close();
  await redisConnection.quit();
  await pool.end();
  console.log("👋 Worker stopped gracefully");
  process.exit(0);
}

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
