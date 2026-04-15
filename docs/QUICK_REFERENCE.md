# SVN Merge Tool - Quick Reference

## 启动 Daemon

```bash
npm run build
npx svnmerge-daemon start
```

## API 端点

### 基础信息
```bash
# 健康检查
curl http://localhost:36695/api/health

# 服务器信息
curl http://localhost:36695/api/info
```

### 仓库信息
```bash
# 获取仓库信息
curl http://localhost:36695/api/repo/info
```

### 查询 Revisions
```bash
# 查询 revision 列表（异步）
curl -X POST http://localhost:36695/api/revisions/query \
  -H "Content-Type: application/json" \
  -d '{
    "branchPath": "/branches/feature",
    "limit": 50
  }'

# 获取单个 revision 详情
curl "http://localhost:36695/api/revisions/12345/detail?branchPath=/branches/feature"
```

### 合并操作
```bash
# 开始合并（异步）
curl -X POST http://localhost:36695/api/merge/start \
  -H "Content-Type: application/json" \
  -d '{
    "branchPath": "/branches/feature",
    "revisions": [12345, 12346, 12347]
  }'

# 取消合并
curl -X POST http://localhost:36695/api/merge/cancel \
  -H "Content-Type: application/json" \
  -d '{"taskId": "uuid"}'
```

### 冲突处理
```bash
# 获取冲突列表
curl http://localhost:36695/api/conflicts

# 解决单个冲突（异步）
curl -X POST http://localhost:36695/api/conflicts/resolve \
  -H "Content-Type: application/json" \
  -d '{
    "filepath": "src/auth.ts",
    "strategy": "theirs-full"
  }'

# 批量解决所有冲突（异步）
curl -X POST http://localhost:36695/api/conflicts/resolve-all \
  -H "Content-Type: application/json" \
  -d '{"strategy": "theirs-full"}'
```

### MergeInfo
```bash
# 获取 mergeinfo
curl http://localhost:36695/api/mergeinfo
```

### 提交
```bash
# 提交更改（异步）
curl -X POST http://localhost:36695/api/commit \
  -H "Content-Type: application/json" \
  -d '{"message": "Merge feature branch"}'
```

### 任务管理
```bash
# 获取任务状态
curl http://localhost:36695/api/tasks/uuid

# 获取所有任务
curl http://localhost:36695/api/tasks
```

## WebSocket 连接

```javascript
const ws = new WebSocket('ws://localhost:36695/ws');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log(message);
};
```

## 测试

```bash
# 运行测试脚本
node test-api.js

# 查看 WebSocket 演示
open docs/websocket-demo.html
```

## 停止 Daemon

```bash
npx svnmerge-daemon stop
```

## 文档

- [完整 API 文档](./API.md)
- [实现总结](./IMPLEMENTATION_SUMMARY.md)
- [Web UI 开发指南](./WEBUI_GUIDELINES.md)
