import { Page, Locator } from '@playwright/test';

/**
 * 合并向导 Page Object
 */
export class WizardPage {
  readonly page: Page;
  readonly connectionStatus: Locator;

  // Step indicators
  readonly stepIndicators: Locator;

  // Step 1: Merge Type
  readonly mergeTypeRange: Locator;
  readonly mergeTypeSpecific: Locator;

  // Step 2: Source Branch
  readonly branchPathInput: Locator;
  readonly branchValidation: Locator;

  // Step 3: Revisions
  readonly loadRevisionsBtn: Locator;
  readonly filterBar: Locator;
  readonly filterAuthor: Locator;
  readonly filterMessage: Locator;
  readonly filterDateFrom: Locator;
  readonly filterDateTo: Locator;
  readonly applyFilterBtn: Locator;
  readonly clearFilterBtn: Locator;
  readonly revisionListContainer: Locator;
  readonly revisionList: Locator;
  readonly selectedCount: Locator;
  readonly selectAllBtn: Locator;
  readonly deselectAllBtn: Locator;

  // Step 4: Preview
  readonly previewContent: Locator;

  // Step 5: Execute
  readonly mergeProgressFill: Locator;
  readonly mergeProgressMessage: Locator;
  readonly mergeProgressList: Locator;
  readonly cancelMergeBtn: Locator;
  readonly continueAfterMergeBtn: Locator;

  // Step 6: Complete
  readonly completionContent: Locator;
  readonly commitBtn: Locator;

  // Navigation buttons
  readonly nextBtn: Locator;
  readonly prevBtn: Locator;
  readonly cancelBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.connectionStatus = page.locator('#connectionStatus');
    this.stepIndicators = page.locator('.wizard-step');

    // Step 1
    this.mergeTypeRange = page.locator('input[name="mergeType"][value="range"]');
    this.mergeTypeSpecific = page.locator('input[name="mergeType"][value="specific"]');

    // Step 2
    this.branchPathInput = page.locator('#branchPath');
    this.branchValidation = page.locator('#branchValidation');

    // Step 3
    this.loadRevisionsBtn = page.locator('#loadRevisionsBtn');
    this.filterBar = page.locator('#filterBar');
    this.filterAuthor = page.locator('#filterAuthor');
    this.filterMessage = page.locator('#filterMessage');
    this.filterDateFrom = page.locator('#filterDateFrom');
    this.filterDateTo = page.locator('#filterDateTo');
    this.applyFilterBtn = page.locator('#applyFilterBtn');
    this.clearFilterBtn = page.locator('#clearFilterBtn');
    this.revisionListContainer = page.locator('#revisionListContainer');
    this.revisionList = page.locator('#revisionList');
    this.selectedCount = page.locator('#selectedCount');
    this.selectAllBtn = page.locator('#selectAllBtn');
    this.deselectAllBtn = page.locator('#deselectAllBtn');

    // Step 4
    this.previewContent = page.locator('#previewContent');

    // Step 5
    this.mergeProgressFill = page.locator('#mergeProgressFill');
    this.mergeProgressMessage = page.locator('#mergeProgressMessage');
    this.mergeProgressList = page.locator('#mergeProgressList');
    this.cancelMergeBtn = page.locator('#cancelMergeBtn');
    this.continueAfterMergeBtn = page.locator('#continueAfterMergeBtn');

    // Step 6
    this.completionContent = page.locator('#completionContent');
    this.commitBtn = page.locator('#commitBtn');

