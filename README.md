# SVN Merge Tool - TypeScript 版本

一个功能强大、可自定义冲突处理规则的 SVN 合并工具。

## 特性

- ✅ 支持批量合并多个版本
- ✅ 自动检测和解决冲突
- ✅ 可自定义冲突处理规则（基于类型、路径、扩展名等）
- ✅ 支持 YAML 配置文件
- ✅ 灵活的命令行参数
- ✅ 详细的日志记录
- ✅ 预览模式（dry-run）
- ✅ 自动提交选项

## 安装

```bash
npm install
npm run build
```

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

# 默认策略
defaultStrategy: theirs-full

# 冲突解决规则
conflictRules:
  # 二进制文件规则
  - name: binary-files
    description: 二进制文件使用 theirs-full
    match:
      binary: true
    strategy: theirs-full
    priority: 100

  # Tree 冲突规则
  - name: tree-conflicts
    description: Tree 冲突使用 working
    match:
      types:
        - tree
    strategy: working
    priority: 90

  # 特定路径规则
  - name: config-files
    description: 配置文件保留本地版本
    match:
      paths:
        - "config/**/*"
        - "*.config.js"
    strategy: mine-full
    priority: 80

  # 特定扩展名规则
  - name: image-files
    description: 图片文件使用传入版本
    match:
      extensions:
        - .png
        - .jpg
        - .gif
    strategy: theirs-full
    priority: 70

  # 需要手动处理的文件
  - name: critical-files
    description: 关键文件需要手动处理
    match:
      paths:
        - "src/core/**/*"
    strategy: manual
    priority: 60
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

## 冲突解决策略

支持以下策略：

- `theirs-full` - 完全接受传入版本（from 分支）
- `mine-full` - 完全接受本地版本
- `working` - 使用工作副本当前状态
- `base` - 使用基础版本
- `theirs-conflict` - 仅冲突部分接受传入版本
- `mine-conflict` - 仅冲突部分接受本地版本
- `skip` - 跳过不处理
- `manual` - 标记为需要手动处理

## 规则匹配

规则按优先级（priority）从高到低匹配，第一个匹配的规则将被应用。

### 匹配条件

- `types` - 冲突类型：`text`, `property`, `tree`, `binary`
- `paths` - 路径模式（支持 glob）
- `extensions` - 文件扩展名
- `binary` - 是否为二进制文件

### 示例规则

```yaml
conflictRules:
  # 高优先级：关键文件手动处理
  - name: critical
    match:
      paths: ["src/core/**/*"]
    strategy: manual
    priority: 100

  # 中优先级：配置文件保留本地
  - name: configs
    match:
      extensions: [".config.js", ".env"]
    strategy: mine-full
    priority: 50

  # 低优先级：其他文本文件使用传入版本
  - name: text-files
    match:
      types: [text]
    strategy: theirs-full
    priority: 10
```

## 配置文件查找

工具会自动向上查找配置文件：

1. 当前目录的 `svnmerge.yaml`
2. 当前目录的 `svnmerge.yml`
3. 当前目录的 `.svnmerge.yaml`
4. 父目录中的同名文件（递归向上）

## 日志

如果指定了 `output` 目录，工具会生成带时间戳的日志文件：

```
logs/svnmerge-2026-04-14T10-30-00-000Z.log
```

## 典型工作流程

### 场景 1：从主干合并到分支

```bash
# 1. 创建配置
npx svnmerge init

# 2. 编辑 svnmerge.yaml
# from: ^/trunk
# revisions: ["1001", "1002", "1003"]
# defaultStrategy: theirs-full

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

# 使用工具解决冲突
npx svnmerge resolve

# 或使用自定义配置
npx svnmerge resolve -c my-rules.yaml
```

### 场景 3：批量合并多个版本

```bash
# 合并版本范围
npx svnmerge -f ^/trunk -r 1001-1050

# 合并不连续的版本
npx svnmerge -f ^/trunk -r 1001,1005,1010-1015,1020
```

## 高级用法

### 自定义复杂规则

```yaml
conflictRules:
  # 组合条件：二进制 + 特定路径
  - name: binary-assets
    match:
      binary: true
      paths: ["assets/**/*"]
    strategy: theirs-full
    priority: 100

  # 多个扩展名
  - name: documents
    match:
      extensions: [".pdf", ".doc", ".docx"]
    strategy: mine-full
    priority: 90

  # 特定类型 + 路径
  - name: tree-in-libs
    match:
      types: [tree]
      paths: ["lib/**/*"]
    strategy: working
    priority: 80
```

### 编程方式使用

```typescript
import { MergeManager, Config, Logger } from 'svn-merge-tool';

const config: Config = {
  workspace: '/path/to/repo',
  from: '^/branches/feature',
  revisions: ['1001', '1002'],
  defaultStrategy: 'theirs-full',
  conflictRules: [
    {
      name: 'binary',
      match: { binary: true },
      strategy: 'theirs-full',
      priority: 100
    }
  ]
};

const logger = new Logger({ verbose: true });
const manager = new MergeManager(config, logger);

await manager.execute();
```

## 与 v1.0.9 的对比

| 特性 | v1.0.9 (Go) | v2.0.0 (TypeScript) |
|------|-------------|---------------------|
| 命令行格式 | ✅ | ✅ |
| YAML 配置 | ✅ | ✅ |
| 批量合并 | ✅ | ✅ |
| 自动解决冲突 | ✅ | ✅ |
| 自定义规则 | ❌ | ✅ |
| 规则优先级 | ❌ | ✅ |
| Glob 路径匹配 | ❌ | ✅ |
| 多种策略 | 部分 | ✅ |
| 仅解决冲突模式 | ❌ | ✅ |

## 注意事项

⚠️ **重要提示**：

- 使用前请确保工作副本干净（无未提交更改）
- 建议先使用 `--dry-run` 预览
- 对于关键文件，建议使用 `manual` 策略手动处理
- 处理完成后务必检查结果

## 系统要求

- Node.js 16+
- SVN 命令行工具
- TypeScript 5.3+（开发）

## License

MIT
