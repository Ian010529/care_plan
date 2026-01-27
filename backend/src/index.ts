import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ordersRouter from "./routes/orders";
import { sseManager } from "./services/sse";
import "./services/pubsub"; // 导入以启动订阅

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/orders", ordersRouter);

// SSE endpoint for real-time updates
app.get("/api/events", (req, res) => {
  // 设置 SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  // 生成客户端 ID
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // 注册客户端
  sseManager.addClient(clientId, res);

  // 发送初始连接确认消息
  res.write(`event: connected\n`);
  res.write(
    `data: ${JSON.stringify({ clientId, message: "Connected to SSE" })}\n\n`,
  );

  // 处理客户端断开连接
  req.on("close", () => {
    sseManager.removeClient(clientId);
  });
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`SSE endpoint available at http://localhost:${PORT}/api/events`);
});
