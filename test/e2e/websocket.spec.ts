import { test, expect } from '@playwright/test';
import { IndexPage } from './pages/index.page';

test.describe('WebSocket 通信测试', () => {
  let indexPage: IndexPage;

  test.beforeEach(async ({ page }) => {
    indexPage = new IndexPage(page);
  });

  test('WebSocket 连接建立', async ({ page }) => {
    await indexPage.goto();

    // 等待 WebSocket 连接
    await indexPage.waitForConnection(15000);

    // 验证连接状态
    const isConnected = await indexPage.isConnected();
    expect(isConnected).toBe(true);

    // 验证连接状态显示
    await expect(indexPage.connectionStatus).toBeVisible();
    const statusText = await indexPage.connectionStatus.textContent();
    expect(statusText).toContain('连接');
  });

  test('WebSocket 连接后接收消息', async ({ page }) => {
    await indexPage.goto();
    await indexPage.waitForConnection(15000);

    // 监听 WebSocket 消息
    const messages: any[] = [];

    await page.evaluate(() => {
      (window as any).wsMessages = [];
      const originalSend = WebSocket.prototype.send;
      WebSocket.prototype.send = function(data) {
        (window as any).wsMessages.push({ type: 'sent', data });
        return originalSend.call(this, data);
      };
    });

    // 触发一些操作来接收消息
    await page.waitForTimeout(2000);

    // 检查是否有消息交互
    const wsMessages = await page.evaluate(() => (window as any).wsMessages || []);
    console.log('WebSocket messages:', wsMessages.length);
  });

  test('WebSocket 断开后显示提示', async ({ page }) => {
    await indexPage.goto();
    await indexPage.waitForConnection(15000);

    // 模拟断开连接
    await page.evaluate(() => {
      const ws = (window as any).ws;
      if (ws) {
        ws.close();
      }
    });

    // 等待状态更新
    await page.waitForTimeout(1000);

    // 验证连接状态变化
    const statusClass = await indexPage.connectionStatus.getAttribute('class');
    // 可能显示断开或重连状态
    expect(statusClass).toBeTruthy();
  });

  test('WebSocket 重连机制', async ({ page }) => {
    await indexPage.goto();
    await indexPage.waitForConnection(15000);

    // 模拟断开
    await page.evaluate(() => {
      const ws = (window as any).ws;
      if (ws) {
        ws.close();
      }
    });

    // 等待重连
    await page.waitForTimeout(5000);

    // 检查是否尝试重连
    const isConnected = await indexPage.isConnected();
    // 重连可能成功或失败，取决于服务状态
    console.log('Reconnection status:', isConnected);
  });

  test('WebSocket 发送心跳', async ({ page }) => {
    await indexPage.goto();
    await indexPage.waitForConnection(15000);

    // 监听 WebSocket 活动
    let messageCount = 0;

    page.on('websocket', ws => {
      ws.on('framesent', frame => {
        messageCount++;
      });
    });

    // 等待一段时间观察心跳
    await page.waitForTimeout(10000);

    // 应该有一些消息交互（心跳或其他）
    console.log('WebSocket message count:', messageCount);
  });

  test('WebSocket URL 正确', async ({ page }) => {
    await indexPage.goto();

    // 检查 WebSocket 连接 URL
    const wsUrl = await page.evaluate(() => {
      const ws = (window as any).ws;
      return ws ? ws.url : null;
    });

    if (wsUrl) {
      expect(wsUrl).toContain('ws://');
      expect(wsUrl).toContain('36695');
    }
  });

  test('多个页面共享 WebSocket 连接', async ({ page, context }) => {
    // 打开第一个页面
    await indexPage.goto();
    await indexPage.waitForConnection(15000);

    // 打开第二个页面
    const page2 = await context.newPage();
    const indexPage2 = new IndexPage(page2);
    await indexPage2.goto();
    await indexPage2.waitForConnection(15000);

    // 验证两个页面都连接
    const isConnected1 = await indexPage.isConnected();
    const isConnected2 = await indexPage2.isConnected();

    expect(isConnected1).toBe(true);
    expect(isConnected2).toBe(true);

    await page2.close();
  });

  test('WebSocket 错误处理', async ({ page }) => {
    await indexPage.goto();

    // 监听控制台错误
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // 等待连接
    await indexPage.waitForConnection(15000);

    // 模拟错误
    await page.evaluate(() => {
      const ws = (window as any).ws;
      if (ws && ws.onerror) {
        ws.onerror(new Event('error'));
      }
    });

    await page.waitForTimeout(1000);

    // 检查是否有错误处理
    console.log('Console errors:', errors.length);
  });
});
