# 开发规范

## 代码质量要求

### 1. 测试覆盖

**规则：所有新增代码必须编写测试**

- 每个新功能必须有对应的测试用例
- 每个 bug 修复必须有回归测试
- 测试必须在提交前通过

**测试类型：**

#### Unit Tests (单元测试)
- 位置：`test/unit/`
- 运行：`npm run test:unit`
- 用途：测试独立的函数和类
- 框架：Vitest

#### Integration Tests (集成测试)
- 位置：`test/integration/`
- 运行：`npm run test:integration`
- 用途：测试模块间的交互
- 框架：Vitest

#### Node.js Native Tests (Node.js 原生模块测试)
- 位置：`test/integration/*.node.test.ts`
- 运行：`npm run test:node`
- 用途：测试使用 Node.js 内置模块的代码（如 node:sqlite）
- 框架：Node.js Test Runner + tsx
- 说明：Vitest 不支持 node: 协议的内置模块，需要使用 Node.js 原生测试运行器

#### E2E Tests (端到端测试)
- 位置：`test/e2e/`
- 运行：`npm run test:e2e`
- 用途：测试完整的用户流程
- 框架：Playwright

**示例：**

```typescript
// test/unit/example.test.ts
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../src/utils/example';

describe('myFunction', () => {
  it('should return expected result', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

```typescript
// test/integration/cache.node.test.ts (使用 Node.js 内置模块)
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GlobalCache } from '../../src/utils/cache';

describe('GlobalCache', () => {
  it('should cache entries', () => {
    const cache = GlobalCache.getInstance();
    // ... test code
    assert.ok(result);
  });
});
```

### 2. Node.js 版本要求

**规则：项目需要 Node.js >= 22.5.0**

- 原因：使用了 Node.js 内置的 `node:sqlite` 模块
- 在 `package.json` 中明确声明：
  ```json
  "engines": {
    "node": ">=22.5.0"
  }
  ```

### 3. 依赖管理

**规则：优先使用 Node.js 内置模块，避免原生依赖**

- ✅ 使用 `node:sqlite` 而不是 `better-sqlite3`
- ✅ 使用 `node:fs` 而不是第三方文件系统库
- ✅ 使用 `node:crypto` 而不是第三方加密库
- ❌ 避免需要 C++ 编译的原生模块（如 better-sqlite3）

**原因：**
- 跨平台兼容性更好
- 无需安装编译工具（Visual Studio、Python 等）
- 减少依赖体积
- 提高安装速度

### 4. TypeScript 类型

**规则：所有代码必须有完整的类型定义**

- 不使用 `any` 类型（除非必要时使用 `unknown`）
- 导出的函数和类必须有明确的类型签名
- 使用 `@types/node` 版本 >= 22.10.0 以支持 node:sqlite

### 5. 代码提交

**规则：提交前必须通过所有测试**

```bash
# 提交前运行
npm run build          # 编译检查
npm run test:unit      # 单元测试
npm run test:node      # Node.js 原生模块测试
npm run test:integration  # 集成测试（如果有）
```

**Commit Message 格式：**
```
<type>: <subject>

<body>

<footer>
```

类型：
- `feat`: 新功能
- `fix`: Bug 修复
- `refactor`: 重构
- `test`: 测试相关
- `docs`: 文档更新
- `chore`: 构建/工具相关

### 6. 文档要求

**规则：所有公开 API 必须有文档注释**

```typescript
/**
 * 缓存 SVN Revision 条目
 * @param entry - Revision 信息（不含 cached_at）
 */
public cacheRevisionEntry(entry: Omit<RevisionCacheEntry, 'cached_at'>): void {
  // implementation
}
```

### 7. 错误处理

**规则：所有可能失败的操作必须有错误处理**

```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  logger.error('Operation failed', error);
  throw new Error('Meaningful error message');
}
```

## 测试检查清单

在提交代码前，确保：

- [ ] 所有新代码都有测试覆盖
- [ ] 所有测试通过（`npm run test:unit` 和 `npm run test:node`）
- [ ] 代码编译成功（`npm run build`）
- [ ] 没有 TypeScript 错误
- [ ] 没有 ESLint 警告（如果配置了）
- [ ] 更新了相关文档
- [ ] Commit message 符合规范

## 特殊说明

### 使用 node:sqlite 的测试

由于 Vitest 使用 Vite 的模块系统，不支持 `node:` 协议的内置模块，因此：

1. 使用 `node:sqlite` 的代码测试必须放在 `test/integration/*.node.test.ts`
2. 使用 Node.js 原生测试运行器：`npm run test:node`
3. 测试文件使用 `node:test` 和 `node:assert` 而不是 Vitest

**示例：**
```typescript
// test/integration/cache.node.test.ts
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';

describe('Feature', () => {
  it('should work', () => {
    assert.strictEqual(1 + 1, 2);
  });
});
```

运行：
```bash
npm run test:node
# 或
node --test --import tsx test/integration/cache.node.test.ts
```

## 持续集成

CI 流程应包括：

```yaml
- npm install
- npm run build
- npm run test:unit
- npm run test:node
- npm run test:e2e
```

---

**最后更新：** 2026-04-15
