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

  // Check if workspace is selected
  const selectedWorkspace = localStorage.getItem('selectedWorkspace');
  if (!selectedWorkspace) {
    // Redirect to welcome page
    window.location.href = 'welcome.html';
    return;
  }

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

  // Load current workspace
  await loadCurrentWorkspace(selectedWorkspace);

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

// Load current workspace
async function loadCurrentWorkspace(workspacePath) {
  const currentWorkspaceEl = document.getElementById('currentWorkspace');
  if (!currentWorkspaceEl) return;

  try {
    currentWorkspaceEl.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <div class="spinner"></div>
        <div style="margin-top: 10px; color: var(--text-secondary);">加载中...</div>
      </div>
    `;

    const data = await apiClient.getRepoInfo(workspacePath);

    if (data.result) {
      state.set('workspace', workspacePath);
      state.set('repoInfo', data.result);

      displayCurrentWorkspace(workspacePath, data.result);
    } else {
      throw new Error('无法获取仓库信息');
    }
  } catch (error) {
    console.error('[App] Failed to load workspace:', error);
    currentWorkspaceEl.innerHTML = `
      <div class="alert alert-danger">
        <div class="alert-icon">✗</div>
        <div class="alert-content">
          <div class="alert-title">加载失败</div>
          <div class="alert-message">${error.message}</div>
          <div style="margin-top: 12px;">
            <button class="btn btn-sm btn-primary" onclick="window.location.href='welcome.html'">
              返回选择工作目录
            </button>
          </div>
        </div>
      </div>
    `;

    state.remove('workspace');
    state.remove('repoInfo');
  }
}

// Display current workspace
function displayCurrentWorkspace(workspacePath, repoInfo) {
  const currentWorkspaceEl = document.getElementById('currentWorkspace');
  if (!currentWorkspaceEl) return;

  currentWorkspaceEl.innerHTML = `
    <div class="grid grid-2">
      <div class="summary-item" style="grid-column: 1 / -1;">
        <span class="summary-label">工作目录</span>
        <span class="summary-value" style="font-family: monospace; font-size: 13px; word-break: break-all;">${workspacePath}</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">当前版本</span>
        <span class="summary-value">r${repoInfo.revision}</span>
      </div>
      <div class="summary-item" style="grid-column: 1 / -1;">
        <span class="summary-label">仓库 URL</span>
        <span class="summary-value" style="font-family: monospace; font-size: 13px; word-break: break-all;">${repoInfo.url}</span>
      </div>
    </div>
  `;
}

// Setup event listeners
function setupEventListeners() {
  // Change workspace button
  const changeWorkspaceBtn = document.getElementById('changeWorkspaceBtn');
  if (changeWorkspaceBtn) {
    changeWorkspaceBtn.addEventListener('click', () => {
      window.location.href = 'welcome.html';
    });
  }

  // Start merge button
  const startMergeBtn = document.getElementById('startMergeBtn');
  if (startMergeBtn) {
    startMergeBtn.addEventListener('click', () => {
      const workspace = state.get('workspace');
      if (workspace) {
        // Navigate to merge wizard with workspace parameter
        window.location.href = `merge-wizard.html?workspace=${encodeURIComponent(workspace)}`;
      } else {
        UIComponents.showToast('请先选择工作目录', 'warning');
      }
    });
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
