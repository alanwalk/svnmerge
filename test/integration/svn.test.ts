import { describe, it, expect } from 'vitest';
import { runSvnCommand } from '../../src/utils/svn';

describe('SVN Command Execution', () => {
  it('should execute svn --version command', async () => {
    // 这个测试会验证 SVN 命令是否能正常执行
    const result = await runSvnCommand('svn --version', process.cwd());
    expect(result.stdout).toContain('svn');
    expect(result.stdout).toContain('version');
  }, 10000); // 10秒超时

  it('should execute svn help command', async () => {
    // 测试 svn help 命令
    const result = await runSvnCommand('svn help', process.cwd());
    expect(result.stdout.length).toBeGreaterThan(0);
  }, 10000);

  it('should handle command errors properly', async () => {
    // 测试错误处理
    await expect(
      runSvnCommand('svn invalid-command-xyz', process.cwd())
    ).rejects.toThrow('SVN command failed');
  }, 10000);
});
