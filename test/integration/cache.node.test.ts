/**
 * Cache tests using Node.js native test runner
 * Run with: node --test --require tsx/cjs test/integration/cache.node.test.ts
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { GlobalCache, getGlobalCache } from '../../src/utils/cache';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

describe('GlobalCache with node:sqlite', () => {
  let testCacheDir: string;
  let cache: GlobalCache;

  before(() => {
    testCacheDir = path.join(os.tmpdir(), '.svnmerge-test-' + Date.now());
    if (!fs.existsSync(testCacheDir)) {
      fs.mkdirSync(testCacheDir, { recursive: true });
    }

    // Override HOME to use test directory
    const originalHome = process.env.HOME;
    process.env.HOME = testCacheDir;

    cache = GlobalCache.getInstance();

    // Restore HOME
    process.env.HOME = originalHome;
  });

  after(() => {
    cache.close();

    // Cleanup
    const dbPath = path.join(testCacheDir, '.svnmerge', 'cache.db');
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    const cacheDir = path.join(testCacheDir, '.svnmerge');
    if (fs.existsSync(cacheDir)) {
      fs.rmdirSync(cacheDir);
    }
    if (fs.existsSync(testCacheDir)) {
      fs.rmdirSync(testCacheDir);
    }
  });

  it('should cache and retrieve a single revision entry', () => {
    const entry = {
      repository_root: 'https://svn.example.com/repo',
      branch_path: '/trunk',
      revision: 12345,
      author: 'testuser',
      date: '2026-04-15T10:00:00Z',
      message: 'Test commit',
      paths: JSON.stringify(['/file1.txt', '/file2.txt'])
    };

    cache.cacheRevisionEntry(entry);

    const cached = cache.getRevisionEntry(
      entry.repository_root,
      entry.branch_path,
      entry.revision
    );

    assert.notStrictEqual(cached, null);
    assert.strictEqual(cached?.author, entry.author);
    assert.strictEqual(cached?.message, entry.message);
    assert.strictEqual(cached?.paths, entry.paths);
  });

  it('should cache multiple revision entries', () => {
    const entries = [
      {
        repository_root: 'https://svn.example.com/repo',
        branch_path: '/trunk',
        revision: 12346,
        author: 'user1',
        date: '2026-04-15T10:00:00Z',
        message: 'Commit 1',
        paths: JSON.stringify(['/file1.txt'])
      },
      {
        repository_root: 'https://svn.example.com/repo',
        branch_path: '/trunk',
        revision: 12347,
        author: 'user2',
        date: '2026-04-15T11:00:00Z',
        message: 'Commit 2',
        paths: JSON.stringify(['/file2.txt'])
      }
    ];

    cache.cacheRevisionEntries(entries);

    const cached = cache.getRevisionEntries(
      'https://svn.example.com/repo',
      '/trunk'
    );

    assert.ok(cached.length >= 2);
  });

  it('should return cache statistics', () => {
    const stats = cache.getStats();
    assert.ok(stats.revisionEntries >= 0);
  });

  it('should return null for non-existent entry', () => {
    const cached = cache.getRevisionEntry(
      'https://svn.example.com/nonexistent',
      '/trunk',
      99999
    );

    assert.strictEqual(cached, null);
  });
});
