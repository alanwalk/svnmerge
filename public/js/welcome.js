// SVN Merge Tool - Welcome Page

const API_BASE = 'http://localhost:36695';
const WS_URL = 'ws://localhost:36695/ws';

// Initialize clients
const apiClient = new APIClient(API_BASE);
const wsClient = new WebSocketClient(WS_URL);
const state = new StateManager();

let allWorkspacesVisible = false;

// Initialize application
async function init() {
  console.log('[Welcome] Initializing...');

  // Connect WebSocket
  try {
    await wsClient.connect();
    updateConnectionStatus(true);
  } catch (error) {
    console.error('[Welcome] Failed to connect WebSocket:', error);
    updateConnectionStatus(false);
  }

  // Setup WebSocket listeners
  wsClient.on('connected', () => {
    updateConnectionStatus(true);
  });

  wsClient.on('disconnected', () => {
    updateConnectionStatus(false);
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
  } catch (error) {
    console.error('[Welcome] Failed to load workspaces:', error);
    UIComponents.showToast('加载工作目录失败: ' + error.message, 'error');
  }
}

// Display workspaces
function displayWorkspaces(workspaces) {
  const recentListEl = document.getElementById('recentWorkspaceList');
  const allListEl = document.getElementById('allWorkspaceList');

  if (workspaces.length === 0) {
    recentListEl.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📂</div>
        <div class="empty-state-message">暂无工作目录</div>
        <div style="margin-top: 16px;">
          <button class="btn btn-primary" onclick="showAddWorkspaceModal()">添加第一个工作目录</button>
        </div>
      </div>
    `;
    document.getElementById('showAllBtn').style.display = 'none';
    return;
  }

  // Sort by lastUsed
  const sortedWorkspaces = [...workspaces].sort((a, b) => {
    if (!a.lastUsed && !b.lastUsed) return 0;
    if (!a.lastUsed) return 1;
    if (!b.lastUsed) return -1;
    return new Date(b.lastUsed) - new Date(a.lastUsed);
  });

  // Show recent (top 3)
  const recentWorkspaces = sortedWorkspaces.slice(0, 3);
  recentListEl.innerHTML = recentWorkspaces.map(workspace => createWorkspaceListItem(workspace, true)).join('');

  // Show all
  allListEl.innerHTML = sortedWorkspaces.map(workspace => createWorkspaceListItem(workspace, false)).join('');

  // Show/hide "show all" button
  document.getElementById('showAllBtn').style.display = workspaces.length > 3 ? 'inline-flex' : 'none';

  // Add event listeners
  attachWorkspaceEventListeners();
}

// Create workspace list item
function createWorkspaceListItem(workspace, isRecent) {
  return `
    <div class="workspace-list-item" data-id="${workspace.id}" data-path="${workspace.path}">
      <div class="workspace-list-info">
        <div class="workspace-list-name">${workspace.name || workspace.path}</div>
        <div class="workspace-list-path">${workspace.path}</div>
        ${workspace.lastUsed ? `<div class="workspace-list-meta">最后使用: ${formatDate(workspace.lastUsed)}</div>` : ''}
      </div>
      <div class="workspace-list-actions">
        <button class="btn btn-sm btn-outline btn-danger delete-workspace-btn" data-id="${workspace.id}" onclick="event.stopPropagation(); deleteWorkspace('${workspace.id}')">
          删除
        </button>
      </div>
    </div>
  `;
}

// Attach event listeners to workspace items
function attachWorkspaceEventListeners() {
  // All workspace list items
  document.querySelectorAll('.workspace-list-item').forEach(item => {
    item.addEventListener('click', (e) => {
      if (!e.target.closest('.delete-workspace-btn')) {
        const path = item.dataset.path;
        selectWorkspace(path);
      }
    });
  });
}

// Select workspace and navigate to main page
function selectWorkspace(path) {
  // Save to localStorage
  localStorage.setItem('selectedWorkspace', path);

  // Navigate to main page
  window.location.href = 'index.html';
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
  } catch (error) {
    console.error('[Welcome] Failed to delete workspace:', error);
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

// Show add workspace modal
function showAddWorkspaceModal() {
  const modal = document.getElementById('addWorkspaceModal');
  modal.style.display = 'flex';
  document.getElementById('workspacePathInput').focus();
}

// Hide add workspace modal
function hideAddWorkspaceModal() {
  const modal = document.getElementById('addWorkspaceModal');
  modal.style.display = 'none';
  document.getElementById('workspacePathInput').value = '';
  document.getElementById('workspaceNameInput').value = '';
  document.getElementById('addWorkspaceStatus').innerHTML = '';
}

// Add workspace
async function addWorkspace() {
  const pathInput = document.getElementById('workspacePathInput');
  const nameInput = document.getElementById('workspaceNameInput');
  const statusEl = document.getElementById('addWorkspaceStatus');

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

    UIComponents.showToast('工作目录已添加', 'success');

    // Reload workspaces
    await loadWorkspaces();

    // Close modal after a short delay
    setTimeout(() => {
      hideAddWorkspaceModal();
    }, 1000);
  } catch (error) {
    console.error('[Welcome] Failed to add workspace:', error);
    statusEl.innerHTML = `<span style="color: var(--danger);">✗ ${error.message}</span>`;
  }
}

// Toggle show all workspaces
function toggleShowAll() {
  allWorkspacesVisible = !allWorkspacesVisible;
  const section = document.getElementById('allWorkspacesSection');
  const btnText = document.getElementById('showAllBtnText');

  if (allWorkspacesVisible) {
    section.style.display = 'block';
    btnText.textContent = '收起';
  } else {
    section.style.display = 'none';
    btnText.textContent = '查看所有工作目录';
  }
}

// Setup event listeners
function setupEventListeners() {
  // Show all button
  const showAllBtn = document.getElementById('showAllBtn');
  if (showAllBtn) {
    showAllBtn.addEventListener('click', toggleShowAll);
  }

  // Add new button
  const addNewBtn = document.getElementById('addNewBtn');
  if (addNewBtn) {
    addNewBtn.addEventListener('click', showAddWorkspaceModal);
  }

  // Modal close button
  const closeModalBtn = document.getElementById('closeModalBtn');
  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', hideAddWorkspaceModal);
  }

  // Cancel add button
  const cancelAddBtn = document.getElementById('cancelAddBtn');
  if (cancelAddBtn) {
    cancelAddBtn.addEventListener('click', hideAddWorkspaceModal);
  }

  // Confirm add button
  const confirmAddBtn = document.getElementById('confirmAddBtn');
  if (confirmAddBtn) {
    confirmAddBtn.addEventListener('click', addWorkspace);
  }

  // Enter key in inputs
  const pathInput = document.getElementById('workspacePathInput');
  const nameInput = document.getElementById('workspaceNameInput');

  if (pathInput) {
    pathInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addWorkspace();
      }
    });
  }

  if (nameInput) {
    nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addWorkspace();
      }
    });
  }

  // Close modal on overlay click
  const modal = document.getElementById('addWorkspaceModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        hideAddWorkspaceModal();
      }
    });
  }
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
