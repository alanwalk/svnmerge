# SVN Merge Tool - Daemon 管理模块

## 概述

Daemon 管理模块提供了一个后台服务进程管理系统，用于运行 SVN Merge Tool 的 Web 服务。

## 功能特性

- **进程管理**: 启动、停止、重启后台服务
- **状态监控**: 查看服务运行状态、PID、运行时间
- **日志记录**: 自动记录服务日志到文件
- **优雅关闭**: 支持 SIGTERM 优雅关闭，超时后 SIGKILL 强制终止
- **防重复启动**: 自动检测已运行的进程，避免重复启动

## 文件结构

```
src/daemon/
├── manager.ts      # Daemon 管理器核心逻辑
├── server.ts       # Web 服务器入口
└── index.ts        # 模块导出

~/.svnmerge/
├── daemon.pid      # 进程 PID 文件
└── daemon.log      # 服务日志文件
```

## 使用方法

### 命令行工具

```bash
# 启动服务
svnmerge-daemon start

# 查看状态
svnmerge-daemon status

# 停止服务
svnmerge-daemon stop

# 重启服务
svnmerge-daemon restart

# 查看日志（最后 50 行）
svnmerge-daemon logs

# 实时跟踪日志
svnmerge-daemon logs -f
```

### 编程接口

```typescript
import { DaemonManager } from 'svn-merge-tool';

const manager = new DaemonManager();

// 启动服务
await manager.start();

// 查看状态
const status = await manager.status();
console.log(status);
// {
//   running: true,
//   pid: 12345,
//   startTime: Date,
//   uptime: 3600
// }

// 停止服务（10 秒超时）
await manager.stop(10000);

// 重启服务
await manager.restart();

// 获取日志路径
const logPath = manager.getLogPath();
```

## Web API

服务启动后，监听端口 `36695`，提供以下接口：

### 健康检查

```bash
GET /api/health

# 响应
{
  "status": "ok",
  "timestamp": "2026-04-14T16:49:51.044Z",
  "uptime": 7.433568666
}
```

### 服务信息

```bash
GET /api/info

# 响应
{
  "name": "SVN Merge Tool Daemon",
  "version": "2.0.0",
  "pid": 98812,
  "nodeVersion": "v25.9.0",
  "platform": "darwin"
}
```

## 技术实现

### 进程管理

- 使用 `child_process.spawn` 创建子进程
- `detached: true` 使进程独立于父进程运行
- `child.unref()` 允许父进程退出而不等待子进程

### PID 文件

存储格式：
```json
{
  "pid": 12345,
  "startTime": "2026-04-14T16:49:43.667Z"
}
```

### 优雅关闭

1. 发送 `SIGTERM` 信号
2. 等待进程退出（默认 10 秒）
3. 超时后发送 `SIGKILL` 强制终止
4. 清理 PID 文件

### 日志管理

- 所有输出重定向到 `~/.svnmerge/daemon.log`
- 使用追加模式（`flags: 'a'`）
- 包含时间戳的结构化日志

## 错误处理

- **端口占用**: 如果端口 36695 已被占用，服务启动失败
- **重复启动**: 检测到已运行的进程时拒绝启动
- **进程不存在**: 停止不存在的进程时清理 PID 文件
- **未捕获异常**: 记录到日志并退出进程

## 开发说明

### 添加新的 API 接口

在 `src/daemon/server.ts` 中添加：

```typescript
app.get('/api/your-endpoint', (req: Request, res: Response) => {
  res.json({ data: 'your data' });
});
```

### 自定义配置

修改 `DaemonManager` 构造函数：

```typescript
constructor(configDir?: string, port?: number) {
  this.configDir = configDir || path.join(os.homedir(), '.svnmerge');
  this.port = port || 36695;
  // ...
}
```

## 依赖项

- `express`: Web 服务器框架
- `commander`: CLI 命令解析
- `chalk`: 终端颜色输出

## 测试

```bash
# 编译
npm run build

# 启动服务
node dist/daemon-cli.js start

# 测试 API
curl http://localhost:36695/api/health

# 停止服务
node dist/daemon-cli.js stop
```

## 未来扩展

- [ ] WebSocket 支持（实时推送合并进度）
- [ ] 多实例管理（支持多个工作目录）
- [ ] 日志轮转（自动归档旧日志）
- [ ] 性能监控（CPU、内存使用率）
- [ ] 远程管理（通过 API 控制 daemon）
