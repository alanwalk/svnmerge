// SVN Merge Tool - UI Components

class UIComponents {
  // Loading Spinner
  static showLoading(message = '加载中...') {
    const existing = document.getElementById('loading-overlay');
    if (existing) return;

    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
      <div class="loading-content">
        <div class="spinner spinner-lg"></div>
        <div class="loading-message">${message}</div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  static hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  static updateLoadingMessage(message) {
    const messageEl = document.querySelector('.loading-message');
    if (messageEl) {
      messageEl.textContent = message;
    }
  }

  // Toast Notifications
  static showToast(message, type = 'info', title = '', duration = 5000) {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const icons = {
      success: '✓',
      error: '✗',
      warning: '⚠',
      info: 'ℹ'
    };

    const titles = {
      success: title || '成功',
      error: title || '错误',
      warning: title || '警告',
      info: title || '提示'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${icons[type]}</div>
      <div class="toast-content">
        <div class="toast-title">${titles[type]}</div>
        <div class="toast-message">${message}</div>
      </div>
      <button class="toast-close">×</button>
    `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.remove();
    });

    if (duration > 0) {
      setTimeout(() => {
        toast.remove();
      }, duration);
    }

    return toast;
  }

  // Modal Dialog
  static showModal(title, content, options = {}) {
    const {
      showCancel = true,
      confirmText = '确定',
      cancelText = '取消',
      onConfirm = null,
      onCancel = null,
      size = 'medium'
    } = options;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = `modal modal-${size}`;
    modal.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">${title}</div>
        <button class="modal-close">×</button>
      </div>
      <div class="modal-body">
        ${content}
      </div>
      <div class="modal-footer">
        ${showCancel ? `<button class="btn btn-secondary" data-action="cancel">${cancelText}</button>` : ''}
        <button class="btn btn-primary" data-action="confirm">${confirmText}</button>
      </div>
    `;

    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    const close = () => {
      overlay.remove();
    };

    modal.querySelector('.modal-close').addEventListener('click', () => {
      if (onCancel) onCancel();
      close();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        if (onCancel) onCancel();
        close();
      }
    });

    const cancelBtn = modal.querySelector('[data-action="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (onCancel) onCancel();
        close();
      });
    }

    const confirmBtn = modal.querySelector('[data-action="confirm"]');
    confirmBtn.addEventListener('click', () => {
      if (onConfirm) {
        const result = onConfirm();
        if (result !== false) {
          close();
        }
      } else {
        close();
      }
    });

