/**
 * SVN Merge Tool Daemon 使用示例
 */

import { DaemonManager } from '../src/daemon';

async function main() {
  const manager = new DaemonManager();

  try {
    console.log('=== Daemon 管理示例 ===\n');

    // 1. 启动服务
    console.log('1. 启动 daemon...');
    await manager.start();
    console.log('   ✓ 启动成功\n');

    // 2. 查看状态
    console.log('2. 查看状态...');
    let status = await manager.status();
    console.log('   运行状态:', status.running);
    console.log('   进程 PID:', status.pid);
    console.log('   启动时间:', status.startTime?.toLocaleString());
    console.log('   运行时长:', status.uptime, '秒\n');

    // 3. 等待几秒
    console.log('3. 等待 3 秒...');
    await sleep(3000);
    console.log('   ✓ 完成\n');

    // 4. 再次查看状态
    console.log('4. 再次查看状态...');
    status = await manager.status();
    console.log('   运行时长:', status.uptime, '秒\n');

    // 5. 测试 API
    console.log('5. 测试健康检查 API...');
    const response = await fetch('http://localhost:36695/api/health');
    const data = await response.json();
    console.log('   响应:', JSON.stringify(data, null, 2));
    console.log('   ✓ API 正常\n');

    // 6. 停止服务
    console.log('6. 停止 daemon...');
    await manager.stop();
    console.log('   ✓ 停止成功\n');

    // 7. 确认已停止
    console.log('7. 确认状态...');
    status = await manager.status();
    console.log('   运行状态:', status.running);
    console.log('   ✓ 已停止\n');

    console.log('=== 示例完成 ===');
  } catch (error: any) {
    console.error('错误:', error.message);
    process.exit(1);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 运行示例
main();
