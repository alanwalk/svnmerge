import { test, expect } from '@playwright/test';
import { WizardPage } from './pages/wizard.page';

test.describe('合并向导 - Step 4: 预览合并', () => {
  let wizardPage: WizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new WizardPage(page);
    await wizardPage.goto();

    // 进入 Step 4
    await wizardPage.clickNext(); // Step 1 -> 2
    await wizardPage.enterBranchPath('/branches/test');
    await wizardPage.clickNext(); // Step 2 -> 3

    // 加载并选择 revisions
    await wizardPage.loadRevisionsBtn.click();
    await page.waitForTimeout(2000);

    const revisionCount = await wizardPage.getRevisionCount();
    if (revisionCount > 0) {
      await wizardPage.selectRevision(0);
      await page.waitForTimeout(300);
    }

    await wizardPage.clickNext(); // Step 3 -> 4
    await page.waitForTimeout(500);
  });

  test('显示预览页面', async ({ page }) => {
    // 验证在 Step 4
    const currentStep = await wizardPage.getCurrentStep();
    expect(currentStep).toBe(4);

    // 验证页面标题
    await expect(page.locator('#step4 h2')).toContainText('预览合并');

    // 验证预览内容区域显示
    await expect(wizardPage.previewContent).toBeVisible();
  });

  test('显示已选择的 revision 列表', async () => {
    // 验证预览内容不为空
    const content = await wizardPage.getPreviewContent();
    expect(content.length).toBeGreaterThan(0);
  });

  test('显示每个 revision 的详细信息', async ({ page }) => {
    // 检查预览内容中是否包含 revision 信息
    const content = await wizardPage.getPreviewContent();

    // 应该包含一些关键信息（版本号、作者等）
    // 具体内容取决于实际实现
    expect(content.length).toBeGreaterThan(10);
  });

  test('"开始合并"按钮可用', async ({ page }) => {
    // 查找开始合并按钮
    const startBtn = page.locator('button:has-text("开始合并")');

    // 验证按钮可见且可点击
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeEnabled();
  });

  test('"返回"按钮可用', async () => {
    // 验证上一步按钮
    await expect(wizardPage.prevBtn).toBeVisible();
    await expect(wizardPage.prevBtn).toBeEnabled();
  });

  test('点击"返回"回到 Step 3', async () => {
    // 点击返回
    await wizardPage.clickPrev();

    // 验证回到 Step 3
    const currentStep = await wizardPage.getCurrentStep();
    expect(currentStep).toBe(3);
  });

  test('点击"开始合并"进入 Step 5', async ({ page }) => {
    // 点击开始合并
    await wizardPage.startMerge();

    // 验证进入 Step 5
    await page.waitForTimeout(1000);
    const currentStep = await wizardPage.getCurrentStep();
    expect(currentStep).toBe(5);

    // 验证进度页面显示
    await expect(wizardPage.mergeProgressFill).toBeVisible();
  });

  test('预览内容格式正确', async ({ page }) => {
    // 验证预览区域有内容
    const previewHtml = await wizardPage.previewContent.innerHTML();
    expect(previewHtml.length).toBeGreaterThan(0);

    // 可以检查是否包含列表或卡片结构
    const hasStructure = previewHtml.includes('div') || previewHtml.includes('ul');
    expect(hasStructure).toBe(true);
  });

  test('返回后保持选择状态', async ({ page }) => {
    // 记录当前选择
    const previewContent = await wizardPage.getPreviewContent();

    // 返回 Step 3
    await wizardPage.clickPrev();

    // 验证选择仍然存在
    const selectedCount = await wizardPage.getSelectedRevisionCount();
    expect(selectedCount).toBeGreaterThan(0);

    // 再次进入 Step 4
    await wizardPage.clickNext();
    await page.waitForTimeout(500);

    // 验证预览内容一致
    const newPreviewContent = await wizardPage.getPreviewContent();
    expect(newPreviewContent).toBe(previewContent);
  });
});
