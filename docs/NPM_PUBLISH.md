# NPM 发布指南

## 前置准备

### 1. 注册 NPM 账号
1. 访问 https://www.npmjs.com/signup
2. 注册一个 NPM 账号
3. 验证邮箱

### 2. 创建 NPM Access Token
1. 登录 NPM: https://www.npmjs.com
2. 点击头像 → Access Tokens
3. 点击 "Generate New Token"
4. 选择 "Automation" 类型（用于 CI/CD）
5. 复制生成的 token（只显示一次，请妥善保存）

### 3. 配置 GitHub Secrets
1. 打开 GitHub 仓库: https://github.com/alanwalk/svnmerge
2. 进入 Settings → Secrets and variables → Actions
3. 点击 "New repository secret"
4. 名称: `NPM_TOKEN`
5. 值: 粘贴刚才复制的 NPM token
6. 点击 "Add secret"

### 4. 验证包名可用性
由于使用了 scoped package `@alanwalk/svnmerge`，需要确保：
- 你的 NPM 用户名是 `alanwalk`
- 或者你有权限发布到 `@alanwalk` scope

如果用户名不是 `alanwalk`，需要修改 `package.json` 中的包名：
```json
"name": "@your-npm-username/svnmerge"
```

## 发布流程

### 自动发布（推荐）

1. **更新版本号**
   ```bash
   # 补丁版本 (0.0.1 -> 0.0.2)
   npm version patch
   
   # 次版本 (0.0.1 -> 0.1.0)
   npm version minor
   
   # 主版本 (0.0.1 -> 1.0.0)
   npm version major
   ```

2. **推送 tag 到 GitHub**
   ```bash
   git push origin main --tags
   ```

3. **自动触发发布**
   - GitHub Action 会自动运行
   - 执行测试
   - 构建项目
   - 发布到 NPM

4. **查看发布状态**
   - 访问 https://github.com/alanwalk/svnmerge/actions
   - 查看 "Publish to NPM" 工作流状态

### 手动发布（备用）

如果需要手动发布：

1. **登录 NPM**
   ```bash
   npm login
   ```

2. **构建和测试**
   ```bash
   npm run build
   npm run test:unit
   npm run test:node
   ```

3. **发布**
   ```bash
   npm publish --access public
   ```

## 版本管理

遵循 [语义化版本](https://semver.org/lang/zh-CN/)：

- **主版本号 (MAJOR)**: 不兼容的 API 修改
- **次版本号 (MINOR)**: 向下兼容的功能性新增
- **修订号 (PATCH)**: 向下兼容的问题修正

### 版本号示例

- `0.0.1` - 初始版本
- `0.0.2` - Bug 修复
- `0.1.0` - 新增功能
- `1.0.0` - 正式发布

## 发布检查清单

发布前确保：

- [ ] 所有测试通过
- [ ] 代码已提交到 main 分支
- [ ] README.md 已更新
- [ ] CHANGELOG.md 已更新（如果有）
- [ ] 版本号已更新
- [ ] NPM_TOKEN 已配置到 GitHub Secrets

## 发布后验证

1. **检查 NPM 包页面**
   ```
   https://www.npmjs.com/package/@alanwalk/svnmerge
   ```

2. **测试安装**
   ```bash
   # 在其他目录测试
   npx @alanwalk/svnmerge@latest --version
   ```

3. **验证命令**
   ```bash
   npx @alanwalk/svnmerge --help
   npx svnmerge-daemon --help
   ```

## 常见问题

### 1. 发布失败：403 Forbidden
- 检查 NPM_TOKEN 是否正确配置
- 确认 token 类型为 "Automation"
- 验证包名是否与你的 NPM 用户名匹配

### 2. 发布失败：包名已存在
- 修改 package.json 中的包名
- 或使用 scoped package: `@your-username/svnmerge`

### 3. 测试失败
- 本地运行测试确保通过
- 检查 Node.js 版本是否 >= 22.5.0

### 4. 构建失败
- 检查 TypeScript 编译错误
- 确保所有依赖已安装

## 撤销发布

如果需要撤销已发布的版本（24小时内）：

```bash
npm unpublish @alanwalk/svnmerge@0.0.1
```

**注意**: 撤销发布会影响已经使用该版本的用户，请谨慎操作。

## 更新发布

发布新版本：

```bash
# 1. 修改代码
# 2. 提交更改
git add .
git commit -m "feat: add new feature"

# 3. 更新版本
npm version patch  # 或 minor/major

# 4. 推送
git push origin main --tags
```

GitHub Action 会自动发布新版本。

---

**首次发布时间**: 2026-04-15
**当前版本**: 0.0.1
