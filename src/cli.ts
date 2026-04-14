#!/usr/bin/env node

import { Command } from 'commander';
import * as path from 'path';
import { CliOptions, Config } from './types';
import { findConfigFile, loadConfig, mergeConfig, createDefaultConfig } from './utils/config';
import { Logger } from './utils/logger';
import { MergeManager } from './core/manager';

const program = new Command();

program
  .name('svnmerge')
  .description('Customizable SVN merge and conflict resolution tool')
  .version('2.0.0')
  .option('-c, --config <path>', '配置文件路径')
  .option('-w, --workspace <path>', 'SVN 工作目录')
  .option('-f, --from <url>', '源分支 URL')
  .option('-r, --revisions <list>', '版本号列表 (例如: 1001,1002-1005)')
  .option('-o, --output <path>', '日志文件目录')
  .option('-i, --ignore <paths>', '忽略的路径 (逗号分隔)')
  .option('-V, --verbose', '显示详细信息')
  .option('-d, --dry-run', '预览模式，不执行实际操作')
  .option('-C, --commit', '成功后自动提交')
  .action(async (options: CliOptions) => {
    try {
      await runMerge(options);
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

// 初始化配置命令
program
  .command('init')
  .description('创建默认配置文件')
  .option('-o, --output <path>', '配置文件路径', 'svnmerge.yaml')
  .action((options) => {
    const { saveConfig } = require('./utils/config');
    const config = createDefaultConfig();
    saveConfig(options.output, config);
    console.log(`✓ 配置文件已创建: ${options.output}`);
  });

// 解决冲突命令
program
  .command('resolve')
  .description('仅解决现有冲突，不执行合并')
  .option('-c, --config <path>', '配置文件路径')
  .option('-w, --workspace <path>', 'SVN 工作目录')
  .option('-V, --verbose', '显示详细信息')
  .option('-d, --dry-run', '预览模式')
  .action(async (options: CliOptions) => {
    try {
      await runResolve(options);
    } catch (error: any) {
      console.error(`错误: ${error.message}`);
      process.exit(1);
    }
  });

/**
 * 执行合并
 */
async function runMerge(options: CliOptions): Promise<void> {
  // 加载配置
  const config = await loadConfiguration(options);

  // 创建日志记录器
  const logger = createLogger(config);

  // 创建合并管理器并执行
  const manager = new MergeManager(config, logger);
  await manager.execute();
}

/**
 * 仅解决冲突
 */
async function runResolve(options: CliOptions): Promise<void> {
  // 加载配置
  const config = await loadConfiguration(options);

  // 创建日志记录器
  const logger = createLogger(config);

  // 直接解决冲突
  const { ConflictResolver } = require('./core/resolver');
  const resolver = new ConflictResolver(config, logger);
  await resolver.resolveAll(config.workspace || process.cwd());
}

/**
 * 加载配置
 */
async function loadConfiguration(options: CliOptions): Promise<Config> {
  let config: Config;

  if (options.config) {
    // 使用指定的配置文件
    config = loadConfig(options.config);
  } else {
    // 自动查找配置文件
    const configPath = findConfigFile();
    if (configPath) {
      console.log(`使用配置文件: ${configPath}`);
      config = loadConfig(configPath);
    } else {
      // 使用默认配置
      config = createDefaultConfig();
    }
  }

  // 合并命令行选项
  config = mergeConfig(config, options);

  return config;
}

/**
 * 创建日志记录器
 */
function createLogger(config: Config): Logger {
  let logFile: string | undefined;

  if (config.output) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    logFile = path.join(config.output, `svnmerge-${timestamp}.log`);
  }

  return new Logger({
    logFile,
    verbose: config.verbose
  });
}

// 解析命令行参数
program.parse();
