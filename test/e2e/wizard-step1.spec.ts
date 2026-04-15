import { test, expect } from '@playwright/test';
import { WizardPage } from './pages/wizard.page';

test.describe('合并向导 - Step 1: 选择合并类型', () => {
  let wizardPage: WizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new WizardPage(page);
    await wizardPage.goto();
  });

  test('显示合并类型选择', async ({ page }) => {
    // 验证 Step 1 是激活状态
    const currentStep = await wizardPage.getCurrentStep();
    expect(currentStep).toBe(1);

    // 验证页面标题
    await expect(page.locator('#step1 h2')).toContainText('选择合并类型');

    // 验证两个选项都显示
    await expect(wizardPage.mergeTypeRange).toBeVisible();
    await expect(wizardPage.mergeTypeSpecific).toBeVisible();
  });

  test('默认选中 "Merge a range of revisions"', async () => {
    // 验证默认选中范围合并
    const isRangeChecked = await wizardPage.mergeTypeRange.isChecked();
    expect(isRangeChecked).toBe(true);

    const selectedType = await wizardPage.getSelectedMergeType();
    expect(selectedType).toBe('range');
  });

  test('可以切换到 "Merge specific revisions"', async () => {
    // 切换到特定版本合并
    await wizardPage.selectMergeType('specific');

    // 验证选中状态
    const isSpecificChecked = await wizardPage.mergeTypeSpecific.isChecked();
    expect(isSpecificChecked).toBe(true);

    const selectedType = await wizardPage.getSelectedMergeType();
    expect(selectedType).toBe('specific');
  });

  test('可以在两种类型之间切换', async () => {
    // 切换到特定版本
    await wizardPage.selectMergeType('specific');
    let selectedType = await wizardPage.getSelectedMergeType();
    expect(selectedType).toBe('specific');

    // 切换回范围合并
    await wizardPage.selectMergeType('range');
    selectedType = await wizardPage.getSelectedMergeType();
    expect(selectedType).toBe('range');
  });

  test('"下一步"按钮可用', async () => {
    // 验证下一步按钮可见且可点击
    await expect(wizardPage.nextBtn).toBeVisible();
    await expect(wizardPage.nextBtn).toBeEnabled();
    await expect(wizardPage.nextBtn).toContainText('下一步');
  });

  test('点击"下一步"进入 Step 2', async () => {
    // 点击下一步
    await wizardPage.clickNext();

    // 验证进入 Step 2
    const currentStep = await wizardPage.getCurrentStep();
    expect(currentStep).toBe(2);

    // 验证 Step 2 页面显示
    const isStep2Active = await wizardPage.isStepActive(2);
    expect(isStep2Active).toBe(true);
  });

  test('"取消"按钮可用', async ({ page }) => {
    // 验证取消按钮
    await expect(wizardPage.cancelBtn).toBeVisible();
    await expect(wizardPage.cancelBtn).toContainText('取消');

    // 点击取消应该返回首页
    await wizardPage.cancelBtn.click();
    await page.waitForURL('**/index.html');
    expect(page.url()).toContain('index.html');
  });

  test('步骤指示器显示正确', async ({ page }) => {
    // 验证所有步骤都显示
    const steps = await page.locator('.wizard-step').count();
    expect(steps).toBe(6);

    // 验证 Step 1 是激活状态
    const step1 = page.locator('.wizard-step[data-step="1"]');
    await expect(step1).toHaveClass(/active/);

    // 验证其他步骤不是激活状态
    const step2 = page.locator('.wizard-step[data-step="2"]');
    await expect(step2).not.toHaveClass(/active/);
  });
});
