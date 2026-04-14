import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * 全局缓存目录
 */
const CACHE_DIR = path.join(os.homedir(), '.svnmerge');
const CACHE_DB_PATH = path.join(CACHE_DIR, 'cache.db');

/**
 * SVN Revision 缓存条目
 * 缓存每个 revision 的完整信息，用于合并前预览
 */
export interface RevisionCacheEntry {
  repository_root: string;  // 仓库根 URL
  branch_path: string;      // 分支路径（相对于仓库根）
  revision: number;         // 版本号
  author: string;           // 作者
  date: string;             // 日期（ISO 格式）
  message: string;          // 提交信息
  paths: string;            // 修改的文件列表（JSON 数组）
  cached_at: number;        // 缓存时间戳
}

/**
 * 全局 SQLite 缓存管理器
 */
export class GlobalCache {
  private db: Database.Database;
  private static instance: GlobalCache | null = null;

  private constructor() {
    // 确保缓存目录存在
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }

    // 打开数据库
    this.db = new Database(CACHE_DB_PATH);
    this.initTables();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): GlobalCache {
    if (!GlobalCache.instance) {
      GlobalCache.instance = new GlobalCache();
    }
    return GlobalCache.instance;
  }

  /**
   * 初始化数据库表
   */
  private initTables(): void {
    // SVN Revision 缓存表（以 repository_root + branch_path + revision 为唯一键）
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS svn_revision_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        repository_root TEXT NOT NULL,
        branch_path TEXT NOT NULL,
        revision INTEGER NOT NULL,
        author TEXT NOT NULL,
        date TEXT NOT NULL,
        message TEXT NOT NULL,
        paths TEXT NOT NULL,
        cached_at INTEGER NOT NULL,
        UNIQUE(repository_root, branch_path, revision)
      )
    `);

    // 创建索引以加速查询
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_revision_lookup
      ON svn_revision_cache(repository_root, branch_path, revision)
    `);
  }

  /**
   * 缓存 SVN Revision 条目
   */
  public cacheRevisionEntry(entry: Omit<RevisionCacheEntry, 'cached_at'>): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO svn_revision_cache
      (repository_root, branch_path, revision, author, date, message, paths, cached_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      entry.repository_root,
      entry.branch_path,
      entry.revision,
      entry.author,
      entry.date,
      entry.message,
      entry.paths,
      Date.now()
    );
  }

  /**
   * 批量缓存 SVN Revision 条目
   */
  public cacheRevisionEntries(entries: Omit<RevisionCacheEntry, 'cached_at'>[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO svn_revision_cache
      (repository_root, branch_path, revision, author, date, message, paths, cached_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction((entries: Omit<RevisionCacheEntry, 'cached_at'>[]) => {
      const now = Date.now();
      for (const entry of entries) {
        stmt.run(
          entry.repository_root,
          entry.branch_path,
          entry.revision,
          entry.author,
          entry.date,
          entry.message,
          entry.paths,
          now
        );
      }
    });

    transaction(entries);
  }

  /**
   * 查询单个 Revision 缓存
   */
  public getRevisionEntry(
    repositoryRoot: string,
    branchPath: string,
    revision: number
  ): RevisionCacheEntry | null {
    const stmt = this.db.prepare(`
      SELECT * FROM svn_revision_cache
      WHERE repository_root = ? AND branch_path = ? AND revision = ?
    `);

    const result = stmt.get(repositoryRoot, branchPath, revision) as RevisionCacheEntry | undefined;
    return result || null;
  }

  /**
   * 批量查询 Revision 缓存
   */
  public getRevisionEntries(
    repositoryRoot: string,
    branchPath: string,
    revisions?: number[]
  ): RevisionCacheEntry[] {
    let query = `
      SELECT * FROM svn_revision_cache
      WHERE repository_root = ? AND branch_path = ?
    `;

    const params: any[] = [repositoryRoot, branchPath];

    if (revisions && revisions.length > 0) {
      const placeholders = revisions.map(() => '?').join(',');
      query += ` AND revision IN (${placeholders})`;
      params.push(...revisions);
    }

    query += ` ORDER BY revision DESC`;

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as RevisionCacheEntry[];
  }

  /**
   * 清理过期缓存（默认保留 30 天）
   */
  public cleanExpiredCache(maxAgeDays: number = 30): number {
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - maxAgeMs;

    const stmt = this.db.prepare(`
      DELETE FROM svn_revision_cache WHERE cached_at < ?
    `);
    const result = stmt.run(cutoffTime);

    return result.changes;
  }

  /**
   * 获取缓存统计信息
   */
  public getStats(): { revisionEntries: number } {
    const count = this.db.prepare('SELECT COUNT(*) as count FROM svn_revision_cache').get() as { count: number };

    return {
      revisionEntries: count.count
    };
  }

  /**
   * 关闭数据库连接
   */
  public close(): void {
    this.db.close();
    GlobalCache.instance = null;
  }
}

/**
 * 获取全局缓存实例
 */
export function getGlobalCache(): GlobalCache {
  return GlobalCache.getInstance();
}
