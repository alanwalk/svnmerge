import { describe, it, expect } from 'vitest';
import { isBinaryFile, matchRule, findMatchingRule, getResolveStrategy } from '../../src/utils/matcher';
import { ConflictInfo, ConflictRule, ConflictType, ResolveStrategy } from '../../src/types';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('matcher utils', () => {
  describe('isBinaryFile', () => {
    it('should detect binary files by extension', () => {
      expect(isBinaryFile('image.png')).toBe(true);
      expect(isBinaryFile('document.pdf')).toBe(true);
      expect(isBinaryFile('archive.zip')).toBe(true);
      expect(isBinaryFile('video.mp4')).toBe(true);
    });

    it('should detect text files by extension', () => {
      expect(isBinaryFile('file.ts')).toBe(false);
      expect(isBinaryFile('file.js')).toBe(false);
      expect(isBinaryFile('file.txt')).toBe(false);
      expect(isBinaryFile('file.md')).toBe(false);
    });

    it('should detect binary files by content', () => {
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
      const binaryFile = path.join(tmpDir, 'binary.unknown');
      const textFile = path.join(tmpDir, 'text.txt');

      // Create binary file with null bytes
      fs.writeFileSync(binaryFile, Buffer.from([0x00, 0x01, 0x02, 0x03]));
      expect(isBinaryFile(binaryFile)).toBe(true);

      // Create text file
      fs.writeFileSync(textFile, 'Hello World');
      expect(isBinaryFile(textFile)).toBe(false);

      // Cleanup
      fs.rmSync(tmpDir, { recursive: true });
    });
  });

  describe('matchRule', () => {
    it('should match by conflict type', () => {
      const conflict: ConflictInfo = {
        path: 'file.ts',
        type: ConflictType.TEXT,
        status: 'C'
      };

      const rule: ConflictRule = {
        name: 'text-rule',
        match: {
          types: [ConflictType.TEXT]
        },
        strategy: ResolveStrategy.THEIRS_FULL
      };

      expect(matchRule(conflict, rule)).toBe(true);
    });

    it('should not match different conflict type', () => {
      const conflict: ConflictInfo = {
        path: 'file.ts',
        type: ConflictType.TEXT,
        status: 'C'
      };

      const rule: ConflictRule = {
        name: 'tree-rule',
        match: {
          types: [ConflictType.TREE]
        },
        strategy: ResolveStrategy.WORKING
      };

      expect(matchRule(conflict, rule)).toBe(false);
    });

    it('should match by path pattern', () => {
      const conflict: ConflictInfo = {
        path: 'src/core/file.ts',
        type: ConflictType.TEXT,
        status: 'C'
      };

      const rule: ConflictRule = {
        name: 'core-rule',
        match: {
          paths: ['src/core/**/*']
        },
        strategy: ResolveStrategy.MANUAL
      };

      expect(matchRule(conflict, rule)).toBe(true);
    });

    it('should match by extension', () => {
      const conflict: ConflictInfo = {
        path: 'image.png',
        type: ConflictType.TEXT,
        status: 'C'
      };

      const rule: ConflictRule = {
        name: 'image-rule',
        match: {
          extensions: ['.png', '.jpg']
        },
        strategy: ResolveStrategy.THEIRS_FULL
      };

      expect(matchRule(conflict, rule)).toBe(true);
    });

    it('should match by binary flag', () => {
      const conflict: ConflictInfo = {
        path: 'file.png',
        type: ConflictType.TEXT,
        status: 'C',
        isBinary: true
      };

      const rule: ConflictRule = {
        name: 'binary-rule',
        match: {
          binary: true
        },
        strategy: ResolveStrategy.THEIRS_FULL
      };

      expect(matchRule(conflict, rule)).toBe(true);
    });

    it('should match multiple conditions', () => {
      const conflict: ConflictInfo = {
        path: 'src/core/image.png',
        type: ConflictType.TEXT,
        status: 'C',
        isBinary: true
      };

      const rule: ConflictRule = {
        name: 'complex-rule',
        match: {
          types: [ConflictType.TEXT],
          paths: ['src/**/*'],
          binary: true
        },
        strategy: ResolveStrategy.THEIRS_FULL
      };

      expect(matchRule(conflict, rule)).toBe(true);
    });
  });

  describe('findMatchingRule', () => {
    const rules: ConflictRule[] = [
      {
        name: 'low-priority',
        match: { types: [ConflictType.TEXT] },
        strategy: ResolveStrategy.THEIRS_FULL,
        priority: 10
      },
      {
        name: 'high-priority',
        match: { paths: ['src/**/*'] },
        strategy: ResolveStrategy.MANUAL,
        priority: 100
      },
      {
        name: 'medium-priority',
        match: { extensions: ['.ts'] },
        strategy: ResolveStrategy.MINE_FULL,
        priority: 50
      }
    ];

    it('should return highest priority matching rule', () => {
      const conflict: ConflictInfo = {
        path: 'src/file.ts',
        type: ConflictType.TEXT,
        status: 'C'
      };

      const rule = findMatchingRule(conflict, rules);
      expect(rule).toBeDefined();
      expect(rule?.name).toBe('high-priority');
    });

    it('should return null if no rule matches', () => {
      const conflict: ConflictInfo = {
        path: 'other/file.txt',
        type: ConflictType.TREE,
        status: 'C'
      };

      const rule = findMatchingRule(conflict, rules);
      expect(rule).toBeNull();
    });
  });

  describe('getResolveStrategy', () => {
    const rules: ConflictRule[] = [
      {
        name: 'binary-rule',
        match: { binary: true },
        strategy: ResolveStrategy.THEIRS_FULL,
        priority: 100
      },
      {
        name: 'text-rule',
        match: { types: [ConflictType.TEXT] },
        strategy: ResolveStrategy.MINE_FULL,
        priority: 50
      }
    ];

    it('should return strategy from matching rule', () => {
      const conflict: ConflictInfo = {
        path: 'image.png',
        type: ConflictType.TEXT,
        status: 'C',
        isBinary: true
      };

      const strategy = getResolveStrategy(conflict, rules);
      expect(strategy).toBe(ResolveStrategy.THEIRS_FULL);
    });

    it('should return default strategy if no rule matches', () => {
      const conflict: ConflictInfo = {
        path: 'file.xml',
        type: ConflictType.PROPERTY,
        status: 'C'
      };

      const strategy = getResolveStrategy(conflict, rules, ResolveStrategy.WORKING);
      expect(strategy).toBe(ResolveStrategy.WORKING);
    });
  });
});
