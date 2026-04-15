// SVN Merge Tool - Main Application

const API_BASE = 'http://localhost:36695';
const WS_URL = 'ws://localhost:36695/ws';

// Initialize clients
const apiClient = new APIClient(API_BASE);
const wsClient = new WebSocketClient(WS_URL);
const state = new StateManager();

// Initialize application
async function init() {
  console.log('[App] Initializing...');

  // Connect WebSocket
  try {
    await wsClient.connect();
    updateConnectionStatus(true);
  } catch (error) {
    console.error('[App] Failed to connect WebSocket:', error);
    updateConnectionStatus(false);
  }

  // Setup WebSocket listeners
  wsClient.on('connected', () => {
    updateConnectionStatus(true);
    UIComponents.showToast('已连接到服务器', 'success');
  });

  wsClient.on('disconnected', () => {
    updateConnectionStatus(false);
    UIComponents.showToast('与服务器断开连接', 'warning');
  });

  wsClient.on('reconnect-failed', () => {
    UIComponents.showToast('无法连接到服务器，请检查 daemon 是否运行', 'error', '', 0);
  });

  // Load workspaces
  await loadWorkspaces();

  // Setup event listeners
  setupEventListeners();
}

// Update connection status
function updateConnectionStatus(connected) {
  const statusEl = document.getElementById('connectionStatus');
  if (!statusEl) return;

  state.set('connected', connected);

  if (connected) {
    statusEl.className = 'connection-status connected';
    statusEl.innerHTML = `
      <span class="status-dot"></span>
      <span>已连接</span>
    `;
  } else {
    statusEl.className = 'connection-status disconnected';
    statusEl.innerHTML = `
      <span class="status-dot"></span>
      <span>未连接</span>
    `;
  }
}

// Load workspaces
async function loadWorkspaces() {
  try {
    const data = await apiClient.getWorkspaces();
    const workspaces = data.workspaces || [];

    displayWorkspaces(workspaces);

    // Auto-select the last used workspace
    if (workspaces.length > 0) {
      const lastUsed = workspaces
        .filter(w => w.lastUsed)
        .sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed))[0];

      if (lastUsed) {
        await selectWorkspace(lastUsed);
      }
    }
  } catch (error) {
    console.error('[App] Failed to load workspaces:', error);
  }
}

// Display workspaces
function displayWorkspaces(workspaces) {
  const listEl = document.getElementById('workspaceList');
  const emptyState = document.getElementById('emptyWorkspaceState');

  if (workspaces.length === 0) {
    emptyState.style.display = 'block';
    return;
  }

  emptyState.style.display = 'none';

  listEl.innerHTML = workspaces.map(workspace => `
    <div class="workspace-item" data-id="${workspace.id}">
      <div class="workspace-info">
        <div class="workspace-name">${workspace.name || workspace.path}</div>
        <div class="workspace-path">${workspace.path}</div>
        ${workspace.lastUsed ? `<div class="workspace-meta">最后使用: ${formatDate(workspace.lastUsed)}</div>` : ''}
      </div>
      <div class="workspace-actions">
        <button class="btn btn-sm btn-primary select-workspace-btn" data-id="${workspace.id}" data-path="${workspace.path}">
          选择
        </button>
        <button class="btn btn-sm btn-outline btn-danger delete-workspace-btn" data-id="${workspace.id}">
          删除
        </button>
      </div>
    </div>
  `).join('');

  // Add event listeners
  document.querySelectorAll('.select-workspace-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      const path = e.target.dataset.path;
      const workspace = workspaces.find(w => w.id === id);
      if (workspace) {
        await selectWorkspace(workspace);
      }
    });
  });

  document.querySelectorAll('.delete-workspace-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.id;
      await deleteWorkspace(id);
    });
  });
}

// Select workspace
async function selectWorkspace(workspace) {
  await validateWorkspace(workspace.path);
}

// Add workspace
async function addWorkspace() {
  const pathInput = document.getElementById('workspaceInput');
  const nameInput = document.getElementById('workspaceNameInput');
  const statusEl = document.getElementById('workspaceStatus');

  const path = pathInput.value.trim();
  const name = nameInput.value.trim();

  if (!path) {
    statusEl.innerHTML = '<span style="color: var(--danger);">✗ 请输入工作目录路径</span>';
    return;
  }

  try {
    statusEl.innerHTML = '<span style="color: var(--text-secondary);">⏳ 添加中...</span>';

    await apiClient.addWorkspace(path, name || null);

    statusEl.innerHTML = '<span style="color: var(--success);">✓ 添加成功</span>';
    pathInput.value = '';
    nameInput.value = '';

    // Reload workspaces
    await loadWorkspaces();

    UIComponents.showToast('工作目录已添加', 'success');

    // Clear status after 3 seconds
    setTimeout(() => {
      statusEl.innerHTML = '';
    }, 3000);
  } catch (error) {
    console.error('[App] Failed to add workspace:', error);
    statusEl.innerHTML = `<span style="color: var(--danger);">✗ ${error.message}</span>`;
  }
}

