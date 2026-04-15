# SVN Merge Tool - TypeScript 版本

一个智能的 SVN 合并工具，自动选择最新版本解决冲突。

## 特性

### CLI 工具
- ✅ 支持批量合并多个版本
- ✅ 智能冲突解决：基于 mergeinfo 自动选择最新版本
- ✅ 支持 YAML 配置文件
- ✅ 灵活的命令行参数
- ✅ 详细的日志记录
- ✅ 预览模式（dry-run）
- ✅ 自动提交选项

### Web UI & API (NEW!)
- ✅ 现代化 Web UI 界面（复刻 TortoiseSVN）
- ✅ RESTful API 接口
- ✅ WebSocket 实时通信
- ✅ 异步任务管理
- ✅ 全局 SQLite 缓存
- ✅ 进度实时推送
- ✅ 任务取消支持
- ✅ 响应式设计，支持移动端

## 核心功能：Newest 策略

工具使用智能的 `newest` 策略解决所有冲突：

1. **分析 mergeinfo**：向上递归收集所有父目录的 `svn:mergeinfo` 属性
2. **查询版本历史**：一次性获取文件在所有已合并分支中的修改记录
3. **选择最新版本**：自动选择版本号最大的那个版本
4. **应用版本**：将选定的版本应用到冲突文件

详细说明请参见 [NEWEST_STRATEGY.md](./docs/NEWEST_STRATEGY.md)

## 安装

```bash
npm install
npm run build
```

## 使用方式

### 方式 1: CLI 工具（命令行）

传统的命令行工具，适合脚本和自动化场景。

### 方式 2: Daemon + Web UI（推荐）

后台服务 + Web 界面，提供更好的用户体验和实时反馈。

```bash
# 启动 daemon 服务
npm run build
npx svnmerge-daemon start

# 服务器地址
# HTTP API: http://localhost:36695
# WebSocket: ws://localhost:36695/ws
# Web UI: http://localhost:36695/index.html

# 停止服务
npx svnmerge-daemon stop

# 查看状态
npx svnmerge-daemon status
```

**Web UI**: 在浏览器中打开 `http://localhost:36695/index.html` 使用图形界面

**功能特性**:
- 📋 直观的合并向导（6 步流程）
- 🔍 版本选择和过滤（按作者、日期、提交信息）
- 📊 实时合并进度显示
- ⚠️ 自动冲突检测和解决
- 💾 状态持久化
- 📱 响应式设计

**API 文档**: 查看 [docs/API.md](./docs/API.md) 了解完整的 API 接口

**WebSocket Demo**: 打开 `docs/websocket-demo.html` 查看实时演示

## 快速开始

### 1. 创建配置文件

```bash
npx svnmerge init
```

这将创建一个 `svnmerge.yaml` 配置文件。

### 2. 编辑配置文件

```yaml
# svnmerge.yaml
workspace: .
from: ^/branches/feature-branch
revisions:
  - "1001"
  - "1002"
  - "1003"
output: ./logs
verbose: true
dryRun: false
autoCommit: false
```

### 3. 执行合并

```bash
# 使用配置文件
npx svnmerge

# 使用命令行参数
npx svnmerge -f ^/branches/feature -r 1001,1002-1005 -w /path/to/repo

# 预览模式
npx svnmerge --dry-run

# 自动提交
npx svnmerge --commit
```

## 命令行参数

```
选项:
  -c, --config <path>      配置文件路径
  -w, --workspace <path>   SVN 工作目录
  -f, --from <url>         源分支 URL
  -r, --revisions <list>   版本号列表 (例如: 1001,1002-1005)
  -o, --output <path>      日志文件目录
  -i, --ignore <paths>     忽略的路径 (逗号分隔)
  -V, --verbose            显示详细信息
  -d, --dry-run            预览模式，不执行实际操作
  -C, --commit             成功后自动提交
  -h, --help               显示帮助信息
```

## 命令

### `svnmerge` (默认)

执行完整的合并流程：预检查 → 合并 → 解决冲突 → 提交（可选）

```bash
npx svnmerge -f ^/branches/feature -r 1001-1005
```

### `svnmerge init`

创建默认配置文件

```bash
npx svnmerge init
npx svnmerge init -o custom-config.yaml
```

### `svnmerge resolve`

仅解决现有冲突，不执行合并

