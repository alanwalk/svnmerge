import { ConflictInfo, ResolveResult, Config } from '../types';
import { getConflicts, resolveConflict, collectMergeInfoWithCache, getFileCompleteHistory, applyRevision, MergeInfoEntry } from '../utils/svn';
import { Logger } from '../utils/logger';

/**
 * 冲突解决器
 */
export class ConflictResolver {
  private config: Config;
  private logger: Logger;

  constructor(config: Config, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * 使用 newest 策略解决所有冲突
   */
  async resolveAllWithNewest(cwd: string = process.cwd()): Promise<ResolveResult[]> {
    this.logger.section('扫描冲突');

    // 获取所有冲突
    const conflicts = await getConflicts(cwd);

    if (conflicts.length === 0) {
      this.logger.info('✓ 没有发现冲突');
      return [];
    }

    this.logger.info(`\n发现 ${conflicts.length} 个冲突`);

    if (this.config.dryRun) {
      this.logger.info('\n[DRY RUN] 仅预览，不会实际执行');
    }

    // 创建 mergeinfo 缓存
    const mergeInfoCache = new Map<string, MergeInfoEntry[]>();
    const results: ResolveResult[] = [];

    // 逐个处理冲突
    for (let i = 0; i < conflicts.length; i++) {
      const conflict = conflicts[i];
      this.logger.info(`\n[${i + 1}/${conflicts.length}] ${conflict.path}`);
      this.logger.info(`  类型: ${conflict.type}`);

      if (conflict.description) {
        this.logger.info(`  描述: ${conflict.description}`);
      }

      if (this.config.dryRun) {
        results.push({
          success: true,
          conflict,
          message: '[DRY RUN] 跳过实际执行'
        });
        this.logger.info(`  ✓ [DRY RUN] 跳过实际执行`);
        continue;
      }

      try {
        // 1. 收集 mergeinfo（带缓存）
        this.logger.info(`  正在分析 mergeinfo 和版本历史...`);
        const allMergeInfo = await collectMergeInfoWithCache(
          conflict.path,
          cwd,
          mergeInfoCache
        );

        // 2. 一次性查询文件的完整历史
        const fileHistory = await getFileCompleteHistory(
          conflict.path,
          allMergeInfo,
          cwd
        );

        // 3. 选择最新版本
        const newest = fileHistory[0]; // 已按版本号降序排序

        if (newest) {
          this.logger.info(`  找到 ${fileHistory.length} 个相关版本`);
          if (this.config.verbose) {
            for (const rev of fileHistory.slice(0, 5)) {
              this.logger.info(`    - r${rev.revision} (${rev.branch}) by ${rev.author}`);
            }
            if (fileHistory.length > 5) {
              this.logger.info(`    ... 还有 ${fileHistory.length - 5} 个版本`);
            }
          }

          this.logger.info(`  选择最新版本: r${newest.revision} (${newest.branch})`);

          // 4. 应用该版本
          await applyRevision(conflict.path, newest.revision, cwd);

          results.push({
            success: true,
            conflict,
            message: `已解决 (使用 r${newest.revision} from ${newest.branch})`
          });
          this.logger.info(`  ✓ 已解决`);
        } else {
          // 理论上不应该到这里，因为冲突文件一定有对应的版本
          results.push({
            success: false,
            conflict,
            message: '处理失败',
            error: '未找到任何版本（这不应该发生）'
          });
          this.logger.error(`  ✗ 未找到任何版本`);
        }
      } catch (error: any) {
        results.push({
          success: false,
          conflict,
          message: '处理失败',
          error: error.message
        });
        this.logger.error(`  ✗ 处理失败: ${error.message}`);
      }
    }

    // 总结
    this.logger.section('处理完成');
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    this.logger.info(`✓ 成功: ${successCount}`);
    this.logger.info(`✗ 失败: ${failedCount}`);

    if (failedCount > 0) {
      const failed = results.filter(r => !r.success);
      this.logger.subsection('失败的项目');
      for (const result of failed) {
        this.logger.error(`  - ${result.conflict.path} (${result.conflict.type})`);
        if (result.error) {
          this.logger.error(`    错误: ${result.error}`);
        }
      }
    }

    return results;
  }
}
