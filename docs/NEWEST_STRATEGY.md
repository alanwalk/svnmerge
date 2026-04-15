# Newest 策略使用指南

## 概述

SVN Merge Tool 使用智能的 `newest` 策略自动解决所有冲突。该策略通过分析 `svn:mergeinfo` 属性，找到所有已合并分支中对该文件的修改记录，并自动选择版本号最大（最新）的那个版本。

## 工作原理

当遇到冲突时，`newest` 策略会：

1. **向上递归收集 mergeinfo**：
   - 从冲突文件所在目录开始
   - 向上递归到仓库根目录
   - 收集所有父目录的 `svn:mergeinfo` 属性
   - 使用缓存机制避免重复查询

2. **查询文件修改历史**：
   - 对每个已合并的分支，一次性查询该文件的完整历史
   - 使用 `svn log --xml` 获取详细的版本信息（版本号、作者、日期、提交信息）
   - 过滤出在 mergeinfo 范围内的版本

3. **选择最新版本**：
   - 按版本号降序排序所有候选版本
   - 选择版本号最大的那个

4. **应用选择的版本**：
   - 如果该版本对应冲突文件中的某个版本（如 `.r1010`），使用对应的策略
   - 否则，从仓库中获取该版本的文件内容并应用
   - 标记冲突为已解决

## 使用场景

### 场景 1：多分支合并导致的冲突

假设有以下情况：

```
trunk (主干)
  └─ file.txt (r1000)

branch-a (分支A)
  └─ file.txt (r1005) - 修改了文件

branch-b (分支B)
  └─ file.txt (r1010) - 也修改了文件

操作流程：
1. 将 branch-a 合并到 trunk (r1005 被合并)
   - trunk 的 mergeinfo: /branches/branch-a:1005
2. 现在要将 branch-b 合并到 trunk
   - file.txt 产生冲突
```

使用 `newest` 策略：
- 工具会读取 mergeinfo，发现 branch-a 的 r1005 已合并
- 检测到当前要合并的是 branch-b 的 r1010
- 比较 r1005 和 r1010，选择 r1010（最新）
- 自动应用 r1010 的内容

## 使用场景

### 场景 1：多分支合并导致的冲突

假设有以下情况：

```
trunk (主干)
  └─ file.txt (r1000)

branch-a (分支A)
  └─ file.txt (r1005) - 修改了文件

branch-b (分支B)
  └─ file.txt (r1010) - 也修改了文件

操作流程：
1. 将 branch-a 合并到 trunk (r1005 被合并)
   - trunk 的 mergeinfo: /branches/branch-a:1005
2. 现在要将 branch-b 合并到 trunk
   - file.txt 产生冲突
```

使用 `newest` 策略：
- 工具会读取 mergeinfo，发现 branch-a 的 r1005 已合并
- 检测到当前要合并的是 branch-b 的 r1010
- 比较 r1005 和 r1010，选择 r1010（最新）
- 自动应用 r1010 的内容

### 场景 2：复杂的合并历史

```
trunk
  └─ mergeinfo: /branches/feature-1:1001-1005
                /branches/feature-2:1008,1012
                /branches/bugfix:1015-1020

现在合并 /branches/feature-3，其中 file.txt 在 r1025 被修改
```

使用 `newest` 策略：
- 工具会查询 file.txt 在所有已合并版本中的修改记录
- 假设找到：r1003 (feature-1), r1012 (feature-2), r1018 (bugfix), r1025 (feature-3)
- 选择 r1025（最新）

### 场景 3：嵌套目录的 mergeinfo

```
/trunk (mergeinfo: /branches/feature-a:1001-1005)
  /src (mergeinfo: /branches/feature-b:1010-1015)
    /utils
      /helper.ts (冲突文件)
```

使用 `newest` 策略：
- 从 `/trunk/src/utils` 开始向上递归
- 收集到 `/trunk/src` 的 mergeinfo: feature-b:1010-1015
- 收集到 `/trunk` 的 mergeinfo: feature-a:1001-1005
- 查询 helper.ts 在这两个分支的所有相关版本
- 选择版本号最大的那个

## 示例输出

当使用 `newest` 策略时，工具会显示详细的版本分析信息：

