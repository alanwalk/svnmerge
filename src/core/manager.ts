import { Config } from '../types';
import { Logger } from '../utils/logger';
import { merge, update, commit, hasUncommittedChanges, getSvnStatus } from '../utils/svn';
import { ConflictResolver } from './resolver';

/**
 * 合并管理器
 */
export class MergeManager {
  private config: Config;
  private logger: Logger;
  private resolver: ConflictResolver;

  constructor(config: Config, logger: Logger) {
    this.config = config;
    this.logger = logger;
    this.resolver = new ConflictResolver(config, logger);
  }

  /**
   * 执行合并流程
   */
  async execute(): Promise<void> {
    const cwd = this.config.workspace || process.cwd();

    this.logger.section('SVN 合并工具');
    this.logger.info(`工作目录: ${cwd}`);
    this.logger.info(`源分支: ${this.config.from || '(未指定)'}`);
    this.logger.info(`版本: ${this.config.revisions?.join(', ') || '(未指定)'}`);
    this.logger.info(`模式: ${this.config.dryRun ? 'DRY RUN' : '正常'}`);

    // 预检查
    this.logger.section('预检查');

    if (!this.config.dryRun) {
      this.logger.info('检查工作副本状态...');
      const hasChanges = await hasUncommittedChanges(cwd);

      if (hasChanges) {
        this.logger.warn('⚠ 工作副本有未提交的更改');
        const status = await getSvnStatus(cwd);
        this.logger.info(status);
        throw new Error('请先提交或撤销未提交的更改');
      }

      this.logger.info('更新工作副本...');
      await update(cwd);
      this.logger.info('✓ 工作副本已更新');
    }

    // 执行合并
    if (this.config.from && this.config.revisions && this.config.revisions.length > 0) {
      await this.performMerge(cwd);
    }

    // 解决冲突
    const results = await this.resolver.resolveAllWithNewest(cwd);

    // 自动提交
    if (this.config.autoCommit && !this.config.dryRun) {
      const allSuccess = results.every(r => r.success);

      if (allSuccess && results.length > 0) {
        this.logger.section('提交更改');
        const message = this.generateCommitMessage();
        this.logger.info(`提交信息: ${message}`);

        try {
          await commit(message, cwd);
          this.logger.info('✓ 已提交');
        } catch (error: any) {
          this.logger.error(`✗ 提交失败: ${error.message}`);
        }
      } else if (!allSuccess) {
        this.logger.warn('⚠ 存在未解决的冲突，跳过自动提交');
      }
    }

    this.logger.section('完成');
    this.logger.info('所有操作已完成');
  }

  /**
   * 执行合并操作
   */
  private async performMerge(cwd: string): Promise<void> {
    this.logger.section('执行合并');

    const revisions = this.config.revisions!;
    const from = this.config.from!;

    for (let i = 0; i < revisions.length; i++) {
      const revision = revisions[i];
      this.logger.info(`\n[${i + 1}/${revisions.length}] 合并版本 ${revision}`);

      if (this.config.dryRun) {
        this.logger.info(`  [DRY RUN] svn merge -c ${revision} ${from}`);
        continue;
      }

      try {
        await merge(from, revision, cwd);
        this.logger.info(`  ✓ 合并成功`);
      } catch (error: any) {
        this.logger.error(`  ✗ 合并失败: ${error.message}`);
        throw error;
      }
    }
  }

  /**
   * 生成提交信息
   */
  private generateCommitMessage(): string {
    const revisions = this.config.revisions || [];
    const from = this.config.from || 'unknown';

    if (revisions.length === 1) {
      return `Merge r${revisions[0]} from ${from}`;
    } else if (revisions.length > 1) {
      const first = revisions[0];
      const last = revisions[revisions.length - 1];
      return `Merge r${first}-r${last} from ${from}`;
    } else {
      return `Merge from ${from}`;
    }
  }
}
