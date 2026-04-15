/**
 * 全局缓存使用示例
 *
 * 这个文件展示了如何使用全局 SQLite 缓存来加速 SVN 操作
 */

import { getRevisionInfo, getRevisionsInfo } from './svn';
import { getGlobalCache } from './cache';

/**
 * 示例：获取单个 revision 的详细信息
 */
async function exampleGetSingleRevision() {
  const branchPath = '/branches/feature-branch';
  const revision = 12345;
  const cwd = process.cwd();

  // 第一次调用会查询 SVN 并缓存结果
  const info = await getRevisionInfo(branchPath, revision, cwd);

  if (info) {
    console.log(`Revision: ${info.revision}`);
    console.log(`Author: ${info.author}`);
    console.log(`Date: ${info.date}`);
    console.log(`Message: ${info.message}`);
    console.log(`Modified files: ${info.paths.length}`);
    info.paths.forEach(path => console.log(`  - ${path}`));
  }

  // 第二次调用会直接从缓存读取，速度更快
  const cachedInfo = await getRevisionInfo(branchPath, revision, cwd);
  console.log('从缓存读取:', cachedInfo);
}

/**
 * 示例：批量获取多个 revision 的信息
 */
async function exampleGetMultipleRevisions() {
  const branchPath = '/branches/feature-branch';
  const revisions = [12345, 12346, 12347, 12348, 12349];
  const cwd = process.cwd();

  // 批量查询，自动使用缓存
  const infos = await getRevisionsInfo(branchPath, revisions, cwd);

  console.log(`获取到 ${infos.length} 个 revision 的信息`);
  infos.forEach(info => {
    console.log(`\nRevision ${info.revision} by ${info.author}`);
    console.log(`Message: ${info.message}`);
    console.log(`Files: ${info.paths.length}`);
  });
}

/**
 * 示例：查看缓存统计信息
 */
function exampleGetCacheStats() {
  const cache = getGlobalCache();
  const stats = cache.getStats();

  console.log('缓存统计:');
  console.log(`  - Revision 条目数: ${stats.revisionEntries}`);
}

/**
 * 示例：清理过期缓存
 */
function exampleCleanCache() {
  const cache = getGlobalCache();

  // 清理 30 天以前的缓存
  const deleted = cache.cleanExpiredCache(30);
  console.log(`清理了 ${deleted} 条过期缓存`);
}

// 导出示例函数
export {
  exampleGetSingleRevision,
  exampleGetMultipleRevisions,
  exampleGetCacheStats,
  exampleCleanCache
};
