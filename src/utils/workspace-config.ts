import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.svnmerge');
const WORKSPACE_CONFIG_FILE = path.join(CONFIG_DIR, 'workspaces.json');

/**
 * 工作目录配置
 */
export interface WorkspaceConfig {
  id: string;
  path: string;
  name?: string;
  addedAt: string;
  lastUsed?: string;
}

/**
 * 确保配置目录存在
 */
function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * 读取工作目录配置
 */
export function loadWorkspaces(): WorkspaceConfig[] {
  ensureConfigDir();

  if (!fs.existsSync(WORKSPACE_CONFIG_FILE)) {
    return [];
  }

  try {
    const content = fs.readFileSync(WORKSPACE_CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Failed to load workspace config:', error);
    return [];
  }
}

/**
 * 保存工作目录配置
 */
export function saveWorkspaces(workspaces: WorkspaceConfig[]): void {
  ensureConfigDir();

  try {
    fs.writeFileSync(WORKSPACE_CONFIG_FILE, JSON.stringify(workspaces, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save workspace config:', error);
    throw new Error('Failed to save workspace configuration');
  }
}

/**
 * 添加工作目录
 */
export function addWorkspace(workspacePath: string, name?: string): WorkspaceConfig {
  // 检查目录是否存在
  if (!fs.existsSync(workspacePath)) {
    throw new Error(`Directory does not exist: ${workspacePath}`);
  }

  // 检查是否是目录
  const stats = fs.statSync(workspacePath);
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${workspacePath}`);
  }

  const workspaces = loadWorkspaces();

  // 检查是否已存在
  const existing = workspaces.find(w => w.path === workspacePath);
  if (existing) {
    throw new Error('Workspace already exists');
  }

  // 创建新的工作目录配置
  const newWorkspace: WorkspaceConfig = {
    id: generateId(),
    path: workspacePath,
    name: name || path.basename(workspacePath),
    addedAt: new Date().toISOString()
  };

  workspaces.push(newWorkspace);
  saveWorkspaces(workspaces);

  return newWorkspace;
}

/**
 * 删除工作目录
 */
export function removeWorkspace(id: string): boolean {
  const workspaces = loadWorkspaces();
  const index = workspaces.findIndex(w => w.id === id);

  if (index === -1) {
    return false;
  }

  workspaces.splice(index, 1);
  saveWorkspaces(workspaces);

  return true;
}

/**
 * 更新工作目录的最后使用时间
 */
export function updateWorkspaceLastUsed(id: string): void {
  const workspaces = loadWorkspaces();
  const workspace = workspaces.find(w => w.id === id);

  if (workspace) {
    workspace.lastUsed = new Date().toISOString();
    saveWorkspaces(workspaces);
  }
}

/**
 * 根据路径更新最后使用时间
 */
export function updateWorkspaceLastUsedByPath(workspacePath: string): void {
  const workspaces = loadWorkspaces();
  const workspace = workspaces.find(w => w.path === workspacePath);

  if (workspace) {
    workspace.lastUsed = new Date().toISOString();
    saveWorkspaces(workspaces);
  }
}

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