    // Navigation
    this.nextBtn = page.locator('.wizard-actions-right .btn-primary');
    this.prevBtn = page.locator('.wizard-actions-left .btn-secondary');
    this.cancelBtn = page.locator('.wizard-actions-left a.btn-secondary');
  }

  async goto() {
    await this.page.goto('/merge-wizard.html');
    await this.page.waitForLoadState('networkidle');
  }

  async getCurrentStep(): Promise<number> {
    const activeStep = await this.page.locator('.wizard-step.active').getAttribute('data-step');
    return parseInt(activeStep || '1', 10);
  }

  async isStepActive(stepNumber: number): Promise<boolean> {
    const step = this.page.locator(`.wizard-step[data-step="${stepNumber}"]`);
    const className = await step.getAttribute('class');
    return className?.includes('active') || false;
  }

  async clickNext() {
    await this.nextBtn.click();
    await this.page.waitForTimeout(500); // 等待动画
  }

  async clickPrev() {
    await this.prevBtn.click();
    await this.page.waitForTimeout(500);
  }

  // Step 1 methods
  async selectMergeType(type: 'range' | 'specific') {
    if (type === 'range') {
      await this.mergeTypeRange.check();
    } else {
      await this.mergeTypeSpecific.check();
    }
  }

  async getSelectedMergeType(): Promise<string> {
    const rangeChecked = await this.mergeTypeRange.isChecked();
    return rangeChecked ? 'range' : 'specific';
  }

  // Step 2 methods
  async enterBranchPath(path: string) {
    await this.branchPathInput.fill(path);
    await this.page.waitForTimeout(300);
  }

  async getBranchPath(): Promise<string> {
    return await this.branchPathInput.inputValue();
  }

  // Step 3 methods
  async loadRevisions() {
    await this.loadRevisionsBtn.click();
    await this.page.waitForTimeout(1000); // 等待加载
  }

  async isRevisionListVisible(): Promise<boolean> {
    return await this.revisionListContainer.isVisible();
  }

  async getRevisionCount(): Promise<number> {
    const revisions = await this.revisionList.locator('.revision-item').count();
    return revisions;
  }

  async selectRevision(index: number) {
    const checkbox = this.revisionList.locator('.revision-item').nth(index).locator('input[type="checkbox"]');
    await checkbox.check();
  }

  async getSelectedRevisionCount(): Promise<number> {
    const text = await this.selectedCount.textContent();
    return parseInt(text || '0', 10);
  }

  async selectAllRevisions() {
    await this.selectAllBtn.click();
  }

  async deselectAllRevisions() {
    await this.deselectAllBtn.click();
  }

  async filterByAuthor(author: string) {
    await this.filterAuthor.fill(author);
    await this.applyFilterBtn.click();
    await this.page.waitForTimeout(500);
  }

  async filterByMessage(message: string) {
    await this.filterMessage.fill(message);
    await this.page.waitForTimeout(800); // 等待防抖
  }

  async filterByDateRange(from: string, to: string) {
    await this.filterDateFrom.fill(from);
    await this.filterDateTo.fill(to);
    await this.applyFilterBtn.click();
    await this.page.waitForTimeout(500);
  }

  async clearFilters() {
    await this.clearFilterBtn.click();
    await this.page.waitForTimeout(500);
  }

  async expandRevision(index: number) {
    const revisionItem = this.revisionList.locator('.revision-item').nth(index);
    const expandBtn = revisionItem.locator('.revision-expand-btn, .expand-btn');
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await this.page.waitForTimeout(500);
    }
  }

  // Step 4 methods
  async getPreviewContent(): Promise<string> {
    return (await this.previewContent.textContent()) || '';
  }

  async startMerge() {
    const startBtn = this.page.locator('button:has-text("开始合并")');
    await startBtn.click();
    await this.page.waitForTimeout(1000);
  }

  // Step 5 methods
  async getMergeProgress(): Promise<number> {
    const text = await this.mergeProgressFill.textContent();
    const match = text?.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 0;
  }

  async getMergeProgressMessage(): Promise<string> {
    return (await this.mergeProgressMessage.textContent()) || '';
  }

  async cancelMerge() {
    await this.cancelMergeBtn.click();
  }

  async waitForMergeComplete(timeout: number = 60000) {
    await this.page.waitForFunction(
      () => {
        const btn = document.querySelector('#continueAfterMergeBtn');
        return btn && !btn.classList.contains('hidden');
      },
      { timeout }
    );
  }

  async continueAfterMerge() {
    await this.continueAfterMergeBtn.click();
    await this.page.waitForTimeout(500);
  }

  // Step 6 methods
  async getCompletionContent(): Promise<string> {
    return (await this.completionContent.textContent()) || '';
  }

  async commit() {
    await this.commitBtn.click();
  }
}
