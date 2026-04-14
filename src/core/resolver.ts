import { ConflictInfo, ConflictRule, ResolveStrategy, ResolveResult, Config } from '../types';
import { getConflicts, resolveConflict } from '../utils/svn';
import { getResolveStrategy, isBinaryFile } from '../utils/matcher';
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
   * 解决所有冲突
   */
  async resolveAll(cwd: string = process.cwd()): Promise<ResolveResult[]> {
    this.logger.section('扫描冲突');

    // 获取所有冲突
    const conflicts = await getConflicts(cwd);

    if (conflicts.length === 0) {
      this.logger.info('✓ 没有发现冲突');
      return [];
    }

    // 标记二进制文件
    for (const conflict of conflicts) {
      conflict.isBinary = isBinaryFile(conflict.path);
    }

    // 统计冲突类型
    const typeCount = new Map<string, number>();
    for (const conflict of conflicts) {
      const count = typeCount.get(conflict.type) || 0;
      typeCount.set(conflict.type, count + 1);
    }

    this.logger.info(`\n发现 ${conflicts.length} 个冲突:`);
    for (const [type, count] of typeCount) {
      this.logger.info(`  - ${type}: ${count} 个`);
    }

    // 显示将要使用的策略
    this.logger.subsection('冲突解决策略');
    const strategyMap = new Map<ResolveStrategy, ConflictInfo[]>();

    for (const conflict of conflicts) {
      const strategy = getResolveStrategy(
        conflict,
        this.config.conflictRules || [],
        this.config.defaultStrategy
      );

      if (!strategyMap.has(strategy)) {
        strategyMap.set(strategy, []);
      }
      strategyMap.get(strategy)!.push(conflict);
    }

    for (const [strategy, items] of strategyMap) {
      this.logger.info(`\n${strategy}: ${items.length} 个文件`);
      if (this.config.verbose) {
        for (const item of items) {
          this.logger.info(`  - ${item.path}`);
        }
      }
    }

    // 询问确认
    if (!this.config.dryRun) {
      this.logger.subsection('确认');
      // 在实际应用中，这里应该使用 readline 或类似库来获取用户输入
      // 为了简化，这里假设用户确认
      this.logger.info('将开始解决冲突...');
    } else {
      this.logger.info('\n[DRY RUN] 仅预览，不会实际执行');
    }

    // 解决冲突
    this.logger.section('解决冲突');
    const results: ResolveResult[] = [];

    for (let i = 0; i < conflicts.length; i++) {
      const conflict = conflicts[i];
      this.logger.info(`\n[${i + 1}/${conflicts.length}] ${conflict.path}`);
      this.logger.info(`  类型: ${conflict.type}`);

      if (conflict.description) {
        this.logger.info(`  描述: ${conflict.description}`);
      }

      if (conflict.isBinary) {
        this.logger.info(`  检测: 二进制文件`);
      }

      const strategy = getResolveStrategy(
        conflict,
        this.config.conflictRules || [],
        this.config.defaultStrategy
      );

      this.logger.info(`  策略: ${strategy}`);

      let result: ResolveResult;

      if (this.config.dryRun) {
        result = {
          success: true,
          conflict,
          strategy,
          message: '[DRY RUN] 跳过实际执行'
        };
        this.logger.info(`  ✓ ${result.message}`);
      } else if (strategy === ResolveStrategy.SKIP) {
        result = {
          success: true,
          conflict,
          strategy,
          message: '跳过处理'
        };
        this.logger.info(`  ⊘ ${result.message}`);
      } else if (strategy === ResolveStrategy.MANUAL) {
        result = {
          success: false,
          conflict,
          strategy,
          message: '需要手动处理',
          error: '此冲突被标记为需要手动处理'
        };
        this.logger.warn(`  ⚠ ${result.message}`);
      } else {
        try {
          await resolveConflict(conflict.path, strategy, cwd);
          result = {
            success: true,
            conflict,
            strategy,
            message: '已解决'
          };
          this.logger.info(`  ✓ ${result.message}`);
        } catch (error: any) {
          result = {
            success: false,
            conflict,
            strategy,
            message: '解决失败',
            error: error.message
          };
          this.logger.error(`  ✗ ${result.message}: ${error.message}`);
        }
      }

      results.push(result);
    }

    // 总结
    this.logger.section('处理完成');
    const successCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;

    this.logger.info(`✓ 成功: ${successCount}`);
    this.logger.info(`✗ 失败: ${failedCount}`);

    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
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
