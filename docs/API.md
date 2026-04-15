# SVN Merge Tool - Backend API Documentation

## 概述

SVN Merge Tool Daemon 提供完整的 RESTful API 和 WebSocket 实时通信，用于支持 Web UI 的所有功能。

**服务器地址**: `http://localhost:36695`  
**WebSocket 地址**: `ws://localhost:36695/ws`

## 核心设计原则

### 异步任务模式

所有耗时操作（SVN 命令、合并、冲突解决等）都采用异步任务模式：

1. **立即返回 taskId**：API 立即返回任务 ID，不等待操作完成
2. **WebSocket 推送进度**：通过 WebSocket 实时推送任务进度和结果
3. **支持取消**：长时间运行的任务可以被取消

```javascript
// 典型流程
const response = await fetch('/api/merge/start', {
  method: 'POST',
  body: JSON.stringify({ branchPath, revisions })
});
const { taskId } = await response.json();

// 通过 WebSocket 监听进度
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.taskId === taskId) {
    if (message.type === 'progress') {
      console.log(`Progress: ${message.current}/${message.total}`);
    } else if (message.type === 'complete') {
      console.log('Task completed:', message.result);
    }
  }
};
```

---

## API 接口

### 1. 系统信息

#### GET /api/health
健康检查接口

**响应**:
```json
{
  "status": "ok",
  "timestamp": "2026-04-15T10:30:00.000Z",
  "uptime": 123.45,
  "wsClients": 2
}
```

#### GET /api/info
获取服务器信息

**响应**:
```json
{
  "name": "SVN Merge Tool Daemon",
  "version": "2.0.0",
  "pid": 12345,
  "nodeVersion": "v20.11.0",
  "platform": "darwin",
  "wsClients": 2
}
```

---

### 2. 仓库信息

#### GET /api/repo/info
获取当前工作目录的 SVN 仓库信息

**查询参数**:
- `cwd` (可选): 工作目录路径，默认为当前目录

**响应**:
```json
{
  "taskId": "uuid",
  "status": "completed",
  "result": {
    "path": "/path/to/working/copy",
    "url": "https://svn.example.com/repo/trunk",
    "repository_root": "https://svn.example.com/repo",
    "repository_uuid": "abc-123-def",
    "revision": "12345",
    "node_kind": "directory"
  }
}
```

---

### 3. Revision 查询

#### POST /api/revisions/query
查询指定分支的 revision 列表（异步）

**请求体**:
```json
{
  "branchPath": "/branches/feature",
  "limit": 100,
  "offset": 0,
  "cwd": "/path/to/working/copy",
  "filter": {
    "author": "john",
    "message": "fix",
    "dateFrom": "2026-01-01",
    "dateTo": "2026-04-15"
  }
}
```

**立即响应**:
```json
{
  "taskId": "uuid",
  "status": "pending"
}
```

**WebSocket 推送（完成时）**:
```json
{
  "type": "complete",
  "taskId": "uuid",
  "success": true,
  "result": {
    "revisions": [
      {
        "revision": 12345,
        "author": "john",
        "date": "2026-04-15T10:00:00.000Z",
        "message": "Fix bug in authentication"
      }
    ],
    "total": 1
  }
}
```

#### GET /api/revisions/:revision/detail
获取单个 revision 的详细信息（同步，使用缓存）

**查询参数**:
- `branchPath` (必需): 分支路径
- `cwd` (可选): 工作目录路径

**响应**:
```json
{
  "revision": 12345,
  "author": "john",
  "date": "2026-04-15T10:00:00.000Z",
  "message": "Fix bug in authentication",
  "paths": [
    "/trunk/src/auth.ts",
    "/trunk/src/utils.ts"
  ]
}
```

---

### 4. 合并操作

#### POST /api/merge/start
开始合并操作（异步）

**请求体**:
```json
{
  "branchPath": "/branches/feature",
  "revisions": [12345, 12346, 12347],
  "cwd": "/path/to/working/copy"
}
```

