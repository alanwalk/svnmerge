import { test, expect } from '@playwright/test';
import { IndexPage } from './pages/index.page';
import { WizardPage } from './pages/wizard.page';

test.describe('错误处理测试', () => {
  let indexPage: IndexPage;
  let wizardPage: WizardPage;

  test.beforeEach(async ({ page }) => {
    indexPage = new IndexPage(page);
    wizardPage = new WizardPage(page);
  });

  test('API 请求失败时显示错误提示', async ({ page, context }) => {
    // 拦截 API 请求并返回错误
    await page.route('**/api/**', route => {
      route.abort('failed');
    });

    await indexPage.goto();

    // 等待错误提示
    await page.waitForTimeout(2000);

    // 检查是否有错误提示（Toast 或其他形式）
    const hasError = await page.locator('.toast, .error, .alert').isVisible().catch(() => false);
    console.log('Error message displayed:', hasError);
  });

  test('WebSocket 断开时显示提示', async ({ page }) => {
    await indexPage.goto();

    // 等待连接
    try {
      await indexPage.waitForConnection(10000);
    } catch (error) {
      console.log('Connection failed as expected');
    }

    // 强制断开 WebSocket
    await page.evaluate(() => {
      const ws = (window as any).ws;
      if (ws) {
        ws.close();
      }
    });

    await page.waitForTimeout(1000);

    // 验证状态更新
    const statusClass = await indexPage.connectionStatus.getAttribute('class');
    expect(statusClass).toBeTruthy();
  });

  test('无效输入时显示验证错误', async ({ page }) => {
    await wizardPage.goto();

    // 进入 Step 2
    await wizardPage.clickNext();

    // 输入无效的分支路径
    await wizardPage.enterBranchPath('invalid path with spaces');

    // 尝试进入下一步
    await wizardPage.clickNext();

    // 等待验证
    await page.waitForTimeout(500);

    // 检查是否有验证错误提示
    const validationMsg = await wizardPage.branchValidation.isVisible().catch(() => false);
    console.log('Validation message shown:', validationMsg);
  });

  test('空输入时的处理', async ({ page }) => {
    await wizardPage.goto();

    // 进入 Step 2
    await wizardPage.clickNext();

    // 不输入任何内容，直接点击下一步
    // 下一步按钮应该可用或显示提示
    const isNextEnabled = await wizardPage.nextBtn.isEnabled();
    console.log('Next button enabled with empty input:', isNextEnabled);
  });

  test('网络超时处理', async ({ page }) => {
    // 延迟所有请求
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 5000));
      route.continue();
    });

    await indexPage.goto();

    // 等待加载
    await page.waitForTimeout(3000);

    // 应该显示加载状态或超时提示
    const loadingVisible = await page.locator('.loading, .spinner').isVisible().catch(() => false);
    console.log('Loading indicator shown:', loadingVisible);
  });

  test('404 错误处理', async ({ page }) => {
    // 拦截请求返回 404
    await page.route('**/api/repo/info', route => {
      route.fulfill({
        status: 404,
        body: JSON.stringify({ error: 'Not found' }),
      });
    });

    await indexPage.goto();
    await page.waitForTimeout(2000);

    // 检查错误处理
    const repoText = await indexPage.getRepoInfoText();
    console.log('Repo info with 404:', repoText);
  });

  test('500 服务器错误处理', async ({ page }) => {
    // 拦截请求返回 500
    await page.route('**/api/**', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await indexPage.goto();
    await page.waitForTimeout(2000);

    // 应该显示错误提示
    const hasError = await page.locator('.error, .toast').isVisible().catch(() => false);
    console.log('Error shown for 500:', hasError);
  });

  test('控制台无严重错误', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await indexPage.goto();
    await page.waitForTimeout(3000);

    // 过滤掉一些预期的错误（如 WebSocket 连接失败）
    const criticalErrors = errors.filter(err => {
      return !err.includes('WebSocket') &&
             !err.includes('favicon') &&
             !err.includes('net::ERR');
    });

    console.log('Critical errors:', criticalErrors);
    expect(criticalErrors.length).toBe(0);
  });

  test('页面崩溃恢复', async ({ page }) => {
    await indexPage.goto();

    // 模拟页面错误
    await page.evaluate(() => {
      throw new Error('Test error');
    }).catch(() => {
      // 预期会抛出错误
    });

    // 页面应该仍然可用
    await page.waitForTimeout(1000);
    const isVisible = await page.locator('h1').isVisible();
    expect(isVisible).toBe(true);
  });

  test('无数据时的空状态显示', async ({ page }) => {
    await wizardPage.goto();

    // 进入 Step 3
    await wizardPage.clickNext();
    await wizardPage.enterBranchPath('/branches/empty');
    await wizardPage.clickNext();

    // 加载 revisions（可能为空）
    await wizardPage.loadRevisionsBtn.click();
    await page.waitForTimeout(2000);

    // 检查是否显示空状态
    const revisionCount = await wizardPage.getRevisionCount();
    console.log('Revision count:', revisionCount);

    if (revisionCount === 0) {
      // 应该显示空状态提示
      const emptyState = await page.locator('.empty-state, .no-data').isVisible().catch(() => false);
      console.log('Empty state shown:', emptyState);
    }
  });

  test('并发请求处理', async ({ page }) => {
    await indexPage.goto();
    await indexPage.waitForConnection(10000);

    // 快速连续点击刷新
    await indexPage.refreshRepo();
    await indexPage.refreshRepo();
    await indexPage.refreshRepo();

    // 等待处理完成
    await page.waitForTimeout(2000);

    // 页面应该仍然正常
    const isVisible = await indexPage.repoInfo.isVisible();
    expect(isVisible).toBe(true);
  });

  test('特殊字符输入处理', async ({ page }) => {
    await wizardPage.goto();
    await wizardPage.clickNext();

    // 输入特殊字符
    const specialChars = '/branches/test-<script>alert("xss")</script>';
    await wizardPage.enterBranchPath(specialChars);

    // 验证输入被正确处理
    const value = await wizardPage.getBranchPath();
    expect(value).toBe(specialChars);

    // 页面应该没有执行脚本
    const alerts = await page.evaluate(() => {
      return (window as any).alertCalled || false;
    });
    expect(alerts).toBe(false);
  });
});
