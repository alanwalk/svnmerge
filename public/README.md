# SVN Merge Tool - Web UI

现代化的 SVN 合并工具 Web 界面，复刻 TortoiseSVN 的 merge GUI 功能。

## 功能特性

- ✅ 直观的合并向导界面
- ✅ 实时进度显示（WebSocket）
- ✅ 版本选择和过滤
- ✅ 自动冲突解决
- ✅ 响应式设计
- ✅ 异步操作，UI 永不阻塞

## 文件结构

```
public/
├── index.html              # 主页面
├── merge-wizard.html       # 合并向导
├── css/
│   ├── main.css           # 主样式
│   ├── components.css     # 组件样式
│   └── wizard.css         # 向导样式
├── js/
│   ├── main.js            # 主逻辑
│   ├── components.js      # UI 组件
│   ├── websocket-client.js # WebSocket 客户端
│   ├── api-client.js      # API 客户端
│   ├── state-manager.js   # 状态管理
│   └── wizard.js          # 向导逻辑
└── assets/
    └── icons/             # 图标资源

```

## 使用方法

### 1. 启动 Daemon

```bash
npm run build
node dist/daemon-cli.js start
```

Daemon 将在 `http://localhost:36695` 启动。

### 2. 访问 Web UI

在浏览器中打开：

```
http://localhost:36695/index.html
```

或者使用任何静态文件服务器：

```bash
# 使用 Python
cd public
python3 -m http.server 8080

# 使用 Node.js http-server
npx http-server public -p 8080
```

然后访问 `http://localhost:8080`

### 3. 合并流程

1. **主页面**：查看仓库信息，点击"启动合并向导"
2. **选择合并类型**：选择"合并版本范围"或"合并特定版本"
3. **配置源分支**：输入源分支路径（如 `/branches/feature`）
4. **选择版本**：
   - 点击"显示日志"加载版本列表
   - 使用过滤器筛选版本
   - 勾选要合并的版本
5. **预览合并**：确认选择的版本
6. **执行合并**：实时查看合并进度
7. **完成**：解决冲突（如有），提交更改

## 核心特性说明

### 异步操作

所有耗时操作都是异步的，UI 始终保持响应：

- SVN 命令执行
- 版本查询
- 合并操作
- 冲突解决

### 实时进度

通过 WebSocket 接收实时进度更新：

- 合并进度百分比
- 每个版本的状态
- 错误和警告信息

### 状态持久化

使用 localStorage 保存用户输入：

- 源分支路径
- 合并类型
- 过滤条件

### 错误处理

友好的错误提示和恢复机制：

- 连接断开自动重连
- 操作失败显示详细错误
- 支持取消长时间操作

## API 端点

Web UI 使用以下 API 端点：

- `GET /api/health` - 健康检查
- `GET /api/repo/info` - 仓库信息
- `POST /api/revisions/query` - 查询版本
- `GET /api/revisions/:revision/detail` - 版本详情
- `POST /api/merge/start` - 开始合并
- `POST /api/merge/cancel` - 取消合并
- `GET /api/conflicts` - 获取冲突列表
- `POST /api/conflicts/resolve-all` - 批量解决冲突
- `POST /api/commit` - 提交更改

详细 API 文档请参考 `docs/API.md`

## WebSocket 消息

WebSocket 连接地址：`ws://localhost:36695/ws`

消息类型：

- `progress` - 进度更新
- `complete` - 任务完成
- `error` - 任务失败
- `cancelled` - 任务取消

## 浏览器兼容性

支持所有现代浏览器：

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## 开发说明

### 技术栈

- 纯 HTML/CSS/JavaScript（无框架依赖）
- 原生 WebSocket API
- 原生 Fetch API
- ES6+ 语法

### 设计原则

1. **UI 永不阻塞**：所有操作异步处理
2. **即时反馈**：每个操作都有加载状态
3. **错误友好**：清晰的错误提示和恢复建议
4. **响应式设计**：支持桌面和移动端

### 自定义样式

修改 `css/main.css` 中的 CSS 变量：

```css
:root {
  --primary-color: #007bff;
  --success-color: #28a745;
  --danger-color: #dc3545;
  --warning-color: #ffc107;
  /* ... */
}
```

## 故障排除

### 无法连接到服务器

1. 确认 daemon 正在运行：`node dist/daemon-cli.js status`
2. 检查端口是否被占用：`lsof -i :36695`
3. 查看 daemon 日志：`logs/daemon.log`

### WebSocket 连接失败

1. 检查浏览器控制台错误
2. 确认防火墙未阻止 WebSocket 连接
3. 尝试刷新页面重新连接

### 版本加载缓慢

1. 首次查询会从 SVN 服务器获取数据
2. 后续查询使用 SQLite 缓存，速度更快
3. 可以使用过滤器减少显示的版本数量

## 参考资源

- [TortoiseSVN Merge Guide](https://tortoisesvn.net/docs/release/TortoiseSVN_en/tsvn-dug-merge.html)
- [API 文档](../docs/API.md)
- [WebSocket Demo](../docs/websocket-demo.html)
- [开发规范](../.claude/WEBUI_GUIDELINES.md)

## 许可证

与主项目相同
