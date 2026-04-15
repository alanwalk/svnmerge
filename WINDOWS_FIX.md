# Windows SVN 命令执行修复

## 问题描述

在 Windows 环境下运行应用时出现错误：
```
SVN command failed: spawn C:\Windows\system32\cmd.exe ENOENT
```

## 根本原因

1. **目录不存在**：用户提供的工作目录路径不存在
2. **SVN 不在 PATH 中**：虽然 SVN 已安装（如 TortoiseSVN），但不在 Node.js 进程的 PATH 环境变量中

## 修复方案

### 1. SVN 命令执行 (src/utils/svn.ts)

**添加目录存在性检查：**
```typescript
// 检查目录是否存在
if (!fs.existsSync(cwd)) {
  throw new Error(`Directory does not exist: ${cwd}`);
}

// 检查是否是目录
const stats = fs.statSync(cwd);
if (!stats.isDirectory()) {
  throw new Error(`Path is not a directory: ${cwd}`);
}
```

**自动添加 SVN 路径到 PATH：**
```typescript
// 确保 PATH 包含常见的 SVN 安装路径
const commonSvnPaths = [
  'C:\\Program Files\\TortoiseSVN\\bin',
  'C:\\Program Files (x86)\\TortoiseSVN\\bin',
  'C:\\Program Files\\SlikSvn\\bin',
  'C:\\Program Files (x86)\\SlikSvn\\bin',
  'C:\\Program Files\\CollabNet\\Subversion Client',
  'C:\\Program Files (x86)\\CollabNet\\Subversion Client'
];

const existingSvnPaths = commonSvnPaths.filter(p => fs.existsSync(p));

execOptions.env = {
  ...process.env,
  PATH: existingSvnPaths.length > 0
    ? `${existingSvnPaths.join(';')};${process.env.PATH || ''}`
    : process.env.PATH || ''
};
```

### 2. Daemon 管理器 (src/daemon/manager.ts)

**修改前：**
```typescript
const child = spawn('node', [serverPath], {
  detached: true,
  stdio: ['ignore', logFd, logFd]
});
```

**修改后：**
```typescript
// 使用 process.execPath 获取 node 的完整路径
const child = spawn(process.execPath, [serverPath], {
  detached: true,
  stdio: ['ignore', logFd, logFd]
});
```

## 错误信息改进

修复后，用户会收到清晰的错误信息：

1. **目录不存在**：
   ```
   SVN command failed: Directory does not exist: D:\code-zero-goatgames-zian
   ```

2. **不是 SVN 工作副本**：
   ```
   SVN command failed: 'D:\code-zero' is not a working copy
   ```

3. **SVN 命令执行成功**：
   ```
   返回 SVN 仓库信息
   ```

## 验证修复

运行以下命令验证修复是否有效：

```bash
# 1. 重新编译
npm run build

# 2. 运行验证脚本
node verify-svn-fix.js
```

如果看到以下输出，说明修复成功：
```
✓ SUCCESS!
SVN Version: svn, version 1.14.5 (r1922182)
The fix is working correctly.
```

## 支持的 SVN 发行版

修复后的代码自动支持以下 SVN 发行版：
- TortoiseSVN (32位和64位)
- SlikSVN (32位和64位)
- CollabNet Subversion (32位和64位)

## 注意事项

1. 如果 SVN 安装在非标准位置，需要确保它在系统 PATH 环境变量中
2. 修改代码后需要运行 `npm run build` 重新编译
3. 修改后需要重启 daemon 服务：`./dist/daemon-cli.js restart`
4. 所有修复都是跨平台的，不会影响 Linux/macOS 的功能

## 测试结果

所有测试通过：
- ✓ 目录存在性检查
- ✓ SVN 命令执行
- ✓ Daemon 管理器加载
- ✓ 编译文件完整性
- ✓ process.execPath 使用
- ✓ PATH 增强功能
- ✓ 清晰的错误信息
