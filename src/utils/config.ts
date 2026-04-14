import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';
import { Config } from '../types';

/**
 * 查找配置文件
 */
export function findConfigFile(startDir: string = process.cwd()): string | null {
  let currentDir = startDir;
  const configNames = ['svnmerge.yaml', 'svnmerge.yml', '.svnmerge.yaml'];

  while (true) {
    for (const name of configNames) {
      const configPath = path.join(currentDir, name);
      if (fs.existsSync(configPath)) {
        return configPath;
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break; // 已到达根目录
    }
    currentDir = parentDir;
  }

  return null;
}

/**
 * 加载配置文件
 */
export function loadConfig(configPath: string): Config {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const config = yaml.parse(content) as Config;
    return config;
  } catch (error: any) {
    throw new Error(`Failed to load config: ${error.message}`);
  }
}

/**
 * 保存配置文件
 */
export function saveConfig(configPath: string, config: Config): void {
  try {
    const content = yaml.stringify(config);
    fs.writeFileSync(configPath, content, 'utf-8');
  } catch (error: any) {
    throw new Error(`Failed to save config: ${error.message}`);
  }
}

/**
 * 合并配置（命令行选项覆盖配置文件）
 */
export function mergeConfig(fileConfig: Config, cliOptions: any): Config {
  return {
    ...fileConfig,
    workspace: cliOptions.workspace || fileConfig.workspace,
    from: cliOptions.from || fileConfig.from,
    revisions: cliOptions.revisions
      ? parseRevisions(cliOptions.revisions)
      : fileConfig.revisions,
    output: cliOptions.output || fileConfig.output,
    ignore: cliOptions.ignore
      ? cliOptions.ignore.split(',').map((s: string) => s.trim())
      : fileConfig.ignore,
    verbose: cliOptions.verbose !== undefined ? cliOptions.verbose : fileConfig.verbose,
    dryRun: cliOptions.dryRun !== undefined ? cliOptions.dryRun : fileConfig.dryRun,
    autoCommit: cliOptions.commit !== undefined ? cliOptions.commit : fileConfig.autoCommit
  };
}

/**
 * 解析版本号字符串
 */
export function parseRevisions(revisionStr: string): string[] {
  const revisions: string[] = [];
  const parts = revisionStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      // 范围：1001-1005
      const [start, end] = trimmed.split('-').map(s => parseInt(s.trim()));
      for (let i = start; i <= end; i++) {
        revisions.push(i.toString());
      }
    } else {
      // 单个版本号
      revisions.push(trimmed);
    }
  }

  return revisions;
}

/**
 * 创建默认配置
 */
export function createDefaultConfig(): Config {
  return {
    workspace: '.',
    defaultStrategy: 'theirs-full' as any,
    ignore: [],
    conflictRules: [
      {
        name: 'binary-files',
        description: '二进制文件使用 theirs-full',
        match: {
          binary: true
        },
        strategy: 'theirs-full' as any,
        priority: 100
      },
      {
        name: 'tree-conflicts',
        description: 'Tree 冲突使用 working',
        match: {
          types: ['tree' as any]
        },
        strategy: 'working' as any,
        priority: 90
      }
    ]
  };
}
