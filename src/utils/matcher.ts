import * as path from 'path';
import { minimatch } from 'minimatch';
import { ConflictInfo, ConflictRule, ResolveStrategy } from '../types';
import * as fs from 'fs';

/**
 * 检查文件是否为二进制
 */
export function isBinaryFile(filepath: string): boolean {
  const binaryExtensions = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.svg',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.zip', '.rar', '.7z', '.tar', '.gz',
    '.exe', '.dll', '.so', '.dylib',
    '.mp3', '.mp4', '.avi', '.mov',
    '.bin', '.dat', '.db'
  ]);

  const ext = path.extname(filepath).toLowerCase();
  if (binaryExtensions.has(ext)) {
    return true;
  }

  // 尝试读取文件内容判断
  try {
    if (fs.existsSync(filepath)) {
      const buffer = fs.readFileSync(filepath);
      const chunk = buffer.slice(0, Math.min(8192, buffer.length));
      // 检查是否包含空字节
      return chunk.includes(0);
    }
  } catch {
    // 忽略错误
  }

  return false;
}

/**
 * 匹配冲突规则
 */
export function matchRule(conflict: ConflictInfo, rule: ConflictRule): boolean {
  const { match } = rule;

  // 检查冲突类型
  if (match.types && match.types.length > 0) {
    if (!match.types.includes(conflict.type)) {
      return false;
    }
  }

  // 检查路径模式
  if (match.paths && match.paths.length > 0) {
    const matched = match.paths.some(pattern =>
      minimatch(conflict.path, pattern)
    );
    if (!matched) {
      return false;
    }
  }

  // 检查文件扩展名
  if (match.extensions && match.extensions.length > 0) {
    const ext = path.extname(conflict.path).toLowerCase();
    const matched = match.extensions.some(e =>
      e.toLowerCase() === ext || e.toLowerCase() === ext.substring(1)
    );
    if (!matched) {
      return false;
    }
  }

  // 检查是否为二进制文件
  if (match.binary !== undefined) {
    const isBinary = conflict.isBinary || isBinaryFile(conflict.path);
    if (match.binary !== isBinary) {
      return false;
    }
  }

  return true;
}

/**
 * 查找匹配的规则
 */
export function findMatchingRule(
  conflict: ConflictInfo,
  rules: ConflictRule[]
): ConflictRule | null {
  // 按优先级排序（降序）
  const sortedRules = [...rules].sort((a, b) =>
    (b.priority || 0) - (a.priority || 0)
  );

  for (const rule of sortedRules) {
    if (matchRule(conflict, rule)) {
      return rule;
    }
  }

  return null;
}

/**
 * 获取冲突的解决策略
 */
export function getResolveStrategy(
  conflict: ConflictInfo,
  rules: ConflictRule[],
  defaultStrategy: ResolveStrategy = ResolveStrategy.THEIRS_FULL
): ResolveStrategy {
  const rule = findMatchingRule(conflict, rules);
  return rule ? rule.strategy : defaultStrategy;
}
