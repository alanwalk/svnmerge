import express, { Request, Response, NextFunction } from 'express';
import * as http from 'http';
import * as path from 'path';
import WebSocket from 'ws';
import cors from 'cors';
import { getTaskManager } from './task-manager';
import { WebSocketManager } from './websocket-manager';
import { createApiRoutes } from './api-routes';

const PORT = 36695;
const app = express();
let server: http.Server;
let wss: WebSocket.Server;
let wsManager: WebSocketManager;

// 中间件
app.use(cors());
app.use(express.json());

// 静态文件服务 - 提供 public 目录下的文件
const publicPath = path.join(__dirname, '../../public');
app.use(express.static(publicPath));

// 请求日志
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// 健康检查接口
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    wsClients: wsManager ? wsManager.getClientCount() : 0
  });
});

// 基础信息接口
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    name: 'SVN Merge Tool Daemon',
    version: '2.0.0',
    pid: process.pid,
    nodeVersion: process.version,
    platform: process.platform,
    wsClients: wsManager ? wsManager.getClientCount() : 0
  });
});

// 注册 API 路由
const taskManager = getTaskManager();
app.use('/api', createApiRoutes(taskManager));

// 错误处理中间件
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(`[${new Date().toISOString()}] Error:`, err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// 启动服务器
function startServer() {
  server = app.listen(PORT, () => {
    console.log(`[${new Date().toISOString()}] SVN Merge Tool Daemon started`);
    console.log(`[${new Date().toISOString()}] HTTP server listening on port ${PORT}`);
    console.log(`[${new Date().toISOString()}] PID: ${process.pid}`);

    // 启动 WebSocket 服务器
    wss = new WebSocket.Server({ server, path: '/ws' });
    wsManager = new WebSocketManager(wss, taskManager);
    console.log(`[${new Date().toISOString()}] WebSocket server started on ws://localhost:${PORT}/ws`);

    // 定期清理已完成的任务
    setInterval(() => {
      taskManager.cleanup();
    }, 5 * 60 * 1000); // 每 5 分钟清理一次
  });

  // 错误处理
  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`[${new Date().toISOString()}] Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      console.error(`[${new Date().toISOString()}] Server error:`, error);
      process.exit(1);
    }
  });
}

// 优雅关闭
function gracefulShutdown(signal: string) {
  console.log(`[${new Date().toISOString()}] Received ${signal}, shutting down gracefully...`);

  // 关闭 WebSocket 连接
  if (wsManager) {
    console.log(`[${new Date().toISOString()}] Closing WebSocket connections...`);
    wsManager.closeAll();
  }

  if (server) {
    server.close(() => {
      console.log(`[${new Date().toISOString()}] Server closed`);
      process.exit(0);
    });

    // 如果 10 秒内没有关闭，强制退出
    setTimeout(() => {
      console.error(`[${new Date().toISOString()}] Forced shutdown after timeout`);
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

// 监听关闭信号
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 未捕获的异常处理
process.on('uncaughtException', (error) => {
  console.error(`[${new Date().toISOString()}] Uncaught exception:`, error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(`[${new Date().toISOString()}] Unhandled rejection at:`, promise, 'reason:', reason);
  process.exit(1);
});

// 启动
startServer();
