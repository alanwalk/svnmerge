import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Daemon 状态信息
 */
export interface DaemonStatus {
  running: boolean;
  pid?: number;
  startTime?: Date;
  uptime?: number;
}

/**
 * Daemon 管理器
 */
export class DaemonManager {
  private readonly configDir: string;
  private readonly pidFile: string;
  private readonly logFile: string;

  constructor() {
    this.configDir = path.join(os.homedir(), '.svnmerge');
    this.pidFile = path.join(this.configDir, 'daemon.pid');
    this.logFile = path.join(this.configDir, 'daemon.log');

    // 确保配置目录存在
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  /**
   * 启动 daemon 服务
   */
  async start(): Promise<void> {
    // 检查是否已经在运行
    const status = await this.status();
    if (status.running) {
      throw new Error(`Daemon is already running (PID: ${status.pid})`);
    }

    // 清理旧的 PID 文件
    if (fs.existsSync(this.pidFile)) {
      fs.unlinkSync(this.pidFile);
    }

    // 启动服务进程
    const serverPath = path.join(__dirname, 'server.js');

    // 打开日志文件
    const logFd = fs.openSync(this.logFile, 'a');

    const child = spawn('node', [serverPath], {
      detached: true,
      stdio: ['ignore', logFd, logFd]
    });

    // 保存 PID 和启动时间
    const pidData = {
      pid: child.pid!,
      startTime: new Date().toISOString()
    };
    fs.writeFileSync(this.pidFile, JSON.stringify(pidData, null, 2));

    // 分离进程，让它在后台运行
    child.unref();

    // 关闭文件描述符（子进程已经继承了）
    fs.closeSync(logFd);

    // 等待一小段时间确保进程启动成功
    await this.sleep(1000);

    // 验证进程是否真的在运行
    const newStatus = await this.status();
    if (!newStatus.running) {
      throw new Error('Failed to start daemon. Check logs at: ' + this.logFile);
    }

    console.log(`Daemon started successfully (PID: ${child.pid})`);
    console.log(`Logs: ${this.logFile}`);
  }

  /**
   * 停止 daemon 服务
   */
  async stop(timeout: number = 10000): Promise<void> {
    const status = await this.status();

    if (!status.running) {
      throw new Error('Daemon is not running');
    }

    const pid = status.pid!;

    try {
      // 发送 SIGTERM 信号，优雅关闭
      process.kill(pid, 'SIGTERM');

      // 等待进程退出
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        if (!this.isProcessRunning(pid)) {
          // 进程已退出，清理 PID 文件
          if (fs.existsSync(this.pidFile)) {
            fs.unlinkSync(this.pidFile);
          }
          console.log('Daemon stopped successfully');
          return;
        }
        await this.sleep(100);
      }

      // 超时，发送 SIGKILL 强制终止
      console.log('Graceful shutdown timeout, forcing kill...');
      process.kill(pid, 'SIGKILL');
      await this.sleep(500);

      // 清理 PID 文件
      if (fs.existsSync(this.pidFile)) {
        fs.unlinkSync(this.pidFile);
      }

      console.log('Daemon killed');
    } catch (error: any) {
      if (error.code === 'ESRCH') {
        // 进程不存在，清理 PID 文件
        if (fs.existsSync(this.pidFile)) {
          fs.unlinkSync(this.pidFile);
        }
        console.log('Daemon was not running (stale PID file removed)');
      } else {
        throw error;
      }
    }
  }

  /**
   * 重启 daemon 服务
   */
  async restart(): Promise<void> {
    console.log('Restarting daemon...');

    try {
      await this.stop();
    } catch (error: any) {
      if (!error.message.includes('not running')) {
        throw error;
      }
    }

    await this.sleep(500);
    await this.start();
  }

  /**
   * 获取 daemon 状态
   */
  async status(): Promise<DaemonStatus> {
    if (!fs.existsSync(this.pidFile)) {
      return { running: false };
    }

    try {
      const pidData = JSON.parse(fs.readFileSync(this.pidFile, 'utf-8'));
      const pid = pidData.pid;
      const startTime = new Date(pidData.startTime);

      // 检查进程是否真的在运行
      if (!this.isProcessRunning(pid)) {
        return { running: false };
      }

      const uptime = Math.floor((Date.now() - startTime.getTime()) / 1000);

      return {
        running: true,
        pid,
        startTime,
        uptime
      };
    } catch (error) {
      // PID 文件损坏
      return { running: false };
    }
  }

  /**
   * 检查进程是否在运行
   */
  private isProcessRunning(pid: number): boolean {
    try {
      // 发送信号 0 不会真的发送信号，只是检查进程是否存在
      process.kill(pid, 0);
      return true;
    } catch (error: any) {
      return error.code !== 'ESRCH';
    }
  }

  /**
   * 睡眠指定毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 获取日志文件路径
   */
  getLogPath(): string {
    return this.logFile;
  }
}
