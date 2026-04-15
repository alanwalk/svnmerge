import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * 使用 Edge 浏览器测试 SVN Merge Tool Web UI
 */
export default defineConfig({
  testDir: './test/e2e',

  // 全局设置
  globalSetup: require.resolve('./test/e2e/setup.ts'),

  // 测试超时配置
  timeout: 60 * 1000, // 每个测试 60 秒
  expect: {
    timeout: 10 * 1000, // 断言超时 10 秒
  },

  // 失败重试
  retries: process.env.CI ? 2 : 0,

  // 并行执行
  workers: process.env.CI ? 1 : undefined,

  // 输出目录
  outputDir: 'test-results/playwright-output',

  // 报告配置
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    ['list'],
  ],

  // 全局配置
  use: {
    // Base URL
    baseURL: 'http://localhost:36695',

    // 浏览器上下文选项
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',

    // 视口大小
    viewport: { width: 1280, height: 720 },

    // 忽略 HTTPS 错误
    ignoreHTTPSErrors: true,

    // 操作超时
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,
  },

  // 项目配置 - 使用 Edge 浏览器
  projects: [
    {
      name: 'Microsoft Edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
    },
  ],

  // Web Server 配置（可选，如果需要自动启动服务）
  // webServer: {
  //   command: 'node dist/daemon-cli.js start',
  //   port: 36695,
  //   timeout: 120 * 1000,
  //   reuseExistingServer: !process.env.CI,
  // },
});
