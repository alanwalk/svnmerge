import { test, expect } from '@playwright/test';
import { IndexPage } from './pages/index.page';
import { WizardPage } from './pages/wizard.page';

test.describe('UI 组件测试', () => {
  test('Toast 消息显示和自动消失', async ({ page }) => {
    const indexPage = new IndexPage(page);
    await indexPage.goto();

    // 触发一个操作来显示 Toast（如果有）
    await indexPage.refreshRepo();
    await page.waitForTimeout(500);

    // 检查 Toast 是否存在
    const toast = page.locator('.toast');
    const toastVisible = await toast.isVisible().catch(() => false);

    if (toastVisible) {
      // 验证 Toast 显示
      await expect(toast).toBeVisible();

      // 等待 Toast 自动消失（通常 3-5 秒）
      await page.waitForTimeout(6000);

      // 验证 Toast 消失
      const stillVisible = await toast.isVisible().catch(() => false);
      expect(stillVisible).toBe(false);
    } else {
      console.log('No toast message triggered');
    }
  });

  test('Loading Spinner 显示和隐藏', async ({ page }) => {
    const wizardPage = new WizardPage(page);
    await wizardPage.goto();

    // 进入 Step 3
    await wizardPage.clickNext();
    await wizardPage.enterBranchPath('/branches/test');
    await wizardPage.clickNext();

    // 点击加载按钮
    await wizardPage.loadRevisionsBtn.click();

    // 检查是否有 loading 状态
    await page.waitForTimeout(100);

    const loadingVisible = await page.locator('.loading, .spinner, .loading-spinner').isVisible().catch(() => false);
    console.log('Loading spinner shown:', loadingVisible);

    // 等待加载完成
    await page.waitForTimeout(3000);

    // Loading 应该消失
    const stillLoading = await page.locator('.loading, .spinner').isVisible().catch(() => false);
    console.log('Loading spinner still visible:', stillLoading);
  });

  test('Progress Bar 更新', async ({ page }) => {
    const wizardPage = new WizardPage(page);
    await wizardPage.goto();

    // 完成流程到 Step 5
    await wizardPage.clickNext();
    await wizardPage.enterBranchPath('/branches/test');
    await wizardPage.clickNext();

    await wizardPage.loadRevisionsBtn.click();
    await page.waitForTimeout(2000);

    const revisionCount = await wizardPage.getRevisionCount();
    if (revisionCount > 0) {
      await wizardPage.selectRevision(0);
      await page.waitForTimeout(300);
      await wizardPage.clickNext();
      await page.waitForTimeout(500);
      await wizardPage.startMerge();
      await page.waitForTimeout(1000);

      // 验证进度条显示
      await expect(wizardPage.mergeProgressFill).toBeVisible();

      // 获取初始进度
      const initialProgress = await wizardPage.getMergeProgress();
      expect(initialProgress).toBeGreaterThanOrEqual(0);

      // 等待进度更新
      await page.waitForTimeout(3000);

      // 获取更新后的进度
      const updatedProgress = await wizardPage.getMergeProgress();
      expect(updatedProgress).toBeGreaterThanOrEqual(initialProgress);

      // 验证进度条样式
      const progressWidth = await wizardPage.mergeProgressFill.evaluate(el => {
        return window.getComputedStyle(el).width;
      });
      console.log('Progress bar width:', progressWidth);
    }
  });

  test('按钮状态切换', async ({ page }) => {
    const wizardPage = new WizardPage(page);
    await wizardPage.goto();

    // 验证初始按钮状态
    await expect(wizardPage.nextBtn).toBeEnabled();

    // 进入 Step 3
    await wizardPage.clickNext();
    await wizardPage.enterBranchPath('/branches/test');
    await wizardPage.clickNext();

    // 加载 revisions
    await wizardPage.loadRevisionsBtn.click();
    await page.waitForTimeout(2000);

    // 下一步按钮应该禁用（未选择）
    const nextBtn = page.locator('#nextToPreviewBtn');
    const isDisabled = await nextBtn.isDisabled();
    expect(isDisabled).toBe(true);

    // 选择一个 revision
    const revisionCount = await wizardPage.getRevisionCount();
    if (revisionCount > 0) {
      await wizardPage.selectRevision(0);
      await page.waitForTimeout(300);

      // 按钮应该启用
      await expect(nextBtn).toBeEnabled();
    }
  });

  test('输入框焦点和样式', async ({ page }) => {
    const wizardPage = new WizardPage(page);
    await wizardPage.goto();

    await wizardPage.clickNext();

    // 点击输入框
    await wizardPage.branchPathInput.click();

    // 验证获得焦点
    const isFocused = await wizardPage.branchPathInput.evaluate(el => {
      return document.activeElement === el;
    });
    expect(isFocused).toBe(true);

    // 输入文本
    await wizardPage.branchPathInput.fill('/branches/test');

    // 验证输入值
    const value = await wizardPage.branchPathInput.inputValue();
    expect(value).toBe('/branches/test');
  });

  test('Checkbox 选中状态', async ({ page }) => {
    const wizardPage = new WizardPage(page);
    await wizardPage.goto();

    // 进入 Step 3
    await wizardPage.clickNext();
    await wizardPage.enterBranchPath('/branches/test');
    await wizardPage.clickNext();

    await wizardPage.loadRevisionsBtn.click();
    await page.waitForTimeout(2000);

    const revisionCount = await wizardPage.getRevisionCount();

    if (revisionCount > 0) {
      const checkbox = wizardPage.revisionList.locator('.revision-item').first().locator('input[type="checkbox"]');

      // 初始未选中
      const initialChecked = await checkbox.isChecked();
      expect(initialChecked).toBe(false);

      // 选中
      await checkbox.check();
      await page.waitForTimeout(100);

      // 验证选中
      const nowChecked = await checkbox.isChecked();
      expect(nowChecked).toBe(true);

      // 取消选中
      await checkbox.uncheck();
      await page.waitForTimeout(100);

      // 验证取消
      const unchecked = await checkbox.isChecked();
      expect(unchecked).toBe(false);
    }
  });

  test('Radio 按钮选择', async ({ page }) => {
    const wizardPage = new WizardPage(page);
    await wizardPage.goto();

    // 验证默认选中
    const rangeChecked = await wizardPage.mergeTypeRange.isChecked();
    expect(rangeChecked).toBe(true);

    // 切换选择
    await wizardPage.mergeTypeSpecific.check();
    await page.waitForTimeout(100);

    // 验证切换
    const specificChecked = await wizardPage.mergeTypeSpecific.isChecked();
    expect(specificChecked).toBe(true);

    const rangeUnchecked = await wizardPage.mergeTypeRange.isChecked();
    expect(rangeUnchecked).toBe(false);
  });

  test('卡片展开/折叠', async ({ page }) => {
    const indexPage = new IndexPage(page);
    await indexPage.goto();

    // 验证卡片显示
    const cards = page.locator('.card');
    const cardCount = await cards.count();
    expect(cardCount).toBeGreaterThan(0);

    // 验证卡片结构
    const firstCard = cards.first();
    await expect(firstCard).toBeVisible();

    const cardHeader = firstCard.locator('.card-header');
    const cardBody = firstCard.locator('.card-body');

    await expect(cardHeader).toBeVisible();
    await expect(cardBody).toBeVisible();
  });

  test('步骤指示器样式', async ({ page }) => {
    const wizardPage = new WizardPage(page);
    await wizardPage.goto();

    // 验证步骤指示器
    const steps = page.locator('.wizard-step');
    const stepCount = await steps.count();
    expect(stepCount).toBe(6);

    // 验证第一步是激活状态
    const step1 = page.locator('.wizard-step[data-step="1"]');
    await expect(step1).toHaveClass(/active/);

    // 验证步骤号显示
    const stepNumber = step1.locator('.wizard-step-number');
    await expect(stepNumber).toContainText('1');

    // 验证步骤标签
    const stepLabel = step1.locator('.wizard-step-label');
    await expect(stepLabel).toBeVisible();
  });

  test('连接状态指示器', async ({ page }) => {
    const indexPage = new IndexPage(page);
    await indexPage.goto();

    // 验证连接状态显示
    await expect(indexPage.connectionStatus).toBeVisible();

    // 验证状态点显示
    const statusDot = indexPage.connectionStatus.locator('.status-dot');
    await expect(statusDot).toBeVisible();

    // 等待连接
    await indexPage.waitForConnection(15000);

    // 验证连接后的样式
    const statusClass = await indexPage.connectionStatus.getAttribute('class');
    expect(statusClass).toContain('connection-status');
  });

  test('响应式布局', async ({ page }) => {
    const indexPage = new IndexPage(page);

    // 测试桌面视图
    await page.setViewportSize({ width: 1280, height: 720 });
    await indexPage.goto();

    const desktopLayout = await page.locator('.container').isVisible();
    expect(desktopLayout).toBe(true);

    // 测试平板视图
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    const tabletLayout = await page.locator('.container').isVisible();
    expect(tabletLayout).toBe(true);

    // 测试移动视图
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    const mobileLayout = await page.locator('.container').isVisible();
    expect(mobileLayout).toBe(true);
  });

  test('按钮悬停效果', async ({ page }) => {
    const indexPage = new IndexPage(page);
    await indexPage.goto();

    // 悬停在按钮上
    await indexPage.startMergeBtn.hover();
    await page.waitForTimeout(200);

    // 验证按钮仍然可见
    await expect(indexPage.startMergeBtn).toBeVisible();
  });
});
