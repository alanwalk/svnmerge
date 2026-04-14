import { exec } from 'child_process';
import { promisify } from 'util';
import { ConflictInfo, ConflictType } from '../types';

const execAsync = promisify(exec);

/**
 * 执行 SVN 命令
 */
export async function runSvnCommand(
  command: string,
  cwd: string = process.cwd()
): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });
    return { stdout, stderr };
  } catch (error: any) {
    throw new Error(`SVN command failed: ${error.message}`);
  }
}

/**
 * 获取 SVN 状态
 */
export async function getSvnStatus(cwd: string = process.cwd()): Promise<string> {
  const { stdout } = await runSvnCommand('svn status', cwd);
  return stdout;
}

/**
 * 解析冲突文件
 */
export async function getConflicts(cwd: string = process.cwd()): Promise<ConflictInfo[]> {
  const status = await getSvnStatus(cwd);
  const conflicts: ConflictInfo[] = [];
  const lines = status.split('\n');

  let currentTreeConflict: ConflictInfo | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    // 检测内容冲突 (C 开头)
    if (line.startsWith('C')) {
      const parts = line.split(/\s+/);
      if (parts.length >= 2) {
        const filepath = parts[parts.length - 1].trim();
        const hasPropertyConflict = line.includes(' C');

        conflicts.push({
          path: filepath,
          type: hasPropertyConflict ? ConflictType.PROPERTY : ConflictType.TEXT,
          status: 'C',
          description: hasPropertyConflict ? '属性冲突' : '内容冲突'
        });
      }
    }
    // 检测 tree conflict 描述
    else if (line.trim().startsWith('>')) {
      const description = line.trim().substring(1).trim();
      if (currentTreeConflict) {
        currentTreeConflict.description = description;
        conflicts.push(currentTreeConflict);
        currentTreeConflict = null;
      }
    }
    // 检测 tree conflict 路径
    else if (line.includes('      ') && line.toLowerCase().includes('local')) {
      const match = line.match(/\s+([^\s]+)\s+/);
      if (match) {
        currentTreeConflict = {
          path: match[1].trim(),
          type: ConflictType.TREE,
          status: 'C',
          description: 'Tree conflict'
        };
      }
    }
  }

  return conflicts;
}

/**
 * 解决冲突
 */
export async function resolveConflict(
  filepath: string,
  strategy: string,
  cwd: string = process.cwd()
): Promise<void> {
  await runSvnCommand(`svn resolve --accept ${strategy} "${filepath}"`, cwd);
}

/**
 * 执行合并
 */
export async function merge(
  from: string,
  revision: string,
  cwd: string = process.cwd()
): Promise<void> {
  await runSvnCommand(`svn merge -c ${revision} ${from}`, cwd);
}

/**
 * 更新工作副本
 */
export async function update(cwd: string = process.cwd()): Promise<void> {
  await runSvnCommand('svn update', cwd);
}

/**
 * 提交更改
 */
export async function commit(
  message: string,
  cwd: string = process.cwd()
): Promise<void> {
  await runSvnCommand(`svn commit -m "${message}"`, cwd);
}

/**
 * 检查是否有未提交的更改
 */
export async function hasUncommittedChanges(cwd: string = process.cwd()): Promise<boolean> {
  const status = await getSvnStatus(cwd);
  return status.trim().length > 0;
}