    return { modal, overlay, close };
  }

  // Confirm Dialog
  static confirm(message, title = '确认', options = {}) {
    return new Promise((resolve) => {
      this.showModal(title, `<p>${message}</p>`, {
        ...options,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      });
    });
  }

  // Alert Dialog
  static alert(message, title = '提示', type = 'info') {
    return new Promise((resolve) => {
      this.showModal(title, `<p>${message}</p>`, {
        showCancel: false,
        onConfirm: () => resolve()
      });
    });
  }

  // Progress Bar
  static createProgressBar(container, options = {}) {
    const {
      current = 0,
      total = 100,
      showPercentage = true,
      type = 'primary'
    } = options;

    const progressBar = document.createElement('div');
    progressBar.className = `progress-bar ${type}`;

    const percent = total > 0 ? Math.round((current / total) * 100) : 0;

    progressBar.innerHTML = `
      <div class="progress-fill" style="width: ${percent}%">
        ${showPercentage ? `${percent}%` : ''}
      </div>
    `;

    if (typeof container === 'string') {
      container = document.querySelector(container);
    }

    if (container) {
      container.appendChild(progressBar);
    }

    return {
      element: progressBar,
      update: (current, total) => {
        const percent = total > 0 ? Math.round((current / total) * 100) : 0;
        const fill = progressBar.querySelector('.progress-fill');
        fill.style.width = `${percent}%`;
        if (showPercentage) {
          fill.textContent = `${percent}%`;
        }
      },
      setType: (newType) => {
        progressBar.className = `progress-bar ${newType}`;
      }
    };
  }

  // Empty State
  static createEmptyState(message, icon = '📭', actionText = '', onAction = null) {
    const emptyState = document.createElement('div');
    emptyState.className = 'empty-state';
    emptyState.innerHTML = `
      <div class="empty-state-icon">${icon}</div>
      <div class="empty-state-title">暂无数据</div>
      <div class="empty-state-message">${message}</div>
      ${actionText ? `<button class="btn btn-primary">${actionText}</button>` : ''}
    `;

    if (actionText && onAction) {
      const btn = emptyState.querySelector('button');
      btn.addEventListener('click', onAction);
    }

    return emptyState;
  }

  // Skeleton Loading
  static createSkeleton(type = 'text', count = 3) {
    const skeleton = document.createElement('div');

    if (type === 'text') {
      for (let i = 0; i < count; i++) {
        const line = document.createElement('div');
        line.className = 'skeleton skeleton-text';
        skeleton.appendChild(line);
      }
    } else if (type === 'card') {
      for (let i = 0; i < count; i++) {
        const card = document.createElement('div');
        card.className = 'skeleton skeleton-card';
        skeleton.appendChild(card);
      }
    } else if (type === 'title') {
      const title = document.createElement('div');
      title.className = 'skeleton skeleton-title';
      skeleton.appendChild(title);
    }

    return skeleton;
  }

  // Badge
  static createBadge(text, type = 'primary') {
    const badge = document.createElement('span');
    badge.className = `badge badge-${type}`;
    badge.textContent = text;
    return badge;
  }

  // Alert
  static createAlert(message, type = 'info', title = '') {
    const icons = {
      success: '✓',
      error: '✗',
      warning: '⚠',
      info: 'ℹ'
    };

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
      <div class="alert-icon">${icons[type]}</div>
      <div class="alert-content">
        ${title ? `<div class="alert-title">${title}</div>` : ''}
        <div class="alert-message">${message}</div>
      </div>
    `;

    return alert;
  }

  // Revision Card Component
  static createRevisionCard(revision, options = {}) {
    const {
      selectable = true,
      selected = false,
      expandable = true,
      onSelect = null,
      onExpand = null
    } = options;

    const card = document.createElement('div');
    card.className = `revision-item ${selected ? 'selected' : ''}`;
    card.dataset.revision = revision.revision;

    const date = new Date(revision.date);
    const formattedDate = date.toLocaleString('zh-CN');

    card.innerHTML = `
      ${selectable ? `
        <input type="checkbox" class="revision-checkbox" ${selected ? 'checked' : ''}>
      ` : ''}
      <div class="revision-info">
        <div class="revision-header">
          <span class="revision-number">r${revision.revision}</span>
          <span class="revision-author">${revision.author}</span>
          <span class="revision-date">${formattedDate}</span>
        </div>
        <div class="revision-message collapsed">${revision.message}</div>
        ${expandable ? `
          <span class="revision-expand">展开详情 ▼</span>
        ` : ''}
        <div class="revision-files hidden">
          <div class="revision-files-header">
            <span class="spinner"></span>
            <span>加载文件列表...</span>
          </div>
        </div>
      </div>
    `;

    if (selectable) {
      const checkbox = card.querySelector('.revision-checkbox');
      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        if (onSelect) {
          onSelect(revision, checkbox.checked);
        }
        if (checkbox.checked) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      });
    }

    if (expandable) {
      const expandBtn = card.querySelector('.revision-expand');
      const message = card.querySelector('.revision-message');
      const filesDiv = card.querySelector('.revision-files');

      expandBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = !message.classList.contains('collapsed');

        if (isExpanded) {
          message.classList.add('collapsed');
          filesDiv.classList.add('hidden');
          expandBtn.textContent = '展开详情 ▼';
        } else {
          message.classList.remove('collapsed');
          filesDiv.classList.remove('hidden');
          expandBtn.textContent = '收起详情 ▲';

          if (onExpand && !filesDiv.dataset.loaded) {
            onExpand(revision, filesDiv);
          }
        }
      });
    }

    return card;
  }

  // Update Revision Files
  static updateRevisionFiles(filesDiv, files) {
    filesDiv.dataset.loaded = 'true';

    if (!files || files.length === 0) {
      filesDiv.innerHTML = `
        <div class="revision-files-header">
          <span>无文件变更</span>
        </div>
      `;
      return;
    }

    filesDiv.innerHTML = `
      <div class="revision-files-header">
        <span>变更文件 (${files.length})</span>
      </div>
      <ul class="revision-files-list">
        ${files.map(file => `<li>${file}</li>`).join('')}
      </ul>
    `;
  }

  // Debounce utility
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Throttle utility
  static throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIComponents;
}
