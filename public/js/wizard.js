// SVN Merge Tool - Wizard Logic

const API_BASE = 'http://localhost:36695';
const WS_URL = 'ws://localhost:36695/ws';

// Initialize clients
const apiClient = new APIClient(API_BASE);
const wsClient = new WebSocketClient(WS_URL);
const state = new StateManager();

// Wizard controller
const wizard = {
  currentStep: 1,
  totalSteps: 6,

  init() {
    console.log('[Wizard] Initializing...');

    // Check if workspace is selected
    const workspace = state.get('workspace');
    if (!workspace) {
      UIComponents.showModal(
        '未选择工作目录',
        '请先在主页选择并验证 SVN 工作目录',
        {
          showCancel: false,
          confirmText: '返回主页',
          onConfirm: () => {
            window.location.href = 'index.html';
          }
        }
      );
      return;
    }

    // Connect WebSocket
    this.connectWebSocket();

    // Setup event listeners
    this.setupEventListeners();

    // Load saved state
    this.loadSavedState();
  },

  async connectWebSocket() {
    try {
      await wsClient.connect();
      this.updateConnectionStatus(true);
    } catch (error) {
      console.error('[Wizard] Failed to connect WebSocket:', error);
      this.updateConnectionStatus(false);
    }

    wsClient.on('connected', () => {
      this.updateConnectionStatus(true);
      UIComponents.showToast('已连接到服务器', 'success');
    });

    wsClient.on('disconnected', () => {
      this.updateConnectionStatus(false);
      UIComponents.showToast('与服务器断开连接', 'warning');
    });
  },

  updateConnectionStatus(connected) {
    const statusEl = document.getElementById('connectionStatus');
    if (!statusEl) return;

    state.set('connected', connected);

    if (connected) {
      statusEl.className = 'connection-status connected';
      statusEl.innerHTML = '<span class="status-dot"></span><span>已连接</span>';
    } else {
      statusEl.className = 'connection-status disconnected';
      statusEl.innerHTML = '<span class="status-dot"></span><span>未连接</span>';
    }
  },

  setupEventListeners() {
    // Step 1: Merge type selection
    document.querySelectorAll('input[name="mergeType"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        document.querySelectorAll('.merge-type-option').forEach(opt => {
          opt.classList.remove('selected');
        });
        e.target.closest('.merge-type-option').classList.add('selected');
        state.set('mergeType', e.target.value);
      });
    });

    // Step 2: Branch path input
    const branchPathInput = document.getElementById('branchPath');
    if (branchPathInput) {
      branchPathInput.addEventListener('input', (e) => {
        state.set('branchPath', e.target.value);
      });
    }

    // Step 3: Load revisions
    const loadRevisionsBtn = document.getElementById('loadRevisionsBtn');
    if (loadRevisionsBtn) {
      loadRevisionsBtn.addEventListener('click', () => this.loadRevisions());
    }

    // Filter buttons
    const applyFilterBtn = document.getElementById('applyFilterBtn');
    if (applyFilterBtn) {
      applyFilterBtn.addEventListener('click', () => this.applyFilter());
    }

    const clearFilterBtn = document.getElementById('clearFilterBtn');
    if (clearFilterBtn) {
      clearFilterBtn.addEventListener('click', () => this.clearFilter());
    }

    // Select all/deselect all
    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => this.selectAllRevisions());
    }

    const deselectAllBtn = document.getElementById('deselectAllBtn');
    if (deselectAllBtn) {
      deselectAllBtn.addEventListener('click', () => this.deselectAllRevisions());
    }

    // Cancel merge
    const cancelMergeBtn = document.getElementById('cancelMergeBtn');
    if (cancelMergeBtn) {
      cancelMergeBtn.addEventListener('click', () => this.cancelMerge());
    }

    // Commit button
    const commitBtn = document.getElementById('commitBtn');
    if (commitBtn) {
      commitBtn.addEventListener('click', () => this.commitChanges());
    }

    // Filter inputs with debounce
    const filterMessage = document.getElementById('filterMessage');
    if (filterMessage) {
      filterMessage.addEventListener('input', UIComponents.debounce((e) => {
        state.setFilter('message', e.target.value);
      }, 300));
    }
  },

  loadSavedState() {
    const branchPath = state.get('branchPath');
    if (branchPath) {
      const input = document.getElementById('branchPath');
      if (input) input.value = branchPath;
    }

    const mergeType = state.get('mergeType');
    if (mergeType) {
      const radio = document.querySelector(`input[name="mergeType"][value="${mergeType}"]`);
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change'));
      }
    }
  },

  goToStep(step) {
    if (step < 1 || step > this.totalSteps) return;

    // Hide all pages
    document.querySelectorAll('.wizard-page').forEach(page => {
      page.classList.remove('active');
    });

    // Show target page
    const targetPage = document.getElementById(`step${step}`);
    if (targetPage) {
      targetPage.classList.add('active');
    }

    // Update step indicators
    document.querySelectorAll('.wizard-step').forEach(stepEl => {
      const stepNum = parseInt(stepEl.dataset.step);
      stepEl.classList.remove('active', 'completed');

      if (stepNum === step) {
        stepEl.classList.add('active');
      } else if (stepNum < step) {
        stepEl.classList.add('completed');
      }
    });

    this.currentStep = step;
    state.set('currentStep', step);

    // Execute step-specific logic
    this.onStepEnter(step);
  },

  nextStep() {
    if (!this.validateCurrentStep()) {
      return;
    }
    this.goToStep(this.currentStep + 1);
  },

  prevStep() {
    this.goToStep(this.currentStep - 1);
  },

  validateCurrentStep() {
    if (this.currentStep === 2) {
      const branchPath = state.get('branchPath');
      if (!branchPath || branchPath.trim() === '') {
        UIComponents.showToast('请输入源分支路径', 'warning');
        return false;
      }
    }

    if (this.currentStep === 3) {
      const selected = state.get('selectedRevisions');
      if (!selected || selected.length === 0) {
        UIComponents.showToast('请至少选择一个版本', 'warning');
        return false;
      }
    }

    return true;
  },

  onStepEnter(step) {
    if (step === 4) {
      this.showPreview();
    }
  },

  // Load revisions from server
  async loadRevisions() {
    const branchPath = state.get('branchPath');
    if (!branchPath) {
      UIComponents.showToast('请先输入源分支路径', 'warning');
      return;
    }

    try {
      UIComponents.showLoading('正在加载日志...');
      state.set('revisionsLoading', true);

      const workspace = state.get('workspace');
      const response = await apiClient.queryRevisions({
        branchPath,
        limit: 100,
        offset: 0,
        cwd: workspace
      });

      const taskId = response.taskId;
      state.set('currentTaskId', taskId);

      // Wait for result via WebSocket
      const result = await wsClient.waitForTask(taskId);

      UIComponents.hideLoading();
      state.set('revisionsLoading', false);

      if (result.revisions && result.revisions.length > 0) {
        state.set('revisions', result.revisions);
        this.displayRevisions(result.revisions);

        // Show filter bar and revision list
        document.getElementById('filterBar').classList.remove('hidden');
        document.getElementById('revisionListContainer').classList.remove('hidden');

        UIComponents.showToast(`加载了 ${result.revisions.length} 个版本`, 'success');
      } else {
        UIComponents.showToast('没有找到版本记录', 'info');
      }
    } catch (error) {
      UIComponents.hideLoading();
      state.set('revisionsLoading', false);
      UIComponents.showToast('加载失败: ' + error.message, 'error');
    }
  },

  // Display revisions in list
  displayRevisions(revisions) {
    const listEl = document.getElementById('revisionList');
    if (!listEl) return;

    listEl.innerHTML = '';

    if (!revisions || revisions.length === 0) {
      listEl.appendChild(UIComponents.createEmptyState('没有找到版本记录', '📋'));
      return;
    }

    revisions.forEach(revision => {
      const card = UIComponents.createRevisionCard(revision, {
        selectable: true,
        selected: this.isRevisionSelected(revision.revision),
        expandable: true,
        onSelect: (rev, checked) => {
          if (checked) {
            state.addSelectedRevision(rev);
          } else {
            state.removeSelectedRevision(rev.revision);
          }
          this.updateSelectedCount();
        },
        onExpand: (rev, filesDiv) => {
          this.loadRevisionFiles(rev, filesDiv);
        }
      });

      listEl.appendChild(card);
    });

    this.updateSelectedCount();
  },

  // Load revision files
  async loadRevisionFiles(revision, filesDiv) {
    try {
      const branchPath = state.get('branchPath');
      const detail = await apiClient.getRevisionDetail(revision.revision, branchPath);

      if (detail.paths) {
        UIComponents.updateRevisionFiles(filesDiv, detail.paths);
      } else {
        UIComponents.updateRevisionFiles(filesDiv, []);
      }
    } catch (error) {
      filesDiv.innerHTML = `
        <div class="alert alert-danger">
          <div class="alert-message">加载失败: ${error.message}</div>
        </div>
      `;
    }
  },

  isRevisionSelected(revisionNumber) {
    const selected = state.get('selectedRevisions');
    return selected.some(r => r.revision === revisionNumber);
  },

  updateSelectedCount() {
    const selected = state.get('selectedRevisions');
    const countEl = document.getElementById('selectedCount');
    if (countEl) {
      countEl.textContent = selected.length;
    }

    const nextBtn = document.getElementById('nextToPreviewBtn');
    if (nextBtn) {
      nextBtn.disabled = selected.length === 0;
    }
  },

  selectAllRevisions() {
    const revisions = state.get('revisions');
    state.set('selectedRevisions', [...revisions]);

    // Update UI
    document.querySelectorAll('.revision-checkbox').forEach(cb => {
      cb.checked = true;
    });
    document.querySelectorAll('.revision-item').forEach(item => {
      item.classList.add('selected');
    });

    this.updateSelectedCount();
  },

  deselectAllRevisions() {
    state.clearSelectedRevisions();

    // Update UI
    document.querySelectorAll('.revision-checkbox').forEach(cb => {
      cb.checked = false;
    });
    document.querySelectorAll('.revision-item').forEach(item => {
      item.classList.remove('selected');
    });

    this.updateSelectedCount();
  },

  applyFilter() {
    const author = document.getElementById('filterAuthor').value;
    const message = document.getElementById('filterMessage').value;
    const dateFrom = document.getElementById('filterDateFrom').value;
    const dateTo = document.getElementById('filterDateTo').value;

    state.set('filter', { author, message, dateFrom, dateTo });

    const allRevisions = state.get('revisions');
    const filtered = allRevisions.filter(rev => {
      if (author && !rev.author.toLowerCase().includes(author.toLowerCase())) {
        return false;
      }
      if (message && !rev.message.toLowerCase().includes(message.toLowerCase())) {
        return false;
      }
      if (dateFrom && new Date(rev.date) < new Date(dateFrom)) {
        return false;
      }
      if (dateTo && new Date(rev.date) > new Date(dateTo)) {
        return false;
      }
      return true;
    });

    this.displayRevisions(filtered);
    UIComponents.showToast(`找到 ${filtered.length} 个匹配的版本`, 'info');
  },

  clearFilter() {
    document.getElementById('filterAuthor').value = '';
    document.getElementById('filterMessage').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';

    state.clearFilter();

    const allRevisions = state.get('revisions');
    this.displayRevisions(allRevisions);
  },

  // Show preview
  showPreview() {
    const selected = state.get('selectedRevisions');
    const branchPath = state.get('branchPath');
    const previewEl = document.getElementById('previewContent');

    if (!previewEl) return;

    // Sort by revision number
    const sorted = [...selected].sort((a, b) => a.revision - b.revision);

    previewEl.innerHTML = `
      <div class="summary-section">
        <h3 class="summary-title">合并信息</h3>
        <div class="summary-list">
          <div class="summary-item">
            <span class="summary-label">源分支</span>
            <span class="summary-value" style="font-family: monospace;">${branchPath}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">版本数量</span>
            <span class="summary-value">${sorted.length} 个版本</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">版本范围</span>
            <span class="summary-value">r${sorted[0].revision} - r${sorted[sorted.length - 1].revision}</span>
          </div>
        </div>
      </div>

      <div class="summary-section">
        <h3 class="summary-title">版本列表</h3>
        <div class="revision-list" style="max-height: 400px;">
          ${sorted.map(rev => `
            <div class="revision-item">
              <div class="revision-info">
                <div class="revision-header">
                  <span class="revision-number">r${rev.revision}</span>
                  <span class="revision-author">${rev.author}</span>
                  <span class="revision-date">${new Date(rev.date).toLocaleString('zh-CN')}</span>
                </div>
                <div class="revision-message">${rev.message}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  // Start merge
  async startMerge() {
    const branchPath = state.get('branchPath');
    const selected = state.get('selectedRevisions');
    const revisions = selected.map(r => r.revision).sort((a, b) => a - b);

    try {
      this.goToStep(5);

      // Initialize progress UI
      state.set('mergeResults', []);
      state.updateMergeProgress(0, revisions.length, '准备开始...');

      const progressList = document.getElementById('mergeProgressList');
      progressList.innerHTML = '';

      // Create progress items
      revisions.forEach(rev => {
        const item = document.createElement('li');
        item.className = 'merge-progress-item pending';
        item.id = `merge-item-${rev}`;
        item.innerHTML = `
          <div class="merge-progress-icon">⏳</div>
          <div class="merge-progress-info">
            <div class="merge-progress-revision">r${rev}</div>
            <div class="merge-progress-message">等待合并...</div>
          </div>
        `;
        progressList.appendChild(item);
      });

      // Start merge
      const workspace = state.get('workspace');
      const response = await apiClient.startMerge(branchPath, revisions, workspace);
      const taskId = response.taskId;
      state.set('currentTaskId', taskId);

      // Enable cancel button
      document.getElementById('cancelMergeBtn').disabled = false;

      // Listen for progress
      wsClient.onTaskProgress(taskId, (message) => {
        this.updateMergeProgress(message);
      });

      // Wait for completion
      try {
        const result = await wsClient.waitForTask(taskId);
        this.onMergeComplete(result);
      } catch (error) {
        this.onMergeError(error);
      }
    } catch (error) {
      UIComponents.showToast('启动合并失败: ' + error.message, 'error');
    }
  },

  updateMergeProgress(message) {
    const { current, total, data } = message;

    // Update progress bar
    const percent = Math.round((current / total) * 100);
    const fillEl = document.getElementById('mergeProgressFill');
    const msgEl = document.getElementById('mergeProgressMessage');

    if (fillEl) {
      fillEl.style.width = `${percent}%`;
      fillEl.textContent = `${percent}%`;
    }

    if (msgEl) {
      msgEl.textContent = message.message || `正在合并 ${current}/${total}...`;
    }

    // Update specific revision item
    if (data && data.revision) {
      const item = document.getElementById(`merge-item-${data.revision}`);
      if (item) {
        item.className = `merge-progress-item ${data.status}`;

        const icons = {
          running: '⏳',
          success: '✓',
          conflict: '⚠',
          failed: '✗'
        };

        const messages = {
          running: '正在合并...',
          success: '合并成功',
          conflict: '发现冲突',
          failed: '合并失败'
        };

        item.querySelector('.merge-progress-icon').textContent = icons[data.status] || '⏳';
        item.querySelector('.merge-progress-message').textContent = messages[data.status] || data.message || '';
      }
    }

    state.updateMergeProgress(current, total, message.message);
  },

  onMergeComplete(result) {
    console.log('[Wizard] Merge completed:', result);

    state.set('mergeResults', result.results || []);

    // Disable cancel button
    document.getElementById('cancelMergeBtn').disabled = true;

    // Check for conflicts
    const hasConflicts = result.results && result.results.some(r => r.status === 'conflict');

    if (hasConflicts) {
      UIComponents.showToast('合并完成，但存在冲突需要解决', 'warning');
      document.getElementById('continueAfterMergeBtn').classList.remove('hidden');
    } else {
      UIComponents.showToast('合并成功完成！', 'success');
      document.getElementById('continueAfterMergeBtn').classList.remove('hidden');
    }
  },

  onMergeError(error) {
    console.error('[Wizard] Merge failed:', error);
    UIComponents.showToast('合并失败: ' + error.message, 'error');

    document.getElementById('cancelMergeBtn').disabled = true;
    document.getElementById('continueAfterMergeBtn').classList.remove('hidden');
  },

  async cancelMerge() {
    const taskId = state.get('currentTaskId');
    if (!taskId) return;

    const confirmed = await UIComponents.confirm('确定要取消合并操作吗？', '取消合并');
    if (!confirmed) return;

    try {
      await apiClient.cancelTask(taskId);
      UIComponents.showToast('已取消合并', 'info');
    } catch (error) {
      UIComponents.showToast('取消失败: ' + error.message, 'error');
    }
  },

  async afterMerge() {
    // Check for conflicts
    try {
      UIComponents.showLoading('检查冲突...');

      const workspace = state.get('workspace');
      const data = await apiClient.getConflicts(workspace);

      UIComponents.hideLoading();

      if (data.conflicts && data.conflicts.length > 0) {
        state.set('conflicts', data.conflicts);
        await this.showConflictResolution(data.conflicts);
      } else {
        this.goToStep(6);
        this.showCompletion(false);
      }
    } catch (error) {
      UIComponents.hideLoading();
      UIComponents.showToast('检查冲突失败: ' + error.message, 'error');
      this.goToStep(6);
      this.showCompletion(false);
    }
  },

  async showConflictResolution(conflicts) {
    const conflictList = conflicts.map(c =>
      `<li style="padding: 8px; border-bottom: 1px solid var(--border-color);">
        <div style="font-family: monospace; font-weight: 500;">${c.path}</div>
        <div style="font-size: 13px; color: var(--text-secondary);">${c.description}</div>
      </li>`
    ).join('');

    const content = `
      <p style="margin-bottom: 16px;">发现 ${conflicts.length} 个冲突文件，需要解决后才能提交。</p>
      <ul style="list-style: none; max-height: 300px; overflow-y: auto; margin-bottom: 16px;">${conflictList}</ul>
      <p style="color: var(--text-secondary); font-size: 14px;">
        您可以选择自动解决策略，或手动解决冲突后继续。
      </p>
    `;

    const { modal } = UIComponents.showModal('发现冲突', content, {
      confirmText: '自动解决（使用最新版本）',
      cancelText: '手动解决',
      onConfirm: async () => {
        await this.autoResolveConflicts();
        return true;
      },
      onCancel: () => {
        this.goToStep(6);
        this.showCompletion(true);
      }
    });
  },

  async autoResolveConflicts() {
    try {
      UIComponents.showLoading('正在解决冲突...');

      const workspace = state.get('workspace');
      const response = await apiClient.resolveAllConflicts('theirs-full', workspace);
      const taskId = response.taskId;

      await wsClient.waitForTask(taskId);

      UIComponents.hideLoading();
      UIComponents.showToast('冲突已自动解决', 'success');

      this.goToStep(6);
      this.showCompletion(false);
    } catch (error) {
      UIComponents.hideLoading();
      UIComponents.showToast('自动解决失败: ' + error.message, 'error');
      this.goToStep(6);
      this.showCompletion(true);
    }
  },

  showCompletion(hasUnresolvedConflicts) {
    const completionEl = document.getElementById('completionContent');
    const commitBtn = document.getElementById('commitBtn');

    if (!completionEl) return;

    const results = state.get('mergeResults');
    const successCount = results.filter(r => r.status === 'success').length;
    const conflictCount = results.filter(r => r.status === 'conflict').length;
    const failedCount = results.filter(r => r.status === 'failed').length;

    if (hasUnresolvedConflicts) {
      completionEl.innerHTML = `
        <div class="alert alert-warning">
          <div class="alert-icon">⚠</div>
          <div class="alert-content">
            <div class="alert-title">存在未解决的冲突</div>
            <div class="alert-message">请手动解决冲突后再提交更改。</div>
          </div>
        </div>
        <div class="summary-section">
          <h3 class="summary-title">合并结果</h3>
          <div class="summary-list">
            <div class="summary-item">
              <span class="summary-label">成功</span>
              <span class="summary-value text-success">${successCount} 个</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">冲突</span>
              <span class="summary-value text-warning">${conflictCount} 个</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">失败</span>
              <span class="summary-value text-danger">${failedCount} 个</span>
            </div>
          </div>
        </div>
      `;
      commitBtn.classList.add('hidden');
    } else {
      completionEl.innerHTML = `
        <div class="alert alert-success">
          <div class="alert-icon">✓</div>
          <div class="alert-content">
            <div class="alert-title">合并成功完成</div>
            <div class="alert-message">所有版本已成功合并，可以提交更改了。</div>
          </div>
        </div>
        <div class="summary-section">
          <h3 class="summary-title">合并结果</h3>
          <div class="summary-list">
            <div class="summary-item">
              <span class="summary-label">成功</span>
              <span class="summary-value text-success">${successCount} 个</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">冲突</span>
              <span class="summary-value">${conflictCount} 个（已解决）</span>
            </div>
          </div>
        </div>
        <div class="form-group" style="margin-top: 30px;">
          <label class="form-label">提交信息</label>
          <textarea id="commitMessage" class="form-textarea" placeholder="输入提交信息..."></textarea>
        </div>
      `;
      commitBtn.classList.remove('hidden');

      // Generate default commit message
      const selected = state.get('selectedRevisions');
      const branchPath = state.get('branchPath');
      const sorted = [...selected].sort((a, b) => a.revision - b.revision);
      const defaultMessage = `Merge r${sorted[0].revision}-r${sorted[sorted.length - 1].revision} from ${branchPath}`;

      const textarea = document.getElementById('commitMessage');
      if (textarea) {
        textarea.value = defaultMessage;
      }
    }
  },

  async commitChanges() {
    const textarea = document.getElementById('commitMessage');
    const message = textarea ? textarea.value.trim() : '';

    if (!message) {
      UIComponents.showToast('请输入提交信息', 'warning');
      return;
    }

    try {
      UIComponents.showLoading('正在提交...');

      const workspace = state.get('workspace');
      const response = await apiClient.commit(message, workspace);
      const taskId = response.taskId;

      await wsClient.waitForTask(taskId);

      UIComponents.hideLoading();
      UIComponents.showToast('提交成功！', 'success');

      // Clear state and redirect
      setTimeout(() => {
        state.reset();
        window.location.href = 'index.html';
      }, 2000);
    } catch (error) {
      UIComponents.hideLoading();
      UIComponents.showToast('提交失败: ' + error.message, 'error');
    }
  }
};

// Initialize wizard when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => wizard.init());
} else {
  wizard.init();
}
