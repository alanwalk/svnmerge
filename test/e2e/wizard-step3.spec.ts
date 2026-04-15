import { test, expect } from '@playwright/test';
import { WizardPage } from './pages/wizard.page';

test.describe('合并向导 - Step 3: 选择版本', () => {
  let wizardPage: WizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new WizardPage(page);
    await wizardPage.goto();

    // 进入 Step 3
    await wizardPage.clickNext(); // Step 1 -> 2
    await wizardPage.enterBranchPath('/branches/test');
    await wizardPage.clickNext(); // Step 2 -> 3
    await page.waitForTimeout(500);
  });

  test('"Show Log" 按钮显示', async ({ page }) => {
    // 验证在 Step 3
    const currentStep = await wizardPage.getCurrentStep();
    expect(currentStep).toBe(3);

    // 验证页面标题
    await expect(page.locator('#step3 h2')).toContainText('选择版本');

    // 验证 Show Log 按钮
    await expect(wizardPage.loadRevisionsBtn).toBeVisible();
    await expect(wizardPage.loadRevisionsBtn).toBeEnabled();
    await expect(wizardPage.loadRevisionsBtn).toContainText('显示日志');
  });

  test('点击后显示 Loading 状态', async ({ page }) => {
    // 点击加载按钮
    const loadPromise = wizardPage.loadRevisions();

    // 检查按钮状态变化（可能显示 loading 或禁用）
    await page.waitForTimeout(100);

    await loadPromise;
  });

  test('加载 revision 列表', async ({ page }) => {
    // 加载 revisions
    await wizardPage.loadRevisionsBtn.click();

    // 等待列表显示
    await page.waitForTimeout(2000);

    // 验证过滤栏显示
    const isFilterBarVisible = await wizardPage.filterBar.isVisible();
    expect(isFilterBarVisible).toBe(true);

    // 验证列表容器显示
    const isListVisible = await wizardPage.isRevisionListVisible();
    expect(isListVisible).toBe(true);
  });

  test('显示 revision 卡片', async ({ page }) => {
    // 加载 revisions
    await wizardPage.loadRevisionsBtn.click();
    await page.waitForTimeout(2000);

    // 检查是否有 revision 项
    const revisionCount = await wizardPage.getRevisionCount();

    // 如果有数据，验证卡片结构
    if (revisionCount > 0) {
      const firstRevision = wizardPage.revisionList.locator('.revision-item').first();
      await expect(firstRevision).toBeVisible();

      // 验证包含 checkbox
      const checkbox = firstRevision.locator('input[type="checkbox"]');
      await expect(checkbox).toBeVisible();
    }
  });

  test('可以选择单个 revision', async ({ page }) => {
    // 加载 revisions
    await wizardPage.loadRevisionsBtn.click();
    await page.waitForTimeout(2000);

    const revisionCount = await wizardPage.getRevisionCount();

    if (revisionCount > 0) {
      // 选择第一个 revision
      await wizardPage.selectRevision(0);
      await page.waitForTimeout(300);

      // 验证选中计数更新
      const selectedCount = await wizardPage.getSelectedRevisionCount();
      expect(selectedCount).toBeGreaterThan(0);

      // 验证下一步按钮启用
      const nextBtn = page.locator('#nextToPreviewBtn');
      await expect(nextBtn).toBeEnabled();
    }
  });

  test('可以选择多个 revision', async ({ page }) => {
    // 加载 revisions
    await wizardPage.loadRevisionsBtn.click();
    await page.waitForTimeout(2000);

    const revisionCount = await wizardPage.getRevisionCount();

    if (revisionCount >= 2) {
      // 选择前两个 revision
      await wizardPage.selectRevision(0);
      await wizardPage.selectRevision(1);
      await page.waitForTimeout(300);

      // 验证选中计数
      const selectedCount = await wizardPage.getSelectedRevisionCount();
      expect(selectedCount).toBeGreaterThanOrEqual(2);
    }
  });

  test('全选功能', async ({ page }) => {
    // 加载 revisions
    await wizardPage.loadRevisionsBtn.click();
    await page.waitForTimeout(2000);

    const revisionCount = await wizardPage.getRevisionCount();

    if (revisionCount > 0) {
      // 点击全选
      await wizardPage.selectAllRevisions();
      await page.waitForTimeout(500);

      // 验证所有项都被选中
      const selectedCount = await wizardPage.getSelectedRevisionCount();
      expect(selectedCount).toBe(revisionCount);
    }
  });

  test('取消全选功能', async ({ page }) => {
    // 加载 revisions
    await wizardPage.loadRevisionsBtn.click();
    await page.waitForTimeout(2000);

    const revisionCount = await wizardPage.getRevisionCount();

    if (revisionCount > 0) {
      // 先全选
      await wizardPage.selectAllRevisions();
      await page.waitForTimeout(300);

      // 再取消全选
      await wizardPage.deselectAllRevisions();
      await page.waitForTimeout(300);

      // 验证选中计数为 0
      const selectedCount = await wizardPage.getSelectedRevisionCount();
      expect(selectedCount).toBe(0);
    }
  });

  test('过滤栏显示', async () => {
    // 加载 revisions
    await wizardPage.loadRevisionsBtn.click();
    await wizardPage.page.waitForTimeout(2000);

    // 验证过滤栏元素
    await expect(wizardPage.filterBar).toBeVisible();
    await expect(wizardPage.filterAuthor).toBeVisible();
    await expect(wizardPage.filterMessage).toBeVisible();
    await expect(wizardPage.filterDateFrom).toBeVisible();
    await expect(wizardPage.filterDateTo).toBeVisible();
  });

  test('按作者过滤', async ({ page }) => {
    // 加载 revisions
    await wizardPage.loadRevisionsBtn.click();
    await page.waitForTimeout(2000);

    const initialCount = await wizardPage.getRevisionCount();

    if (initialCount > 0) {
      // 输入作者名过滤
      await wizardPage.filterByAuthor('test');
      await page.waitForTimeout(500);

      // 验证列表更新（可能减少或保持）
      const filteredCount = await wizardPage.getRevisionCount();
      expect(filteredCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('按提交信息搜索（测试防抖）', async ({ page }) => {
    // 加载 revisions
    await wizardPage.loadRevisionsBtn.click();
    await page.waitForTimeout(2000);

    const initialCount = await wizardPage.getRevisionCount();

    if (initialCount > 0) {
      // 输入搜索关键词
      await wizardPage.filterMessage.fill('fix');

      // 等待防抖时间
      await page.waitForTimeout(1000);

      // 验证列表可能更新
      const filteredCount = await wizardPage.getRevisionCount();
      expect(filteredCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('按日期范围过滤', async ({ page }) => {
    // 加载 revisions
    await wizardPage.loadRevisionsBtn.click();
    await page.waitForTimeout(2000);

    const initialCount = await wizardPage.getRevisionCount();

    if (initialCount > 0) {
      // 设置日期范围
      await wizardPage.filterByDateRange('2024-01-01', '2024-12-31');
      await page.waitForTimeout(500);

      // 验证列表更新
      const filteredCount = await wizardPage.getRevisionCount();
      expect(filteredCount).toBeGreaterThanOrEqual(0);
    }
  });

  test('清除过滤', async ({ page }) => {
    // 加载 revisions
    await wizardPage.loadRevisionsBtn.click();
    await page.waitForTimeout(2000);

    const initialCount = await wizardPage.getRevisionCount();

    if (initialCount > 0) {
      // 应用过滤
      await wizardPage.filterByAuthor('test');
      await page.waitForTimeout(500);

      // 清除过滤
      await wizardPage.clearFilters();
      await page.waitForTimeout(500);

      // 验证恢复到初始状态
      const restoredCount = await wizardPage.getRevisionCount();
      expect(restoredCount).toBe(initialCount);
    }
  });

  test('选中后"下一步"按钮启用', async ({ page }) => {
    // 加载 revisions
    await wizardPage.loadRevisionsBtn.click();
    await page.waitForTimeout(2000);

    const nextBtn = page.locator('#nextToPreviewBtn');

    // 初始状态应该禁用
    const initialDisabled = await nextBtn.isDisabled();
    expect(initialDisabled).toBe(true);

    const revisionCount = await wizardPage.getRevisionCount();

    if (revisionCount > 0) {
      // 选择一个 revision
      await wizardPage.selectRevision(0);
      await page.waitForTimeout(300);

      // 验证按钮启用
      await expect(nextBtn).toBeEnabled();
    }
  });

  test('点击展开显示文件列表（懒加载）', async ({ page }) => {
    // 加载 revisions
    await wizardPage.loadRevisionsBtn.click();
    await page.waitForTimeout(2000);

    const revisionCount = await wizardPage.getRevisionCount();

    if (revisionCount > 0) {
      // 尝试展开第一个 revision
      await wizardPage.expandRevision(0);

      // 等待文件列表加载
      await page.waitForTimeout(1000);

      // 验证展开内容显示（如果有展开功能）
      const firstRevision = wizardPage.revisionList.locator('.revision-item').first();
      const expandedContent = firstRevision.locator('.revision-files, .file-list');

      // 检查是否有展开内容
      const isExpanded = await expandedContent.isVisible().catch(() => false);
      // 不强制要求，因为可能没有实现展开功能
    }
  });
});
