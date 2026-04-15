import { test, expect } from '@playwright/test';
import { WizardPage } from './pages/wizard.page';

test.describe('合并向导 - Step 2: 配置源分支', () => {
  let wizardPage: WizardPage;

  test.beforeEach(async ({ page }) => {
    wizardPage = new WizardPage(page);
    await wizardPage.goto();

    // 进入 Step 2
    await wizardPage.clickNext();
    await page.waitForTimeout(500);
  });

  test('显示源分支输入框', async ({ page }) => {
    // 验证在 Step 2
    const currentStep = await wizardPage.getCurrentStep();
    expect(currentStep).toBe(2);

    // 验证页面标题
    await expect(page.locator('#step2 h2')).toContainText('配置源分支');

    // 验证输入框显示
    await expect(wizardPage.branchPathInput).toBeVisible();
    await expect(wizardPage.branchPathInput).toBeEnabled();
  });

  test('输入框有正确的占位符', async () => {
    // 验证占位符文本
    const placeholder = await wizardPage.branchPathInput.getAttribute('placeholder');
    expect(placeholder).toContain('branches');
  });

  test('可以输入分支路径', async () => {
    const branchPath = '/branches/feature-test';

    // 输入分支路径
    await wizardPage.enterBranchPath(branchPath);

    // 验证输入值
    const value = await wizardPage.getBranchPath();
    expect(value).toBe(branchPath);
  });

  test('输入有效的分支路径', async () => {
    // 输入有效路径
    await wizardPage.enterBranchPath('/branches/feature-branch');

    // 验证下一步按钮可用
    await expect(wizardPage.nextBtn).toBeEnabled();
  });

  test('输入 trunk 路径', async () => {
    // 输入 trunk 路径
    await wizardPage.enterBranchPath('/trunk');

    // 验证输入值
    const value = await wizardPage.getBranchPath();
    expect(value).toBe('/trunk');

    // 验证下一步按钮可用
    await expect(wizardPage.nextBtn).toBeEnabled();
  });

  test('清空输入框', async () => {
    // 输入路径
    await wizardPage.enterBranchPath('/branches/test');

    // 清空
    await wizardPage.branchPathInput.clear();

    // 验证为空
    const value = await wizardPage.getBranchPath();
    expect(value).toBe('');
  });

  test('"上一步"按钮可用', async () => {
    // 验证上一步按钮
    await expect(wizardPage.prevBtn).toBeVisible();
    await expect(wizardPage.prevBtn).toBeEnabled();
    await expect(wizardPage.prevBtn).toContainText('上一步');
  });

  test('点击"上一步"返回 Step 1', async () => {
    // 点击上一步
    await wizardPage.clickPrev();

    // 验证返回 Step 1
    const currentStep = await wizardPage.getCurrentStep();
    expect(currentStep).toBe(1);
  });

  test('点击"下一步"进入 Step 3', async () => {
    // 输入分支路径
    await wizardPage.enterBranchPath('/branches/test-branch');

    // 点击下一步
    await wizardPage.clickNext();

    // 验证进入 Step 3
    const currentStep = await wizardPage.getCurrentStep();
    expect(currentStep).toBe(3);
  });

  test('输入后保留状态', async () => {
    const branchPath = '/branches/my-feature';

    // 输入路径
    await wizardPage.enterBranchPath(branchPath);

    // 进入下一步再返回
    await wizardPage.clickNext();
    await wizardPage.clickPrev();

    // 验证输入值保留
    const value = await wizardPage.getBranchPath();
    expect(value).toBe(branchPath);
  });

  test('显示帮助文本', async ({ page }) => {
    // 验证帮助文本显示
    const helpText = page.locator('#step2 .form-group').locator('div').last();
    await expect(helpText).toBeVisible();
    await expect(helpText).toContainText('示例');
  });
});