// Delete workspace
async function deleteWorkspace(id) {
  if (!confirm('确定要删除这个工作目录吗？')) {
    return;
  }

  try {
    await apiClient.removeWorkspace(id);
    UIComponents.showToast('工作目录已删除', 'success');

    // Reload workspaces
    await loadWorkspaces();

    // Clear current workspace if it was deleted
    const currentWorkspace = state.get('workspace');
    if (currentWorkspace) {
      const workspaces = (await apiClient.getWorkspaces()).workspaces || [];
      const exists = workspaces.some(w => w.path === currentWorkspace);
      if (!exists) {
        state.set('workspace', null);
        state.set('repoInfo', null);
        document.getElementById('repoInfo').innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📁</div>
            <div class="empty-state-message">请先选择并验证工作目录</div>
          </div>
        `;
        disableActions();
      }
    }
  } catch (error) {
    console.error('[App] Failed to delete workspace:', error);
    UIComponents.showToast('删除失败: ' + error.message, 'error');
  }
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;

  return date.toLocaleDateString('zh-CN');
}

// Validate workspace directory
async function validateWorkspace(workspacePath) {
  const statusEl = document.getElementById('workspaceStatus');
  const repoInfoEl = document.getElementById('repoInfo');

  if (!workspacePath || workspacePath.trim() === '') {
    statusEl.innerHTML = '<span style="color: var(--danger);">✗ 请输入工作目录路径</span>';
    disableActions();
    return;
  }

  try {
    statusEl.innerHTML = '<span style="color: var(--text-secondary);">⏳ 验证中...</span>';

    const data = await apiClient.getRepoInfo(workspacePath);

    if (data.result) {
      state.set('workspace', workspacePath);
      state.set('repoInfo', data.result);

      statusEl.innerHTML = '<span style="color: var(--success);">✓ 有效的 SVN 工作目录</span>';
      displayRepoInfo(data.result);
      enableActions();
    } else {
      throw new Error('无法获取仓库信息');
    }
  } catch (error) {
    console.error('[App] Failed to validate workspace:', error);
    statusEl.innerHTML = `<span style="color: var(--danger);">✗ ${error.message}</span>`;

    repoInfoEl.innerHTML = `
      <div class="alert alert-danger">
        <div class="alert-icon">✗</div>
        <div class="alert-content">
          <div class="alert-title">验证失败</div>
          <div class="alert-message">${error.message}</div>
        </div>
      </div>
    `;

    state.remove('workspace');
    state.remove('repoInfo');
    disableActions();
  }
}

// Enable actions after workspace validation
function enableActions() {
  document.getElementById('refreshRepoBtn').disabled = false;
  document.getElementById('checkConflictsBtn').disabled = false;
  document.getElementById('viewMergeInfoBtn').disabled = false;

  const startMergeBtn = document.getElementById('startMergeBtn');
  startMergeBtn.style.pointerEvents = 'auto';
  startMergeBtn.style.opacity = '1';
}

// Disable actions when no valid workspace
function disableActions() {
  document.getElementById('refreshRepoBtn').disabled = true;
  document.getElementById('checkConflictsBtn').disabled = true;
  document.getElementById('viewMergeInfoBtn').disabled = true;

  const startMergeBtn = document.getElementById('startMergeBtn');
  startMergeBtn.style.pointerEvents = 'none';
  startMergeBtn.style.opacity = '0.5';
}

// Load repository info
async function loadRepoInfo() {
  const workspace = state.get('workspace');
  if (!workspace) {
    UIComponents.showToast('请先选择工作目录', 'warning');
    return;
  }

  const repoInfoEl = document.getElementById('repoInfo');
  if (!repoInfoEl) return;

  try {
    repoInfoEl.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div class="spinner"></div>
        <div style="margin-top: 10px; color: var(--text-secondary);">加载中...</div>
      </div>
    `;

    const data = await apiClient.getRepoInfo(workspace);

    if (data.result) {
      state.set('repoInfo', data.result);
      displayRepoInfo(data.result);
    } else {
      throw new Error('无法获取仓库信息');
    }
  } catch (error) {
    console.error('[App] Failed to load repo info:', error);
    repoInfoEl.innerHTML = `
      <div class="alert alert-danger">
        <div class="alert-icon">✗</div>
        <div class="alert-content">
          <div class="alert-title">加载失败</div>
          <div class="alert-message">${error.message}</div>
        </div>
      </div>
    `;
  }
}

// Display repository info
function displayRepoInfo(info) {
  const repoInfoEl = document.getElementById('repoInfo');
  if (!repoInfoEl) return;

  const workspace = state.get('workspace');
  const absolutePath = workspace || info.path;

  repoInfoEl.innerHTML = `
    <div class="grid grid-2">
      <div class="summary-item" style="grid-column: 1 / -1;">
        <span class="summary-label">工作目录</span>
        <span class="summary-value" style="font-family: monospace; font-size: 13px; word-break: break-all;">${absolutePath}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">当前版本</span>
        <span class="summary-value">r${info.revision}</span>
      </div>
      <div class="summary-item" style="grid-column: 1 / -1;">
        <span class="summary-label">仓库 URL</span>
        <span class="summary-value" style="font-family: monospace; font-size: 13px; word-break: break-all;">${info.url}</span>
      </div>
    </div>
  `;
}

// Setup event listeners
function setupEventListeners() {
  // Add workspace button
  const addWorkspaceBtn = document.getElementById('addWorkspaceBtn');
  if (addWorkspaceBtn) {
    addWorkspaceBtn.addEventListener('click', addWorkspace);
  }

  // Workspace input - Enter key
  const workspaceInput = document.getElementById('workspaceInput');
  if (workspaceInput) {
    workspaceInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addWorkspace();
      }
    });
  }

  // Refresh repo button
  const refreshRepoBtn = document.getElementById('refreshRepoBtn');
  if (refreshRepoBtn) {
    refreshRepoBtn.addEventListener('click', loadRepoInfo);
  }

  // Check conflicts button
  const checkConflictsBtn = document.getElementById('checkConflictsBtn');
  if (checkConflictsBtn) {
    checkConflictsBtn.addEventListener('click', checkConflicts);
  }

  // View mergeinfo button
  const viewMergeInfoBtn = document.getElementById('viewMergeInfoBtn');
  if (viewMergeInfoBtn) {
    viewMergeInfoBtn.addEventListener('click', viewMergeInfo);
  }
}

