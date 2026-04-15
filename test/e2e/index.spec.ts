import { test, expect } from '@playwright/test';
import { IndexPage } from './pages/index.page';
import { startDaemon, stopDaemon, checkApiHealth } from './helpers/test-utils';

test.describe('主页面测试', () => {
  let indexPage: IndexPage;

  test.beforeAll(async () => {
    // 确保 daemon 服务运行
    await startDaemon();

    // 等待服务就绪
    let retries = 10;
    while (retries > 0) {
      if (await checkApiHealth('http://localhost:36695')) {
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      retries--;
    }

    if (retries === 0) {
      throw new Error('Daemon service not ready');
    }
  });

  test.beforeEach(async ({ page }) => {
    indexPage = new IndexPage(page);
    await indexPage.goto();
  });

  test('页面加载成功', async ({ page }) => {
    // 验证页面标题
    await expect(page).toHaveTitle(/SVN Merge Tool/);

    // 验证主要元素存在
    await expect(page.locator('h1')).toContainText('SVN Merge Tool');
    await expect(indexPage.connectionStatus).toBeVisible();
    await expect(indexPage.repoInfo).toBeVisible();
  });

  test('显示连接状态', async () => {
    // 等待 WebSocket 连接
    await indexPage.waitForConnection(15000);

    // 验证连接状态
    const isConnected = await indexPage.isConnected();
    expect(isConnected).toBe(true);

    // 验证状态文本
    await expect(indexPage.connectionStatus).toContainText(/已连接|连接/);
  });

  test('显示仓库信息', async ({ page }) => {
    // 等待仓库信息加载
    await page.waitForTimeout(2000);

    const repoText = await indexPage.getRepoInfoText();

    // 验证不是空状态
    expect(repoText).not.toContain('正在加载');
  });

  test('"开始合并"按钮可点击', async () => {
    // 验证按钮可见且可点击
    await expect(indexPage.startMergeBtn).toBeVisible();
    await expect(indexPage.startMergeBtn).toBeEnabled();

    // 验证按钮文本
    await expect(indexPage.startMergeBtn).toContainText('启动合并向导');
  });

  test('跳转到合并向导页面', async ({ page }) => {
    // 点击开始合并按钮
    await indexPage.clickStartMerge();

    // 验证 URL 变化
    expect(page.url()).toContain('merge-wizard.html');

    // 验证向导页面加载
    await expect(page.locator('.wizard-container')).toBeVisible();
    await expect(page.locator('.wizard-steps')).toBeVisible();
  });

  test('刷新仓库信息', async ({ page }) => {
    // 点击刷新按钮
    await indexPage.refreshRepo();

    // 等待刷新完成
    await page.waitForTimeout(1000);

    // 验证仓库信息仍然显示
    await expect(indexPage.repoInfo).toBeVisible();
  });

  test('快速操作按钮可见', async () => {
    // 验证快速操作按钮
    await expect(indexPage.checkConflictsBtn).toBeVisible();
    await expect(indexPage.viewMergeInfoBtn).toBeVisible();

    // 验证按钮文本
    await expect(indexPage.checkConflictsBtn).toContainText('检查冲突');
    await expect(indexPage.viewMergeInfoBtn).toContainText('查看 MergeInfo');
  });
});
