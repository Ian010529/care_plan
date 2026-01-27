import IORedis from "ioredis";
import { sseManager } from "./sse";
import pool from "../db";

const subscriber = new IORedis(
  process.env.REDIS_URL || "redis://localhost:6379",
);

const CHANNEL = "careplan:updates";

// 订阅 Redis 频道
subscriber.subscribe(CHANNEL, (err) => {
  if (err) {
    console.error("❌ Failed to subscribe to Redis channel:", err);
  } else {
    console.log(`✅ Subscribed to Redis channel: ${CHANNEL}`);
  }
});

// 处理接收到的消息
subscriber.on("message", async (channel: string, message: string | Buffer) => {
  if (channel !== CHANNEL) return;

  try {
    // message 是 Buffer，需要转换为字符串
    const messageStr =
      typeof message === "string" ? message : message.toString();
    const { orderId } = JSON.parse(messageStr);

    // 从数据库获取完整的 order 数据
    const result = await pool.query(
      `
      SELECT 
        o.id,
        o.primary_diagnosis,
        o.medication_name,
        o.additional_diagnosis,
        o.medication_history,
        o.patient_records,
        o.created_at as order_created_at,
        p.id as patient_id,
        p.first_name,
        p.last_name,
        p.mrn,
        p.date_of_birth as patient_date_of_birth,
        pr.id as provider_id,
        pr.name as provider_name,
        pr.npi as provider_npi,
        cp.id as care_plan_id,
        cp.content as care_plan_content,
        cp.status as care_plan_status,
        cp.error_message,
        cp.created_at as care_plan_created_at,
        cp.updated_at as care_plan_updated_at
      FROM orders o
      JOIN patients p ON o.patient_id = p.id
      JOIN providers pr ON o.provider_id = pr.id
      LEFT JOIN care_plans cp ON o.id = cp.order_id
      WHERE o.id = $1
    `,
      [orderId],
    );

    if (result.rows.length > 0) {
      // 通过 SSE 广播给所有连接的客户端
      sseManager.broadcast("order-update", result.rows[0]);
      console.log(
        `📡 Broadcast order ${orderId} to ${sseManager.getClientCount()} client(s)`,
      );
    }
  } catch (error) {
    console.error("Error handling Redis message:", error);
  }
});

export { subscriber };
