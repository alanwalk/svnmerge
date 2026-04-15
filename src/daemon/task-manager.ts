import { v4 as uuidv4 } from 'uuid';
import { EventEmitter } from 'events';

/**
 * 任务状态
 */
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * 任务进度信息
 */
export interface TaskProgress {
  current: number;
  total: number;
  message: string;
  data?: any;
}

/**
 * 任务信息
 */
export interface Task {
  id: string;
  type: string;
  status: TaskStatus;
  progress?: TaskProgress;
  result?: any;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelRequested: boolean;
}

/**
 * 任务管理器
 * 管理所有异步任务的生命周期
 */
export class TaskManager extends EventEmitter {
  private tasks: Map<string, Task> = new Map();
  private taskTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private readonly DEFAULT_TIMEOUT = 5 * 60 * 1000; // 5 分钟

  /**
   * 创建新任务
   */
  createTask(type: string): string {
    const taskId = uuidv4();
    const task: Task = {
      id: taskId,
      type,
      status: TaskStatus.PENDING,
      createdAt: new Date(),
      cancelRequested: false
    };

    this.tasks.set(taskId, task);
    this.emit('task:created', task);

    // 设置超时
    const timeout = setTimeout(() => {
      this.failTask(taskId, 'Task timeout');
    }, this.DEFAULT_TIMEOUT);
    this.taskTimeouts.set(taskId, timeout);

    return taskId;
  }

  /**
   * 开始任务
   */
  startTask(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = TaskStatus.RUNNING;
    task.startedAt = new Date();
    this.emit('task:started', task);
  }

  /**
   * 更新任务进度
   */
  updateProgress(taskId: string, progress: TaskProgress): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.progress = progress;
    this.emit('task:progress', task);
  }

  /**
   * 完成任务
   */
  completeTask(taskId: string, result?: any): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = TaskStatus.COMPLETED;
    task.result = result;
    task.completedAt = new Date();
    this.clearTimeout(taskId);
    this.emit('task:completed', task);
  }

  /**
   * 任务失败
   */
  failTask(taskId: string, error: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = TaskStatus.FAILED;
    task.error = error;
    task.completedAt = new Date();
    this.clearTimeout(taskId);
    this.emit('task:failed', task);
  }

  /**
   * 请求取消任务
   */
  cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    if (task.status === TaskStatus.COMPLETED ||
        task.status === TaskStatus.FAILED ||
        task.status === TaskStatus.CANCELLED) {
      return false;
    }

    task.cancelRequested = true;
    task.status = TaskStatus.CANCELLED;
    task.completedAt = new Date();
    this.clearTimeout(taskId);
    this.emit('task:cancelled', task);
    return true;
  }

  /**
   * 检查任务是否被取消
   */
  isCancelled(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    return task ? task.cancelRequested : false;
  }

  /**
   * 获取任务信息
   */
  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 清理已完成的任务（保留最近 100 个）
   */
  cleanup(): void {
    const tasks = Array.from(this.tasks.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const toRemove = tasks.slice(100);
    for (const task of toRemove) {
      if (task.status === TaskStatus.COMPLETED ||
          task.status === TaskStatus.FAILED ||
          task.status === TaskStatus.CANCELLED) {
        this.tasks.delete(task.id);
        this.clearTimeout(task.id);
      }
    }
  }

  /**
   * 清除任务超时
   */
  private clearTimeout(taskId: string): void {
    const timeout = this.taskTimeouts.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.taskTimeouts.delete(taskId);
    }
  }
}

// 单例实例
let taskManagerInstance: TaskManager | null = null;

export function getTaskManager(): TaskManager {
  if (!taskManagerInstance) {
    taskManagerInstance = new TaskManager();
  }
  return taskManagerInstance;
}
