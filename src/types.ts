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
 * 冲突信息
 */
export interface ConflictInfo {
  path: string;
  type: ConflictType;
  status: string;
  description?: string;
}

/**
 * 配置文件结构
 */
export interface Config {
  // 工作目录（默认为当前目录）
  workspace?: string;
  // 源分支 URL
  from?: string;
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
  message: string;
  error?: string;
}