**立即响应**:
```json
{
  "taskId": "uuid",
  "status": "pending"
}
```

**WebSocket 推送（进度）**:
```json
{
  "type": "progress",
  "taskId": "uuid",
  "current": 1,
  "total": 3,
  "message": "Merging revision 12345...",
  "data": {
    "revision": 12345,
    "status": "running"
  }
}
```

**WebSocket 推送（完成）**:
```json
{
  "type": "complete",
  "taskId": "uuid",
  "success": true,
  "result": {
    "results": [
      { "revision": 12345, "status": "success" },
      { "revision": 12346, "status": "conflict", "conflicts": [...] },
      { "revision": 12347, "status": "success" }
    ]
  }
}
```

#### POST /api/merge/cancel
取消正在进行的合并操作

**请求体**:
```json
{
  "taskId": "uuid"
}
```

**响应**:
```json
{
  "success": true,
  "message": "Task cancelled"
}
```

---

### 5. 冲突处理

#### GET /api/conflicts
获取当前工作目录的冲突列表

**查询参数**:
- `cwd` (可选): 工作目录路径

**响应**:
```json
{
  "conflicts": [
    {
      "path": "src/auth.ts",
      "type": "text",
      "status": "C",
      "description": "内容冲突"
    }
  ]
}
```

#### POST /api/conflicts/resolve
解决单个冲突（异步）

**请求体**:
```json
{
  "filepath": "src/auth.ts",
  "strategy": "theirs-full",
  "revision": 12345,
  "cwd": "/path/to/working/copy"
}
```

**策略选项**:
- `theirs-full`: 使用他们的版本
- `mine-full`: 使用我的版本
- `working`: 使用工作副本版本
- `newest`: 使用最新版本（需要提供 revision）

**立即响应**:
```json
{
  "taskId": "uuid",
  "status": "pending"
}
```

#### POST /api/conflicts/resolve-all
批量解决所有冲突（异步）

**请求体**:
```json
{
  "strategy": "theirs-full",
  "cwd": "/path/to/working/copy"
}
```

**立即响应**:
```json
{
  "taskId": "uuid",
  "status": "pending"
}
```

**WebSocket 推送（进度）**:
```json
{
  "type": "progress",
  "taskId": "uuid",
  "current": 1,
  "total": 5,
  "message": "Resolving src/auth.ts..."
}
```

---

### 6. MergeInfo

#### GET /api/mergeinfo
获取当前目录的 mergeinfo（实时查询，不使用缓存）

**查询参数**:
- `cwd` (可选): 工作目录路径

**响应**:
```json
{
  "mergeInfo": [
    {
      "path": "/branches/feature",
      "revisions": [12345, 12346, 12347]
    }
  ]
}
```

---

### 7. 提交

#### POST /api/commit
提交更改（异步）

**请求体**:
```json
{
  "message": "Merge revisions 12345-12347 from feature branch",
  "cwd": "/path/to/working/copy"
}
```

**立即响应**:
```json
{
  "taskId": "uuid",
  "status": "pending"
}
```

**WebSocket 推送（完成）**:
```json
{
  "type": "complete",
  "taskId": "uuid",
  "success": true,
  "result": {
    "message": "Changes committed successfully"
  }
}
```

---

### 8. 任务管理

#### GET /api/tasks/:taskId
获取指定任务的状态

**响应**:
```json
{
  "id": "uuid",
  "type": "merge",
  "status": "running",
  "progress": {
    "current": 2,
    "total": 5,
    "message": "Merging revision 12346..."
  },
  "createdAt": "2026-04-15T10:00:00.000Z",
  "startedAt": "2026-04-15T10:00:01.000Z"
}
```

#### GET /api/tasks
获取所有任务列表

**响应**:
```json
{
  "tasks": [
    {
      "id": "uuid",
      "type": "merge",
      "status": "completed",
      "result": {...},
      "createdAt": "2026-04-15T10:00:00.000Z",
      "completedAt": "2026-04-15T10:05:00.000Z"
    }
  ]
}
```

