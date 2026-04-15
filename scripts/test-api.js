#!/usr/bin/env node

/**
 * SVN Merge Tool Daemon API 测试脚本
 *
 * 使用方法：
 *   node test-api.js
 */

const http = require('http');
const WebSocket = require('ws');

const BASE_URL = 'http://localhost:36695';
const WS_URL = 'ws://localhost:36695/ws';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// HTTP 请求封装
function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          resolve({ status: res.statusCode, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

// 测试用例
async function testHealthCheck() {
  log('\n=== Testing Health Check ===', 'cyan');
  try {
    const { status, data } = await request('GET', '/api/health');
    if (status === 200) {
      log('✓ Health check passed', 'green');
      log(`  Status: ${data.status}`, 'blue');
      log(`  Uptime: ${data.uptime.toFixed(2)}s`, 'blue');
      log(`  WS Clients: ${data.wsClients}`, 'blue');
      return true;
    } else {
      log('✗ Health check failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Health check error: ${error.message}`, 'red');
    return false;
  }
}

async function testInfo() {
  log('\n=== Testing Info Endpoint ===', 'cyan');
  try {
    const { status, data } = await request('GET', '/api/info');
    if (status === 200) {
      log('✓ Info endpoint passed', 'green');
      log(`  Name: ${data.name}`, 'blue');
      log(`  Version: ${data.version}`, 'blue');
      log(`  PID: ${data.pid}`, 'blue');
      return true;
    } else {
      log('✗ Info endpoint failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Info endpoint error: ${error.message}`, 'red');
    return false;
  }
}

async function testWebSocket() {
  log('\n=== Testing WebSocket Connection ===', 'cyan');
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(WS_URL);
      let connected = false;

      ws.on('open', () => {
        log('✓ WebSocket connected', 'green');
        connected = true;
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          log(`  Received message: ${message.type}`, 'blue');
          if (message.type === 'complete' && message.taskId === 'connection') {
            log(`  Client ID: ${message.result.clientId}`, 'blue');
            ws.close();
            resolve(true);
          }
        } catch (e) {
          log(`  Failed to parse message: ${e.message}`, 'yellow');
        }
      });

      ws.on('error', (error) => {
        log(`✗ WebSocket error: ${error.message}`, 'red');
        resolve(false);
      });

      ws.on('close', () => {
        if (!connected) {
          log('✗ WebSocket connection failed', 'red');
          resolve(false);
        }
      });

      // 超时处理
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
        if (!connected) {
          log('✗ WebSocket connection timeout', 'red');
          resolve(false);
        }
      }, 5000);
    } catch (error) {
      log(`✗ WebSocket test error: ${error.message}`, 'red');
      resolve(false);
    }
  });
}

async function testRepoInfo() {
  log('\n=== Testing Repo Info (may fail if not in SVN repo) ===', 'cyan');
  try {
    const { status, data } = await request('GET', '/api/repo/info');
    if (status === 200 && data.status === 'completed') {
      log('✓ Repo info passed', 'green');
      log(`  Repository Root: ${data.result.repository_root || 'N/A'}`, 'blue');
      log(`  URL: ${data.result.url || 'N/A'}`, 'blue');
      return true;
    } else if (status === 500) {
      log('⚠ Not in SVN repository (expected)', 'yellow');
      return true;
    } else {
      log('✗ Repo info failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Repo info error: ${error.message}`, 'red');
    return false;
  }
}

async function testConflicts() {
  log('\n=== Testing Conflicts Endpoint ===', 'cyan');
  try {
    const { status, data } = await request('GET', '/api/conflicts');
    if (status === 200) {
      log('✓ Conflicts endpoint passed', 'green');
      log(`  Conflicts found: ${data.conflicts.length}`, 'blue');
      return true;
    } else if (status === 500) {
      log('⚠ Not in SVN repository (expected)', 'yellow');
      return true;
    } else {
      log('✗ Conflicts endpoint failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Conflicts endpoint error: ${error.message}`, 'red');
    return false;
  }
}

async function testMergeInfo() {
  log('\n=== Testing MergeInfo Endpoint ===', 'cyan');
  try {
    const { status, data } = await request('GET', '/api/mergeinfo');
    if (status === 200) {
      log('✓ MergeInfo endpoint passed', 'green');
      log(`  MergeInfo entries: ${data.mergeInfo.length}`, 'blue');
      return true;
    } else if (status === 500) {
      log('⚠ Not in SVN repository (expected)', 'yellow');
      return true;
    } else {
      log('✗ MergeInfo endpoint failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ MergeInfo endpoint error: ${error.message}`, 'red');
    return false;
  }
}

async function testTasksEndpoint() {
  log('\n=== Testing Tasks Endpoint ===', 'cyan');
  try {
    const { status, data } = await request('GET', '/api/tasks');
    if (status === 200) {
      log('✓ Tasks endpoint passed', 'green');
      log(`  Total tasks: ${data.tasks.length}`, 'blue');
      return true;
    } else {
      log('✗ Tasks endpoint failed', 'red');
      return false;
    }
  } catch (error) {
    log(`✗ Tasks endpoint error: ${error.message}`, 'red');
    return false;
  }
}

// 运行所有测试
async function runTests() {
  log('╔════════════════════════════════════════════════════════╗', 'cyan');
  log('║  SVN Merge Tool Daemon API Test Suite                 ║', 'cyan');
  log('╚════════════════════════════════════════════════════════╝', 'cyan');

  const results = [];

  results.push(await testHealthCheck());
  results.push(await testInfo());
  results.push(await testWebSocket());
  results.push(await testRepoInfo());
  results.push(await testConflicts());
  results.push(await testMergeInfo());
  results.push(await testTasksEndpoint());

  // 统计结果
  const passed = results.filter(r => r).length;
  const total = results.length;

  log('\n╔════════════════════════════════════════════════════════╗', 'cyan');
  log(`║  Test Results: ${passed}/${total} passed                           ║`, passed === total ? 'green' : 'yellow');
  log('╚════════════════════════════════════════════════════════╝', 'cyan');

  if (passed === total) {
    log('\n✓ All tests passed!', 'green');
    process.exit(0);
  } else {
    log(`\n⚠ ${total - passed} test(s) failed`, 'yellow');
    process.exit(1);
  }
}

// 检查服务器是否运行
async function checkServer() {
  try {
    await request('GET', '/api/health');
    return true;
  } catch (error) {
    log('✗ Cannot connect to daemon server', 'red');
    log('  Please start the daemon first:', 'yellow');
    log('    npm run build && node dist/daemon-cli.js start', 'yellow');
    return false;
  }
}

// 主函数
async function main() {
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }

  await runTests();
}

main();
