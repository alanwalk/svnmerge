import { Page, Locator } from '@playwright/test';

/**
 * 主页面 Page Object
 */
export class IndexPage {
  readonly page: Page;
  readonly connectionStatus: Locator;
  readonly repoInfo: Locator;
  readonly refreshRepoBtn: Locator;
  readonly startMergeBtn: Locator;
  readonly checkConflictsBtn: Locator;
  readonly viewMergeInfoBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.connectionStatus = page.locator('#connectionStatus');
    this.repoInfo = page.locator('#repoInfo');
    this.refreshRepoBtn = page.locator('#refreshRepoBtn');
    this.startMergeBtn = page.locator('a[href="merge-wizard.html"]');
    this.checkConflictsBtn = page.locator('#checkConflictsBtn');
    this.viewMergeInfoBtn = page.locator('#viewMergeInfoBtn');
  }

  async goto() {
    await this.page.goto('/index.html');
    await this.page.waitForLoadState('networkidle');
  }

  async isConnected(): Promise<boolean> {
    const statusClass = await this.connectionStatus.getAttribute('class');
    return statusClass?.includes('connected') || false;
  }

  async waitForConnection(timeout: number = 10000) {
    await this.page.waitForFunction(
      () => {
        const status = document.querySelector('#connectionStatus');
        return status?.classList.contains('connected');
      },
      { timeout }
    );
  }

  async getRepoInfoText(): Promise<string> {
    return (await this.repoInfo.textContent()) || '';
  }

  async clickStartMerge() {
    await this.startMergeBtn.click();
    await this.page.waitForURL('**/merge-wizard.html');
  }

  async refreshRepo() {
    await this.refreshRepoBtn.click();
  }
}
