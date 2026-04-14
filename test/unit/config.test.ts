import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { findConfigFile, loadConfig, parseRevisions, mergeConfig, createDefaultConfig } from '../../src/utils/config';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('config utils', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'config-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
  });

  describe('findConfigFile', () => {
    it('should find config in current directory', () => {
      const configPath = path.join(tmpDir, 'svnmerge.yaml');
      fs.writeFileSync(configPath, 'workspace: .\n');

      const found = findConfigFile(tmpDir);
      expect(found).toBe(configPath);
    });

    it('should find config in parent directory', () => {
      const subDir = path.join(tmpDir, 'sub', 'dir');
      fs.mkdirSync(subDir, { recursive: true });

      const configPath = path.join(tmpDir, 'svnmerge.yaml');
      fs.writeFileSync(configPath, 'workspace: .\n');

      const found = findConfigFile(subDir);
      expect(found).toBe(configPath);
    });

    it('should return null if no config found', () => {
      const found = findConfigFile(tmpDir);
      expect(found).toBeNull();
    });

    it('should prefer svnmerge.yaml over other names', () => {
      fs.writeFileSync(path.join(tmpDir, 'svnmerge.yml'), 'workspace: .\n');
      fs.writeFileSync(path.join(tmpDir, 'svnmerge.yaml'), 'workspace: .\n');

      const found = findConfigFile(tmpDir);
      expect(found).toBe(path.join(tmpDir, 'svnmerge.yaml'));
    });
  });

  describe('loadConfig', () => {
    it('should load valid YAML config', () => {
      const configPath = path.join(tmpDir, 'config.yaml');
      const configContent = `
workspace: /test/path
from: ^/branches/feature
defaultStrategy: theirs-full
ignore:
  - temp/**/*
  - "*.tmp"
`;
      fs.writeFileSync(configPath, configContent);

      const config = loadConfig(configPath);
      expect(config.workspace).toBe('/test/path');
      expect(config.from).toBe('^/branches/feature');
      expect(config.defaultStrategy).toBe('theirs-full');
      expect(config.ignore).toEqual(['temp/**/*', '*.tmp']);
    });

    it('should throw error for invalid YAML', () => {
      const configPath = path.join(tmpDir, 'invalid.yaml');
      fs.writeFileSync(configPath, 'invalid: yaml: content:');

      expect(() => loadConfig(configPath)).toThrow();
    });

    it('should throw error for non-existent file', () => {
      const configPath = path.join(tmpDir, 'nonexistent.yaml');
      expect(() => loadConfig(configPath)).toThrow();
    });
  });

  describe('parseRevisions', () => {
    it('should parse single revision', () => {
      const result = parseRevisions('1001');
      expect(result).toEqual(['1001']);
    });

    it('should parse multiple revisions', () => {
      const result = parseRevisions('1001,1002,1003');
      expect(result).toEqual(['1001', '1002', '1003']);
    });

    it('should parse revision range', () => {
      const result = parseRevisions('1001-1005');
      expect(result).toEqual(['1001', '1002', '1003', '1004', '1005']);
    });

    it('should parse mixed format', () => {
      const result = parseRevisions('1001,1003-1005,1010');
      expect(result).toEqual(['1001', '1003', '1004', '1005', '1010']);
    });

    it('should handle whitespace', () => {
      const result = parseRevisions('1001, 1002 - 1004, 1010');
      expect(result).toEqual(['1001', '1002', '1003', '1004', '1010']);
    });
  });

  describe('mergeConfig', () => {
    it('should merge CLI options with file config', () => {
      const fileConfig = {
        workspace: '/file/path',
        from: '^/branches/feature',
        defaultStrategy: 'theirs-full' as any,
        verbose: false
      };

      const cliOptions = {
        workspace: '/cli/path',
        verbose: true
      };

      const merged = mergeConfig(fileConfig, cliOptions);
      expect(merged.workspace).toBe('/cli/path');
      expect(merged.from).toBe('^/branches/feature');
      expect(merged.verbose).toBe(true);
    });

    it('should parse revisions from CLI', () => {
      const fileConfig = {
        defaultStrategy: 'theirs-full' as any
      };

      const cliOptions = {
        revisions: '1001-1003'
      };

      const merged = mergeConfig(fileConfig, cliOptions);
      expect(merged.revisions).toEqual(['1001', '1002', '1003']);
    });

    it('should parse ignore paths from CLI', () => {
      const fileConfig = {
        defaultStrategy: 'theirs-full' as any
      };

      const cliOptions = {
        ignore: 'temp/**/*,*.tmp,node_modules/**/*'
      };

      const merged = mergeConfig(fileConfig, cliOptions);
      expect(merged.ignore).toEqual(['temp/**/*', '*.tmp', 'node_modules/**/*']);
    });
  });

  describe('createDefaultConfig', () => {
    it('should create valid default config', () => {
      const config = createDefaultConfig();

      expect(config.workspace).toBe('.');
      expect(config.defaultStrategy).toBe('theirs-full');
      expect(config.ignore).toEqual([]);
      expect(config.conflictRules).toBeDefined();
      expect(config.conflictRules!.length).toBeGreaterThan(0);
    });

    it('should include binary and tree conflict rules', () => {
      const config = createDefaultConfig();
      const ruleNames = config.conflictRules!.map(r => r.name);

      expect(ruleNames).toContain('binary-files');
      expect(ruleNames).toContain('tree-conflicts');
    });
  });
});
