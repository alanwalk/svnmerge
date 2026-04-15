import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { ConflictInfo, ConflictType } from '../types';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { getGlobalCache } from './cache';

const execAsync = promisify(exec);
const DEBUG_CONFIG_DIR = path.join(os.homedir(), '.svnmerge');
const DEBUG_LOG_FILE = path.join(DEBUG_CONFIG_DIR, 'svn-command-debug.log');
let debugConsoleStarted = false;

function isWindows(): boolean {
  return process.platform === 'win32';
}

function shouldShowNativeCommandWindow(): boolean {
  return isWindows() && process.env.SVNMERGE_SHOW_COMMAND_WINDOW === '1';
}

function shouldOpenDebugConsole(): boolean {
  return isWindows() && process.env.SVNMERGE_DEBUG_CONSOLE === '1';
}

function appendDebugLog(message: string): void {
  if (!shouldOpenDebugConsole()) {
    return;
  }

  if (!fs.existsSync(DEBUG_CONFIG_DIR)) {
    fs.mkdirSync(DEBUG_CONFIG_DIR, { recursive: true });
  }

  fs.appendFileSync(DEBUG_LOG_FILE, message, 'utf-8');
}

function ensureDebugConsole(): void {
  if (!shouldOpenDebugConsole() || debugConsoleStarted) {
    return;
  }

  if (!fs.existsSync(DEBUG_CONFIG_DIR)) {
    fs.mkdirSync(DEBUG_CONFIG_DIR, { recursive: true });
  }

  if (!fs.existsSync(DEBUG_LOG_FILE)) {
    fs.writeFileSync(DEBUG_LOG_FILE, '', 'utf-8');
  }

  const psPath = DEBUG_LOG_FILE.replace(/'/g, "''");
  const command =
    `$host.UI.RawUI.WindowTitle = 'SVN Merge Command Debug'; ` +
    `Get-Content -LiteralPath '${psPath}' -Wait`;

  const child = spawn('powershell.exe', ['-NoLogo', '-NoExit', '-Command', command], {
    detached: true,
    stdio: 'ignore',
    windowsHide: false
  });

  child.unref();
  debugConsoleStarted = true;
}

/**
 * 执行 SVN 命令
 */
export async function runSvnCommand(
  command: string,
  cwd: string = process.cwd()
): Promise<{ stdout: string; stderr: string }> {
  try {
    ensureDebugConsole();

    const startedAt = new Date().toISOString();
    appendDebugLog(`[${startedAt}] $ ${command}\n`);

    // 构建 exec 选项
    const execOptions: any = { cwd };

    // Windows 特殊处理
    if (isWindows()) {
      execOptions.shell = true;
      if (!shouldShowNativeCommandWindow()) {
        execOptions.windowsHide = true;
      }
    }

    const { stdout, stderr } = await execAsync(command, execOptions);

    if (stdout) {
      appendDebugLog(`${stdout}${stdout.endsWith('\n') ? '' : '\n'}`);
    }

    if (stderr) {
      appendDebugLog(`${stderr}${stderr.endsWith('\n') ? '' : '\n'}`);
    }

    appendDebugLog(`[${new Date().toISOString()}] exit 0\n\n`);
    return { stdout, stderr };
  } catch (error: any) {
    const stdout = error.stdout || '';
    const stderr = error.stderr || '';

    if (stdout) {
      appendDebugLog(`${stdout}${stdout.endsWith('\n') ? '' : '\n'}`);
    }

    if (stderr) {
      appendDebugLog(`${stderr}${stderr.endsWith('\n') ? '' : '\n'}`);
    }

    appendDebugLog(
      `[${new Date().toISOString()}] exit ${error.code ?? 'unknown'}: ${error.message}\n\n`
    );
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

/**
 * 合并信息条目
 */
export interface MergeInfoEntry {
  path: string;           // 分支路径
  revisions: number[];    // 已合并的版本号列表
}

/**
 * Revision 详细信息（用于合并预览）
 */
export interface RevisionInfo {
  revision: number;
  author: string;
  date: Date;
  message: string;
  paths: string[];        // 修改的文件列表
}

/**
 * 获取指定 revision 的详细信息（带全局缓存）
 */
export async function getRevisionInfo(
  branchPath: string,
  revision: number,
  cwd: string = process.cwd()
): Promise<RevisionInfo | null> {
  try {
    // 获取仓库根 URL
    const repositoryRoot = await getRepositoryRoot(cwd);
    const cache = getGlobalCache();

    // 先尝试从缓存获取
    const cached = cache.getRevisionEntry(repositoryRoot, branchPath, revision);
    if (cached) {
      return {
        revision: cached.revision,
        author: cached.author,
        date: new Date(cached.date),
        message: cached.message,
        paths: JSON.parse(cached.paths)
      };
    }

    // 缓存未命中，查询 SVN
    const fullPath = branchPath;
    const { stdout } = await runSvnCommand(
      `svn log --xml -v -r${revision} "${fullPath}"`,
      cwd
    );

    // 解析 XML
    const logentryMatch = stdout.match(/<logentry[^>]*revision="(\d+)"[^>]*>([\s\S]*?)<\/logentry>/);
    if (!logentryMatch) {
      return null;
    }

    const content = logentryMatch[2];
    const authorMatch = content.match(/<author>([^<]+)<\/author>/);
    const dateMatch = content.match(/<date>([^<]+)<\/date>/);
    const messageMatch = content.match(/<msg>([^<]*)<\/msg>/);

    // 解析文件列表
    const paths: string[] = [];
    const pathMatches = content.matchAll(/<path[^>]*>([^<]+)<\/path>/g);
    for (const match of pathMatches) {
      paths.push(match[1]);
    }

    const revisionInfo: RevisionInfo = {
      revision,
      author: authorMatch ? authorMatch[1] : 'unknown',
      date: dateMatch ? new Date(dateMatch[1]) : new Date(),
      message: messageMatch ? messageMatch[1] : '',
      paths
    };

    // 缓存到全局数据库
    cache.cacheRevisionEntry({
      repository_root: repositoryRoot,
      branch_path: branchPath,
      revision,
      author: revisionInfo.author,
      date: revisionInfo.date.toISOString(),
      message: revisionInfo.message,
      paths: JSON.stringify(paths)
    });

    return revisionInfo;
  } catch (error: any) {
    return null;
  }
}

/**
 * 批量获取 revision 信息（带全局缓存）
 */
export async function getRevisionsInfo(
  branchPath: string,
  revisions: number[],
  cwd: string = process.cwd()
): Promise<RevisionInfo[]> {
  try {
    // 获取仓库根 URL
    const repositoryRoot = await getRepositoryRoot(cwd);
    const cache = getGlobalCache();

    // 先尝试从缓存获取
    const cachedEntries = cache.getRevisionEntries(repositoryRoot, branchPath, revisions);
    const cachedRevisions = new Set(cachedEntries.map(e => e.revision));
    const missingRevisions = revisions.filter(r => !cachedRevisions.has(r));

    const result: RevisionInfo[] = [];

    // 添加缓存命中的数据
    for (const cached of cachedEntries) {
      result.push({
        revision: cached.revision,
        author: cached.author,
        date: new Date(cached.date),
        message: cached.message,
        paths: JSON.parse(cached.paths)
      });
    }

    // 如果有缺失的 revision，批量查询
    if (missingRevisions.length > 0) {
      const fullPath = branchPath;
      const revisionRanges = missingRevisions.join(',');
      const { stdout } = await runSvnCommand(
        `svn log --xml -v -r${revisionRanges} "${fullPath}"`,
        cwd
      );

      // 解析 XML
      const logentryMatches = stdout.matchAll(/<logentry[^>]*revision="(\d+)"[^>]*>([\s\S]*?)<\/logentry>/g);

      const entriesToCache: Array<{
        repository_root: string;
        branch_path: string;
        revision: number;
        author: string;
        date: string;
        message: string;
        paths: string;
      }> = [];

      for (const match of logentryMatches) {
        const revision = parseInt(match[1], 10);
        const content = match[2];

        const authorMatch = content.match(/<author>([^<]+)<\/author>/);
        const dateMatch = content.match(/<date>([^<]+)<\/date>/);
        const messageMatch = content.match(/<msg>([^<]*)<\/msg>/);

        // 解析文件列表
        const paths: string[] = [];
        const pathMatches = content.matchAll(/<path[^>]*>([^<]+)<\/path>/g);
        for (const pathMatch of pathMatches) {
          paths.push(pathMatch[1]);
        }

        const author = authorMatch ? authorMatch[1] : 'unknown';
        const date = dateMatch ? new Date(dateMatch[1]) : new Date();
        const message = messageMatch ? messageMatch[1] : '';

        result.push({
          revision,
          author,
          date,
          message,
          paths
        });

        // 准备缓存数据
        entriesToCache.push({
          repository_root: repositoryRoot,
          branch_path: branchPath,
          revision,
          author,
          date: date.toISOString(),
          message,
          paths: JSON.stringify(paths)
        });
      }

      // 批量缓存新查询的数据
      if (entriesToCache.length > 0) {
        cache.cacheRevisionEntries(entriesToCache);
      }
    }

    // 按版本号排序
    result.sort((a, b) => a.revision - b.revision);

    return result;
  } catch (error: any) {
    return [];
  }
}

/**
 * 文件修改记录
 */
export interface FileRevisionInfo {
  revision: number;
  author: string;
  date: Date;
  message: string;
  branch: string;         // 来自哪个分支
}

/**
 * 获取目录的 mergeinfo（不使用全局缓存，因为 mergeinfo 可能在工具外被修改）
 */
export async function getMergeInfo(cwd: string = process.cwd()): Promise<MergeInfoEntry[]> {
  try {
    const { stdout } = await runSvnCommand('svn propget svn:mergeinfo .', cwd);

    if (!stdout.trim()) {
      return [];
    }

    const entries: MergeInfoEntry[] = [];
    const lines = stdout.trim().split('\n');

    for (const line of lines) {
      // 格式: /branches/feature:1001-1005,1010,1015-1020
      const match = line.match(/^(.+?):(.+)$/);
      if (match) {
        const branchPath = match[1].trim();
        const revisionRanges = match[2].trim();
        const revisions: number[] = [];

        // 解析版本范围
        const parts = revisionRanges.split(',');
        for (const part of parts) {
          if (part.includes('-')) {
            // 范围: 1001-1005
            const [start, end] = part.split('-').map(r => parseInt(r.trim(), 10));
            for (let r = start; r <= end; r++) {
              revisions.push(r);
            }
          } else {
            // 单个版本: 1010
            revisions.push(parseInt(part.trim(), 10));
          }
        }

        entries.push({ path: branchPath, revisions });
      }
    }

    return entries;
  } catch (error: any) {
    // 如果没有 mergeinfo 属性，返回空数组
    return [];
  }
}

/**
 * 获取仓库根 URL
 */
async function getRepositoryRoot(cwd: string): Promise<string> {
  try {
    const { stdout } = await runSvnCommand('svn info', cwd);
    const rootMatch = stdout.match(/^Repository Root: (.+)$/m);
    if (rootMatch) {
      return rootMatch[1].trim();
    }
  } catch {
    // 不是 SVN 工作副本
  }
  throw new Error('Not a SVN working copy');
}

/**
 * 检查是否是仓库根目录
 */
async function isRepositoryRoot(cwd: string): Promise<boolean> {
  try {
    const { stdout } = await runSvnCommand('svn info', cwd);
    const urlMatch = stdout.match(/^URL: (.+)$/m);
    const rootMatch = stdout.match(/^Repository Root: (.+)$/m);

    if (urlMatch && rootMatch) {
      return urlMatch[1] === rootMatch[1];
    }
  } catch {
    // 不是 SVN 工作副本
  }
  return false;
}

/**
 * 合并 mergeinfo（去重）
 */
function mergeMergeInfo(
  target: MergeInfoEntry[],
  source: MergeInfoEntry[]
): void {
  for (const entry of source) {
    const existing = target.find(e => e.path === entry.path);
    if (existing) {
      // 合并版本号并去重
      const combined = [...existing.revisions, ...entry.revisions];
      existing.revisions = [...new Set(combined)].sort((a, b) => b - a);
    } else {
      target.push({
        path: entry.path,
        revisions: [...entry.revisions].sort((a, b) => b - a)
      });
    }
  }
}

/**
 * 向上递归收集 mergeinfo（带缓存）
 */
export async function collectMergeInfoWithCache(
  filepath: string,
  cwd: string,
  cache: Map<string, MergeInfoEntry[]>
): Promise<MergeInfoEntry[]> {
  const allMergeInfo: MergeInfoEntry[] = [];
  const fileDir = path.dirname(path.join(cwd, filepath));
  let currentDir = fileDir;

  while (true) {
    // 检查缓存
    if (cache.has(currentDir)) {
      const cached = cache.get(currentDir)!;
      mergeMergeInfo(allMergeInfo, cached);
    } else {
      // 查询并缓存
      const mergeInfo = await getMergeInfo(currentDir);
      cache.set(currentDir, mergeInfo);
      mergeMergeInfo(allMergeInfo, mergeInfo);
    }

    // 检查是否到达仓库根目录
    if (await isRepositoryRoot(currentDir)) {
      break;
    }

    // 向上一级
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  return allMergeInfo;
}

/**
 * 一次性获取文件的完整历史，并过滤出相关版本
 */
export async function getFileCompleteHistory(
  filepath: string,
  mergeInfo: MergeInfoEntry[],
  cwd: string
): Promise<FileRevisionInfo[]> {
  const allRevisions: FileRevisionInfo[] = [];

  // 对每个分支查询文件历史
  for (const entry of mergeInfo) {
    try {
      // 构建完整路径
      const fullPath = `${entry.path}/${filepath}`;

      // 一次性查询该文件在该分支的所有历史
      const { stdout } = await runSvnCommand(
        `svn log --xml "${fullPath}"`,
        cwd
      );

      // 解析 XML
      const revisionMatches = stdout.matchAll(
        /<logentry[^>]*revision="(\d+)"[^>]*>([\s\S]*?)<\/logentry>/g
      );

      for (const match of revisionMatches) {
        const revision = parseInt(match[1], 10);

        // 只保留在 mergeinfo 范围内的版本
        if (entry.revisions.includes(revision)) {
          const content = match[2];
          const authorMatch = content.match(/<author>([^<]+)<\/author>/);
          const dateMatch = content.match(/<date>([^<]+)<\/date>/);
          const messageMatch = content.match(/<msg>([^<]*)<\/msg>/);

          allRevisions.push({
            revision,
            author: authorMatch ? authorMatch[1] : 'unknown',
            date: dateMatch ? new Date(dateMatch[1]) : new Date(),
            message: messageMatch ? messageMatch[1] : '',
            branch: entry.path
          });
        }
      }
    } catch {
      // 文件在该分支可能不存在
    }
  }

  // 按版本号降序排序
  allRevisions.sort((a, b) => b.revision - a.revision);

  return allRevisions;
}

/**
 * 根据版本号应用对应的文件内容
 */
export async function applyRevision(
  filepath: string,
  revision: number,
  cwd: string = process.cwd()
): Promise<void> {
  try {
    // 先检查冲突文件中是否有对应的版本
    const revisionFile = path.join(cwd, `${filepath}.r${revision}`);

    if (fs.existsSync(revisionFile)) {
      // 如果存在 .rXXX 文件，使用对应的策略
      await resolveConflict(filepath, 'theirs-full', cwd);
    } else {
      // 否则，从仓库获取该版本的文件内容
      const { stdout: content } = await runSvnCommand(
        `svn cat -r${revision} "${filepath}"`,
        cwd
      );

      // 写入文件
      await fs.promises.writeFile(path.join(cwd, filepath), content);

      // 标记为已解决
      await runSvnCommand(`svn resolve --accept working "${filepath}"`, cwd);
    }
  } catch (error: any) {
    throw new Error(`Failed to apply revision ${revision}: ${error.message}`);
  }
}
