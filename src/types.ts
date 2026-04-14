/**
 * 冲突类型
 */
export enum ConflictType {
  TEXT = 'text',
  PROPERTY = 'property',
  TREE = 'tree',
  BINARY = 'binary'
}

/**
 * 冲突解决策略
 */
export enum ResolveStrategy {
  THEIRS_FULL = 'theirs-full',      // 完全接受传入版本
  MINE_FULL = 'mine-full',          // 完全接受本地版本
  WORKING = 'working',              // 使用工作副本
  BASE = 'base',                    // 使用基础版本
  THEIRS_CONFLICT = 'theirs-conflict', // 仅冲突部分接受传入
  MINE_CONFLICT = 'mine-conflict',  // 仅冲突部分接受本地
  SKIP = 'skip',                    // 跳过不处理
  MANUAL = 'manual'                 // 需要手动处理
}

/**
 * 冲突信息
 */
export interface ConflictInfo {
  path: string;
  type: ConflictType;
  status: string;
  description?: string;
  isBinary?: boolean;
}

/**
 * 冲突规则
 */
export interface ConflictRule {
  name: string;
  description?: string;
  // 匹配条件
  match: {
    types?: ConflictType[];        // 匹配的冲突类型
    paths?: string[];              // 匹配的路径模式（支持 glob）
    extensions?: string[];         // 匹配的文件扩展名
    binary?: boolean;              // 是否匹配二进制文件
  };
  // 解决策略
  strategy: ResolveStrategy;
  // 优先级（数字越大优先级越高）
  priority?: number;
}

/**
 * 配置文件结构
 */
export interface Config {
  // 工作目录（默认为当前目录）
  workspace?: string;
  // 源分支 URL
  from?: string;
  // 冲突解决规则
  conflictRules?: ConflictRule[];
  // 默认策略
  defaultStrategy?: ResolveStrategy;
  // 忽略的路径
  ignore?: string[];
  // 日志输出目录
  output?: string;

  // 以下为运行时参数（通过命令行传入）
  revisions?: string[];
  verbose?: boolean;
  dryRun?: boolean;
  autoCommit?: boolean;
}

/**
 * 命令行选项
 */
export interface CliOptions {
  config?: string;
  workspace?: string;
  from?: string;
  revisions?: string;
  output?: string;
  ignore?: string;
  verbose?: boolean;
  dryRun?: boolean;
  commit?: boolean;
}

/**
 * 解决结果
 */
export interface ResolveResult {
  success: boolean;
  conflict: ConflictInfo;
  strategy: ResolveStrategy;
  message: string;
  error?: string;
}