```bash
npx svnmerge resolve
npx svnmerge resolve -w /path/to/repo
```

## 典型工作流程

### 场景 1：从主干合并到分支

```bash
# 1. 创建配置
npx svnmerge init

# 2. 编辑 svnmerge.yaml
# from: ^/trunk
# revisions: ["1001", "1002", "1003"]

# 3. 预览
npx svnmerge --dry-run

# 4. 执行
npx svnmerge

# 5. 检查结果
svn status
svn diff

# 6. 提交
svn commit -m "Merge r1001-r1003 from trunk"
```

### 场景 2：仅解决现有冲突

```bash
# 已经手动执行了 svn merge，现在有冲突
svn merge ^/branches/feature

# 使用工具解决冲突（自动选择最新版本）
npx svnmerge resolve

# 检查结果
svn status
```

### 场景 3：批量合并多个版本

```bash
# 合并版本范围
npx svnmerge -f ^/trunk -r 1001-1050

# 合并不连续的版本
npx svnmerge -f ^/trunk -r 1001,1005,1010-1015,1020
```

## 工作原理

### Newest 策略的执行流程

1. **扫描冲突**：检测所有冲突文件
2. **收集 mergeinfo**：
   - 从冲突文件所在目录开始
   - 向上递归到仓库根目录
   - 收集所有 `svn:mergeinfo` 属性
   - 使用缓存避免重复查询
3. **查询版本历史**：
   - 对每个已合并的分支，一次性查询文件的完整历史
   - 过滤出在 mergeinfo 范围内的版本
4. **选择最新版本**：
   - 按版本号降序排序
   - 选择版本号最大的那个
5. **应用版本**：
   - 如果该版本在冲突文件中存在（.rXXX），使用对应策略
   - 否则从仓库获取该版本的内容并应用

## 配置文件示例

### 基本配置

```yaml
workspace: .
from: ^/branches/feature-branch
revisions:
  - "1001-1005"
output: ./logs
verbose: true
```

### 完整配置

```yaml
workspace: /path/to/working/copy
from: ^/branches/feature-branch
revisions:
  - "1001"
  - "1002"
  - "1003-1010"
output: ./logs
ignore:
  - "*.log"
  - "temp/**/*"
verbose: true
dryRun: false
autoCommit: false
```

## 注意事项

⚠️ **重要提示**：

- 使用前请确保工作副本干净（无未提交更改）
- 建议先使用 `--dry-run` 预览
- 工具会自动选择最新版本，但建议在 verbose 模式下检查选择的版本是否符合预期
- 处理完成后务必检查结果并运行测试

## API 快速开始

### 1. 启动 Daemon

```bash
npm run build
npx svnmerge-daemon start
```

### 2. 测试 API

```bash
node test-api.js
```

### 3. 使用 API

```javascript
// 查询 revisions
const response = await fetch('http://localhost:36695/api/revisions/query', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    branchPath: '/branches/feature',
    limit: 50
  })
});
const { taskId } = await response.json();

// 通过 WebSocket 监听结果
const ws = new WebSocket('ws://localhost:36695/ws');
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.taskId === taskId && message.type === 'complete') {
    console.log('Revisions:', message.result.revisions);
  }
};
```

完整示例请查看 [docs/API.md](./docs/API.md)

## 架构设计

### CLI 模式
```
用户 → CLI → SVN 命令 → 输出结果
```

### Daemon 模式
```
Web UI → HTTP API → Task Manager → SVN 命令
                         ↓
                   WebSocket ← 实时推送进度
```

### 核心组件

- **Task Manager**: 管理所有异步任务的生命周期
- **WebSocket Manager**: 管理 WebSocket 连接和消息推送
- **Global Cache**: 全局 SQLite 缓存，加速 revision 查询
- **API Routes**: RESTful API 接口

## 系统要求

- Node.js 16+
- SVN 命令行工具
- TypeScript 5.3+（开发）

## 相关文档

- [Web UI 使用指南](./public/README.md) - Web 界面使用说明
- [API 文档](./docs/API.md) - 完整的 API 接口说明
- [Newest 策略](./docs/NEWEST_STRATEGY.md) - 智能冲突解决原理
- [Web UI 开发纲领](./.claude/WEBUI_GUIDELINES.md) - Web UI 开发指南

## License

MIT