```
扫描冲突
发现 3 个冲突

[1/3] src/utils/helper.ts
  类型: text
  正在分析 mergeinfo 和版本历史...
  找到 5 个相关版本
    - r1025 (/branches/feature-3) by alice
    - r1018 (/branches/bugfix) by bob
    - r1012 (/branches/feature-2) by charlie
    - r1003 (/branches/feature-1) by dave
    - r1000 (^/trunk) by eve
  选择最新版本: r1025 (/branches/feature-3)
  ✓ 已解决

[2/3] src/config/settings.json
  类型: text
  正在分析 mergeinfo 和版本历史...
  找到 2 个相关版本
    - r1020 (/branches/feature-3) by alice
    - r1015 (/branches/bugfix) by bob
  选择最新版本: r1020 (/branches/feature-3)
  ✓ 已解决

处理完成
✓ 成功: 2
✗ 失败: 0
```

## 配置示例

### 基本使用

```yaml
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

### 命令行使用

```bash
# 使用配置文件
npx svnmerge

# 使用命令行参数
npx svnmerge -f ^/branches/feature -r 1001,1002-1005

# 预览模式（查看会选择哪些版本）
npx svnmerge --dry-run

# 详细模式（显示所有候选版本）
npx svnmerge --verbose
```

## 技术细节

### Mergeinfo 格式

SVN 的 `svn:mergeinfo` 属性格式如下：

```
/branches/feature-a:1001-1005,1010,1015-1020
/branches/feature-b:2001,2005-2010
/trunk:500-1000
```

每一行表示一个分支路径和已合并的版本范围。

### 向上递归收集

工具会从冲突文件所在目录开始，向上递归收集 mergeinfo：

```
/trunk/src/utils/helper.ts (冲突文件)
  ↓ 向上查找
/trunk/src/utils (检查 mergeinfo)
  ↓
/trunk/src (检查 mergeinfo)
  ↓
/trunk (检查 mergeinfo)
  ↓
到达仓库根目录，停止
```

### 缓存机制

为了提高性能，工具使用缓存机制：

```typescript
const mergeInfoCache = new Map<string, MergeInfoEntry[]>();

// 第一次查询 /trunk/src
collectMergeInfoWithCache('src/utils/file1.ts', cwd, cache);
// 查询并缓存 /trunk/src 的 mergeinfo

// 第二次查询同一目录
collectMergeInfoWithCache('src/utils/file2.ts', cwd, cache);
// 直接从缓存读取，不再执行 svn propget
```

### 版本查询过程

1. **解析 mergeinfo**：
   ```bash
   svn propget svn:mergeinfo .
   ```

2. **查询文件历史**（一次性获取所有历史）：
   ```bash
   svn log --xml /branches/feature-a/path/to/file.txt
   ```

3. **过滤相关版本**：
   - 在内存中过滤出在 mergeinfo 范围内的版本
   - 避免逐个版本查询（性能优化）

4. **应用选定版本**：
   ```bash
   # 如果版本在冲突文件中
   svn resolve --accept theirs-full file.txt
   
   # 或者从仓库获取
   svn cat -r1025 file.txt > file.txt
   svn resolve --accept working file.txt
   ```

## 性能优化

### 1. Mergeinfo 缓存

- 同一目录的多个文件共享缓存
- 避免重复的 `svn propget` 调用
- 对于有大量冲突文件的场景，性能提升显著

### 2. 批量查询文件历史

**不推荐的方式**（慢）：
```bash
for r in 1001 1002 1003 ... 1100; do
  svn log -r$r path/to/file
done
```

**推荐的方式**（快）：
```bash
# 一次性获取所有历史
svn log --xml path/to/file

