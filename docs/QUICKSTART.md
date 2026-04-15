# SVN Merge Tool - Web UI 快速入门

## 5 分钟快速开始

### 1. 启动服务

**方式 A: 使用启动脚本（推荐）**

```bash
# macOS/Linux
./start-webui.sh

# Windows
start-webui.bat
```

**方式 B: 手动启动**

```bash
# 构建项目（首次运行）
npm install
npm run build

# 启动 daemon
node dist/daemon-cli.js start

# 或使用 npm 脚本
npm run daemon:start
```

### 2. 访问 Web UI

浏览器打开：`http://localhost:36695/index.html`

### 3. 开始合并

1. 点击"启动合并向导"
2. 选择合并类型（通常选"合并版本范围"）
3. 输入源分支路径（如 `/branches/feature`）
4. 点击"显示日志"加载版本列表
5. 勾选要合并的版本
6. 点击"下一步"预览
7. 点击"开始合并"执行
8. 等待合并完成，解决冲突（如有）
9. 输入提交信息，点击"提交更改"

## 页面说明

### 主页面 (index.html)

- 显示仓库信息
- 快速操作入口
- 检查冲突
- 查看 MergeInfo

### 合并向导 (merge-wizard.html)

6 步向导流程：

1. **选择合并类型**：范围合并 vs 特定版本
2. **配置源分支**：输入分支路径
3. **选择版本**：浏览、过滤、选择版本
4. **预览合并**：确认选择
5. **执行合并**：实时查看进度
6. **完成**：解决冲突、提交更改

### 测试页面 (test.html)

测试所有 UI 组件是否正常工作：

- 按钮、Toast、Modal
- Progress Bar、Alert
- WebSocket 连接

## 常见操作

### 过滤版本

在"选择版本"步骤：

- **按作者过滤**：输入作者名称
- **按日期过滤**：选择日期范围
- **按提交信息搜索**：输入关键词（支持实时搜索）

### 查看版本详情

点击版本卡片的"展开详情"查看：

- 完整提交信息
- 变更文件列表

### 取消操作

合并过程中可以随时点击"取消合并"按钮。

### 解决冲突

如果合并产生冲突：

- **自动解决**：选择"使用最新版本"策略
- **手动解决**：在命令行手动解决后继续

## 快捷键

- `Ctrl+Enter`：确认/继续
- `Esc`：取消/关闭

## 故障排除

### 无法连接到服务器

**症状**：页面显示"未连接"

**解决方法**：

1. 检查 daemon 是否运行：
   ```bash
   node dist/daemon-cli.js status
   ```

2. 如果未运行，启动它：
   ```bash
   node dist/daemon-cli.js start
   ```

3. 检查端口是否被占用：
   ```bash
   # macOS/Linux
   lsof -i :36695
   
   # Windows
   netstat -ano | findstr :36695
   ```

### WebSocket 连接失败

**症状**：实时进度不更新

**解决方法**：

1. 刷新页面重新连接
2. 检查浏览器控制台错误
3. 确认防火墙未阻止 WebSocket

### 版本加载缓慢

**症状**：点击"显示日志"后等待很久

**原因**：首次查询需要从 SVN 服务器获取数据

**解决方法**：

- 耐心等待（首次查询会缓存）
- 后续查询会很快（使用 SQLite 缓存）
- 使用过滤器减少显示数量

### 合并失败

**症状**：合并过程中出错

**解决方法**：

1. 查看错误信息
2. 检查工作副本状态：
   ```bash
   svn status
   ```
3. 确保工作副本干净（无未提交更改）
4. 检查 SVN 服务器连接

## 高级功能

### 批量选择版本

- **全选**：点击"全选"按钮
- **取消全选**：点击"取消全选"按钮
- **范围选择**：按住 Shift 点击

### 状态持久化

Web UI 会自动保存：

- 源分支路径
- 合并类型
- 过滤条件

刷新页面后会自动恢复。

### 查看历史记录

主页面可以查看：

- 最近的合并操作
- MergeInfo 记录
- 冲突历史

## API 使用

如果需要通过 API 集成：

```javascript
// 查询版本
const response = await fetch('http://localhost:36695/api/revisions/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    branchPath: '/branches/feature',
    limit: 50
  })
});

const { taskId } = await response.json();

// 监听结果
const ws = new WebSocket('ws://localhost:36695/ws');
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.taskId === taskId && message.type === 'complete') {
    console.log('Revisions:', message.result.revisions);
  }
};
```

详细 API 文档：[docs/API.md](../docs/API.md)

## 性能优化

### 缓存机制

- **Revision 信息**：全局 SQLite 缓存
- **首次查询**：可能需要几秒到几十秒
- **后续查询**：< 100ms

### 虚拟滚动

- 支持显示数千个版本
- 只渲染可见区域
- 流畅的滚动体验

### 懒加载

- 版本详情按需加载
- 点击展开时才获取文件列表

## 安全提示

⚠️ **重要**：

- Web UI 运行在本地（localhost）
- 不要暴露到公网
- 确保工作副本备份
- 重要操作前先预览

## 更多帮助

- [完整文档](README.md)
- [API 文档](../docs/API.md)
- [开发指南](../.claude/WEBUI_GUIDELINES.md)
- [问题反馈](https://github.com/your-repo/issues)

## 下一步

- 尝试合并一些测试版本
- 探索过滤和搜索功能
- 查看 API 文档了解更多功能
- 自定义样式和主题
