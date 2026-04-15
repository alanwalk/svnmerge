#!/usr/bin/env node
/**
 * 验证 Windows SVN 命令执行修复
 *
 * 运行此脚本来验证所有修复是否正常工作
 */

const { runSvnCommand } = require('./dist/utils/svn.js');

async function verify() {
  console.log('=== Verifying SVN Command Execution Fix ===\n');

  try {
    console.log('Testing SVN command execution...');
    const result = await runSvnCommand('svn --version', process.cwd());

    console.log('✓ SUCCESS!\n');
    console.log('SVN Version:', result.stdout.split('\n')[0]);
    console.log('\nThe fix is working correctly.');
    console.log('\nYou can now use the application without ENOENT errors.');

  } catch (error) {
    console.error('✗ FAILED!\n');
    console.error('Error:', error.message);
    console.error('\nPlease ensure:');
    console.error('1. SVN is installed (TortoiseSVN, SlikSVN, or CollabNet)');
    console.error('2. You have run: npm run build');
    console.error('3. If the problem persists, please provide the full error message');
    process.exit(1);
  }
}

verify();
