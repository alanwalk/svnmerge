import WebSocket from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { Task, TaskManager } from './task-manager';

/**
 * WebSocket 客户端信息
 */
interface Client {
  id: string;
  ws: WebSocket;
  connectedAt: Date;
}

/**
 * WebSocket 消息类型
 */
export interface WSMessage {
  type: 'progress' | 'complete' | 'error' | 'cancelled';
  taskId: string;
  current?: number;
  total?: number;
  message?: string;
  data?: any;
  success?: boolean;
  result?: any;
  error?: string;
}

/**
 * WebSocket 管理器
 * 管理所有 WebSocket 连接和消息推送
 */
export class WebSocketManager {
  private clients: Map<string, Client> = new Map();
  private wss: WebSocket.Server;
  private taskManager: TaskManager;

  constructor(wss: WebSocket.Server, taskManager: TaskManager) {
    this.wss = wss;
    this.taskManager = taskManager;
    this.setupWebSocketServer();
    this.setupTaskListeners();
  }

  /**
   * 设置 WebSocket 服务器
   */
  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      const clientId = uuidv4();
      const client: Client = {
        id: clientId,
        ws,
        connectedAt: new Date()
      };

      this.clients.set(clientId, client);
      console.log(`[${new Date().toISOString()}] WebSocket client connected: ${clientId}`);

      // 发送欢迎消息
      this.sendToClient(clientId, {
        type: 'complete',
        taskId: 'connection',
        success: true,
        result: { clientId, message: 'Connected to SVN Merge Tool Daemon' }
      });

      // 处理客户端消息
      ws.on('message', (data: WebSocket.Data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Failed to parse message:`, error);
        }
      });

      // 处理断开连接
      ws.on('close', () => {
        this.clients.delete(clientId);
        console.log(`[${new Date().toISOString()}] WebSocket client disconnected: ${clientId}`);
      });

      // 处理错误
      ws.on('error', (error: Error) => {
        console.error(`[${new Date().toISOString()}] WebSocket error for client ${clientId}:`, error);
      });
    });
  }

  /**
   * 设置任务事件监听
   */
  private setupTaskListeners(): void {
    this.taskManager.on('task:progress', (task: Task) => {
      if (task.progress) {
        this.broadcast({
          type: 'progress',
          taskId: task.id,
          current: task.progress.current,
          total: task.progress.total,
          message: task.progress.message,
          data: task.progress.data
        });
      }
    });

    this.taskManager.on('task:completed', (task: Task) => {
      this.broadcast({
        type: 'complete',
        taskId: task.id,
        success: true,
        result: task.result
      });
    });

    this.taskManager.on('task:failed', (task: Task) => {
      this.broadcast({
        type: 'error',
        taskId: task.id,
        error: task.error
      });
    });

    this.taskManager.on('task:cancelled', (task: Task) => {
      this.broadcast({
        type: 'cancelled',
        taskId: task.id,
        message: 'Task cancelled'
      });
    });
  }

  /**
   * 处理客户端消息
   */
  private handleClientMessage(clientId: string, message: any): void {
    console.log(`[${new Date().toISOString()}] Message from client ${clientId}:`, message);
    // 可以在这里处理客户端发送的消息（如心跳、订阅特定任务等）
  }

  /**
   * 发送消息到特定客户端
   */
  sendToClient(clientId: string, message: WSMessage): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }

  /**
   * 广播消息到所有客户端
   */
  broadcast(message: WSMessage): void {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(messageStr);
      }
    });
  }

  /**
   * 获取连接的客户端数量
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * 关闭所有连接
   */
  closeAll(): void {
    this.clients.forEach((client) => {
      client.ws.close();
    });
    this.clients.clear();
  }
}