// Check conflicts
async function checkConflicts() {
  const workspace = state.get('workspace');
  if (!workspace) {
    UIComponents.showToast('请先选择工作目录', 'warning');
    return;
  }

  try {
    UIComponents.showLoading('检查冲突中...');

    const data = await apiClient.getConflicts(workspace);

    UIComponents.hideLoading();

    if (data.conflicts && data.conflicts.length > 0) {
      const conflictList = data.conflicts.map(c =>
        `<li style="padding: 8px; border-bottom: 1px solid var(--border-color);">
          <div style="font-family: monospace; font-weight: 500;">${c.path}</div>
          <div style="font-size: 13px; color: var(--text-secondary);">${c.description}</div>
        </li>`
      ).join('');

      UIComponents.showModal(
        `发现 ${data.conflicts.length} 个冲突`,
        `<ul style="list-style: none; max-height: 400px; overflow-y: auto;">${conflictList}</ul>`,
        {
          showCancel: false,
          confirmText: '关闭'
        }
      );
    } else {
      UIComponents.showToast('没有发现冲突', 'success');
    }
  } catch (error) {
    UIComponents.hideLoading();
    UIComponents.showToast('检查失败: ' + error.message, 'error');
  }
}

// View mergeinfo
async function viewMergeInfo() {
  const workspace = state.get('workspace');
  if (!workspace) {
    UIComponents.showToast('请先选择工作目录', 'warning');
    return;
  }

  try {
    UIComponents.showLoading('加载 MergeInfo...');

    const data = await apiClient.getMergeInfo(workspace);

    UIComponents.hideLoading();

    if (data.mergeInfo && data.mergeInfo.length > 0) {
      const mergeInfoList = data.mergeInfo.map(mi => {
        const revisions = mi.revisions.join(', ');
        return `
          <li style="padding: 12px; border-bottom: 1px solid var(--border-color);">
            <div style="font-family: monospace; font-weight: 500; margin-bottom: 4px;">${mi.path}</div>
            <div style="font-size: 13px; color: var(--text-secondary);">已合并版本: ${revisions}</div>
          </li>
        `;
      }).join('');

      UIComponents.showModal(
        'MergeInfo',
        `<ul style="list-style: none; max-height: 400px; overflow-y: auto;">${mergeInfoList}</ul>`,
        {
          showCancel: false,
          confirmText: '关闭'
        }
      );
    } else {
      UIComponents.showToast('没有 MergeInfo 记录', 'info');
    }
  } catch (error) {
    UIComponents.hideLoading();
    UIComponents.showToast('加载失败: ' + error.message, 'error');
  }
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
