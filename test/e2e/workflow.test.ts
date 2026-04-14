import { describe, it, expect, beforeEach } from 'vitest';
import { execSync } from 'child_process';
import { createTestEnv } from '../helpers/testUtils';
import * as path from 'path';
import * as fs from 'fs';

describe('End-to-End Tests', () => {
  const mockSvnPath = path.join(__dirname, '../bin/svn');
  const fixturesDir = path.join(__dirname, '../fixtures');

  // Reset state before each test
  beforeEach(() => {
    const scenarios = ['text-conflicts', 'tree-conflicts', 'binary-conflicts', 'mixed-conflicts'];
    scenarios.forEach(scenario => {
      const stateFile = path.join(fixturesDir, scenario, 'state.json');
      const originalFile = path.join(fixturesDir, scenario, 'state.original.json');

      // Restore from original
      if (fs.existsSync(originalFile)) {
        fs.copyFileSync(originalFile, stateFile);
      }
    });
  });

  describe('Mock SVN CLI', () => {
    it('should show conflicts for text-conflicts scenario', () => {
      const env = createTestEnv('text-conflicts');
      const output = execSync('node ' + mockSvnPath + ' status', { env, encoding: 'utf-8' });

      expect(output).toContain('src/file1.ts');
      expect(output).toContain('src/file2.ts');
      expect(output).toContain('docs/readme.md');
    });

    it('should resolve conflicts', () => {
      const env = createTestEnv('text-conflicts');

      // Resolve a conflict
      const output = execSync(
        `node ${mockSvnPath} resolve --accept theirs-full src/file1.ts`,
        { env, encoding: 'utf-8' }
      );

      expect(output).toContain('Resolved conflicted state');
    });

    it('should handle tree conflicts', () => {
      const env = createTestEnv('tree-conflicts');
      const output = execSync('node ' + mockSvnPath + ' status', { env, encoding: 'utf-8' });

      expect(output).toContain('old_folder');
      expect(output).toContain('local delete, incoming edit');
    });

    it('should handle binary conflicts', () => {
      const env = createTestEnv('binary-conflicts');
      const output = execSync('node ' + mockSvnPath + ' status', { env, encoding: 'utf-8' });

      expect(output).toContain('images/logo.png');
      expect(output).toContain('docs/manual.pdf');
    });
  });
});
