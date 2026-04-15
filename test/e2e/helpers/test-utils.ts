import { Page, expect } from '@playwright/test';
import { execSync, spawn, ChildProcess } from 'child_process';
import * as path from 'path';

/**
 * 测试工具函数
 */

let daemonProcess: ChildProcess | null = null;

/**
 * 启动 daemon 服务
 */
export async function startDaemon(): Promise<void> {
  const projectRoot = path.resolve(__dirname, '../../..');
  const daemonPath = path.join(projectRoot, 'dist/daemon-cli.js');

  try {
    // 检查服务是否已经运行
    const status = execSync(`node "${daemonPath}" status`, { encoding: 'utf-8' });
    if (status.includes('running')) {
      console.log('Daemon already running');
      return;
    }
  } catch (error) {
    // 服务未运行，继续启动
  }

  // 启动服务
  console.log('Starting daemon...');
  execSync(`node "${daemonPath}" start`, { encoding: 'utf-8' });

  // 等待服务启动
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 验证服务已启动
  const status = execSync(`node "${daemonPath}" status`, { encoding: 'utf-8' });
  if (!status.includes('running')) {
    throw new Error('Failed to start daemon');
  }

  console.log('Daemon started successfully');
}

/**
 * 停止 daemon 服务
 */
export async function stopDaemon(): Promise<void> {
  const projectRoot = path.resolve(__dirname, '../../..');
  const daemonPath = path.join(projectRoot, 'dist/daemon-cli.js');

  try {
    console.log('Stopping daemon...');
    execSync(`node "${daemonPath}" stop`, { encoding: 'utf-8' });
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('Daemon stopped');
  } catch (error) {
    console.error('Error stopping daemon:', error);
  }
}

/**
 * 等待 WebSocket 消息
 */
export async function waitForWebSocketMessage(
  page: Page,
  messageType: string,
  timeout: number = 30000
): Promise<any> {
  return page.evaluate(
    ({ type, timeoutMs }) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Timeout waiting for WebSocket message: ${type}`));
        }, timeoutMs);

        const handler = (event: MessageEvent) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === type) {
              clearTimeout(timer);
              window.removeEventListener('message', handler);
              resolve(data);
            }
          } catch (e) {
            // Ignore parse errors
          }
        };

        window.addEventListener('message', handler);
      });
    },
    { type: messageType, timeoutMs: timeout }
  );
}

/**
 * 等待 Loading 状态消失
 */
export async function waitForLoading(page: Page, timeout: number = 30000): Promise<void> {
  await page.waitForSelector('.loading, .spinner', { state: 'hidden', timeout });
}

/**
 * 等待 Toast 消息出现
 */
export async function waitForToast(page: Page, expectedText?: string): Promise<void> {
  const toast = page.locator('.toast');
  await toast.waitFor({ state: 'visible', timeout: 5000 });

  if (expectedText) {
    await expect(toast).toContainText(expectedText);
  }
}

/**
 * 检查 API 健康状态
 */
export async function checkApiHealth(baseURL: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseURL}/api/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * 等待页面完全加载
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

/**
 * 截图并保存
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  const screenshotPath = path.join(__dirname, '../../../test-results/screenshots', `${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved: ${screenshotPath}`);
}

/**
 * 获取元素文本内容
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible' });
  return (await element.textContent()) || '';
}

/**
 * 点击并等待导航
 */
export async function clickAndWaitForNavigation(page: Page, selector: string): Promise<void> {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click(selector),
  ]);
}

/**
 * 填写输入框
 */
export async function fillInput(page: Page, selector: string, value: string): Promise<void> {
  await page.fill(selector, '');
  await page.fill(selector, value);
  await page.waitForTimeout(100); // 等待输入稳定
}

/**
 * 检查元素是否可见
 */
export async function isVisible(page: Page, selector: string): Promise<boolean> {
  try {
    await page.waitForSelector(selector, { state: 'visible', timeout: 1000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * 检查元素是否启用
 */
export async function isEnabled(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector);
  return await element.isEnabled();
}

/**
 * 等待元素包含文本
 */
export async function waitForText(page: Page, selector: string, text: string): Promise<void> {
  await page.waitForFunction(
    ({ sel, txt }) => {
      const element = document.querySelector(sel);
      return element && element.textContent?.includes(txt);
    },
    { sel: selector, txt: text },
    { timeout: 10000 }
  );
}