# 在内存中过滤相关版本
```

### 3. 向上递归的边界

- 到达仓库根目录时停止（URL == Repository Root）
- 使用 `svn info` 判断是否到达根目录
- 避免无限递归

## 注意事项

### 1. Mergeinfo 必须存在

如果目录没有 `svn:mergeinfo` 属性：
- 工具会向上递归查找父目录的 mergeinfo
- 建议在合并后正确提交，以保持 mergeinfo 的准确性

### 2. 文件路径必须一致

- 工具会在各个分支中查找相同路径的文件
- 如果文件在不同分支中路径不同，可能无法找到所有版本
- 建议保持文件路径的一致性

### 3. 性能考虑

- 对于有大量合并历史的仓库，查询可能较慢
- 缓存机制可以缓解这个问题
- 建议使用 `verbose: true` 查看详细进度

### 4. 版本号的含义

- 版本号越大表示提交时间越晚
- 但不同分支的版本号可能交错
- 工具会结合版本号和提交日期来判断

## 故障排除

### 问题 1：选择的版本不是预期的

**症状**：工具选择了一个不是你期望的版本

**可能原因**：
- 版本号最大的不一定是你认为"最新"的
- 可能有其他分支的更新版本你不知道

**解决方案**：
1. 使用 `verbose: true` 查看所有候选版本：
   ```yaml
   verbose: true
   ```
2. 检查输出中的版本列表，确认是否有遗漏
3. 如果需要特定版本，可以手动处理该文件

### 问题 2：性能较慢

**症状**：处理冲突时等待时间较长

**可能原因**：
- 仓库有大量的合并历史
- 需要查询多个分支的文件历史

**解决方案**：
1. 使用 verbose 模式查看进度：
   ```bash
   npx svnmerge --verbose
   ```
2. 缓存机制会在处理多个文件时提高性能
3. 第一个文件可能较慢，后续文件会更快

### 问题 3：文件内容应用失败

**症状**：
```
✗ 处理失败: Failed to apply revision 1025: ...
```

**可能原因**：
- 该版本的文件在仓库中不存在
- 文件路径在该版本中不同
- 网络或权限问题

**解决方案**：
1. 手动检查该版本的文件：
   ```bash
   svn cat -r1025 path/to/file.txt
   ```
2. 检查 SVN 仓库的访问权限
3. 如果问题持续，可能需要手动处理该冲突

## 最佳实践

### 1. 先预览再执行

```bash
npx svnmerge --dry-run
```

这样可以看到工具会如何处理每个冲突，而不实际修改文件。

### 2. 使用 verbose 模式

```yaml
verbose: true
```

可以看到每个文件的详细版本分析过程，帮助理解工具的决策。

### 3. 定期检查 mergeinfo

```bash
svn propget svn:mergeinfo .
```

确保 mergeinfo 准确反映了合并历史。

### 4. 合并后验证

```bash
# 查看修改
svn diff

# 运行测试
npm test

# 检查构建
npm run build
```

自动解决冲突后，务必验证结果的正确性。

### 5. 保持文件路径一致

在不同分支中保持文件路径的一致性，避免重命名或移动文件。

## 实际案例

### 案例 1：多个功能分支的合并

**背景**：
- 主干 trunk
- 三个功能分支：feature-a, feature-b, feature-c
- 都修改了同一个文件 `src/api/handler.js`

**操作**：
```bash
# 1. 合并 feature-a
svn merge ^/branches/feature-a
svn commit -m "Merge feature-a"

# 2. 合并 feature-b
svn merge ^/branches/feature-b
# 产生冲突

# 3. 使用工具解决
npx svnmerge resolve --verbose
```

**结果**：
- 工具读取 mergeinfo，发现 feature-a 的 r1005 已合并
- 检测到 feature-b 的 r1010 是当前合并
- 自动选择 r1010（最新）

### 案例 2：长期分支的定期同步

**背景**：
- 长期维护分支 release-2.0
- 定期从 trunk 同步更新
- trunk 已经合并了多个功能分支

**配置**：
```yaml
workspace: /path/to/release-2.0
from: ^/trunk
revisions:
  - "1001-1050"
verbose: true
```

**效果**：
- 自动选择所有文件的最新版本
- 减少手动处理冲突的工作量
- 保持分支与主干的同步

## 总结

`newest` 策略通过分析 `svn:mergeinfo` 和版本历史，能够智能地选择最新的文件版本来解决冲突。它特别适合：

- 多分支开发环境
- 频繁的合并操作
- 希望自动化冲突解决的场景

关键特性：
- **向上递归收集 mergeinfo**：确保获取完整的合并历史
- **缓存机制**：提高性能，避免重复查询
- **批量查询**：一次性获取文件历史，而不是逐个版本检查
- **智能版本选择**：自动选择版本号最大的版本

使用建议：
- 使用前先预览（`--dry-run`）
- 使用 verbose 模式查看详细信息
- 使用后验证结果并运行测试