---

## WebSocket 通信

### 连接

```javascript
const ws = new WebSocket('ws://localhost:36695/ws');

ws.onopen = () => {
  console.log('Connected to daemon');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  handleMessage(message);
};
```

### 消息格式

#### 进度消息
```json
{
  "type": "progress",
  "taskId": "uuid",
  "current": 2,
  "total": 5,
  "message": "Merging revision 12346...",
  "data": {
    "revision": 12346,
    "status": "running"
  }
}
```

#### 完成消息
```json
{
  "type": "complete",
  "taskId": "uuid",
  "success": true,
  "result": {
    "results": [...]
  }
}
```

#### 错误消息
```json
{
  "type": "error",
  "taskId": "uuid",
  "error": "SVN command failed: ..."
}
```

#### 取消消息
```json
{
  "type": "cancelled",
  "taskId": "uuid",
  "message": "Task cancelled"
}
```

---

## 错误处理

所有 API 错误都返回标准格式：

```json
{
  "error": "Error description",
  "message": "Detailed error message"
}
```

常见 HTTP 状态码：
- `200`: 成功
- `400`: 请求参数错误
- `404`: 资源不存在
- `500`: 服务器内部错误

---

## 使用示例

### 完整的合并流程

```javascript
// 1. 连接 WebSocket
const ws = new WebSocket('ws://localhost:36695/ws');
const taskResults = new Map();

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'progress') {
    console.log(`Progress: ${message.current}/${message.total} - ${message.message}`);
  } else if (message.type === 'complete') {
    taskResults.set(message.taskId, message.result);
  }
};

// 2. 查询 revisions
const queryResponse = await fetch('http://localhost:36695/api/revisions/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    branchPath: '/branches/feature',
    limit: 50
  })
});
const { taskId: queryTaskId } = await queryResponse.json();

// 等待查询完成
await waitForTask(queryTaskId);
const revisions = taskResults.get(queryTaskId).revisions;

// 3. 开始合并
const mergeResponse = await fetch('http://localhost:36695/api/merge/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    branchPath: '/branches/feature',
    revisions: revisions.map(r => r.revision)
  })
});
const { taskId: mergeTaskId } = await mergeResponse.json();

// 等待合并完成
await waitForTask(mergeTaskId);
const mergeResults = taskResults.get(mergeTaskId).results;

// 4. 检查冲突
const conflictsResponse = await fetch('http://localhost:36695/api/conflicts');
const { conflicts } = await conflictsResponse.json();

if (conflicts.length > 0) {
  // 5. 解决冲突
  const resolveResponse = await fetch('http://localhost:36695/api/conflicts/resolve-all', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ strategy: 'theirs-full' })
  });
  const { taskId: resolveTaskId } = await resolveResponse.json();
  await waitForTask(resolveTaskId);
}

// 6. 提交
const commitResponse = await fetch('http://localhost:36695/api/commit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'Merge feature branch'
  })
});
const { taskId: commitTaskId } = await commitResponse.json();
await waitForTask(commitTaskId);

console.log('Merge completed successfully!');
```

---

## 性能优化

### 缓存策略

- **Revision 信息**: 使用全局 SQLite 缓存，缓存命中时 < 100ms
- **MergeInfo**: 不使用缓存，实时查询（可能在工具外被修改）
- **冲突列表**: 不使用缓存，实时查询

### 批量操作

- 批量查询 revisions 使用单次 SVN 命令
- 批量缓存写入使用事务

### 任务清理

- 自动清理已完成的任务（保留最近 100 个）
- 每 5 分钟执行一次清理

---

## 测试

运行测试脚本：

```bash
# 启动 daemon
npm run build
node dist/daemon-cli.js start

# 在另一个终端运行测试
node test-api.js
```

测试脚本会验证：
- 健康检查
- 基础信息
- WebSocket 连接
- 仓库信息
- 冲突查询
- MergeInfo 查询
- 任务管理
