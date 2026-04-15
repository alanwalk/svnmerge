import { startDaemon, checkApiHealth } from './helpers/test-utils';

/**
 * 全局测试设置 - 在所有测试前运行一次
 */
export default async function globalSetup() {
  console.log('🚀 Starting global setup...');

  // 启动 daemon 服务
  await startDaemon();

  // 等待服务就绪
  let retries = 20;
  while (retries > 0) {
    if (await checkApiHealth('http://localhost:36695')) {
      console.log('✅ Daemon service is ready');
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    retries--;
  }

  throw new Error('❌ Daemon service failed to start');
}
