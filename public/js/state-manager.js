// SVN Merge Tool - State Manager

class StateManager {
  constructor() {
    this.state = {
      // Connection
      connected: false,

      // Repository
      repoInfo: null,

      // Wizard
      currentStep: 1,
      mergeType: 'range', // 'range' or 'specific'

      // Source Branch
      branchPath: '',

      // Revisions
      revisions: [],
      selectedRevisions: [],
      revisionsLoading: false,

      // Filter
      filter: {
        author: '',
        message: '',
        dateFrom: '',
        dateTo: ''
      },

      // Merge
      mergeResults: [],
      mergeProgress: {
        current: 0,
        total: 0,
        message: ''
      },
      currentTaskId: null,

      // Conflicts
      conflicts: [],

      // Commit
      commitMessage: ''
    };

    this.listeners = new Map();
    this.storageKey = 'svnmerge-state';

    // Load persisted state
    this.loadState();
  }

  // Get state
  get(key) {
    if (key) {
      return this.state[key];
    }
    return { ...this.state };
  }

  // Set state
  set(key, value) {
    if (typeof key === 'object') {
      // Batch update
      Object.keys(key).forEach(k => {
        this.state[k] = key[k];
        this.emit(k, key[k]);
      });
    } else {
      this.state[key] = value;
      this.emit(key, value);
    }

    this.saveState();
  }

  // Update nested state
  update(key, updater) {
    const currentValue = this.state[key];
    const newValue = typeof updater === 'function' ? updater(currentValue) : updater;
    this.set(key, newValue);
  }

  // Reset state
  reset() {
    this.state = {
      connected: this.state.connected,
      repoInfo: this.state.repoInfo,
      currentStep: 1,
      mergeType: 'range',
      branchPath: '',
      revisions: [],
      selectedRevisions: [],
      revisionsLoading: false,
      filter: {
        author: '',
        message: '',
        dateFrom: '',
        dateTo: ''
      },
      mergeResults: [],
      mergeProgress: {
        current: 0,
        total: 0,
        message: ''
      },
      currentTaskId: null,
      conflicts: [],
      commitMessage: ''
    };

    this.saveState();
    this.emit('reset');
  }

  // Subscribe to state changes
  subscribe(key, callback) {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  // Emit state change
  emit(key, value) {
    const callbacks = this.listeners.get(key);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(value, this.state);
        } catch (error) {
          console.error(`[State] Error in ${key} callback:`, error);
        }
      });
    }

    // Emit to wildcard listeners
    const wildcardCallbacks = this.listeners.get('*');
    if (wildcardCallbacks) {
      wildcardCallbacks.forEach(callback => {
        try {
          callback(key, value, this.state);
        } catch (error) {
          console.error('[State] Error in wildcard callback:', error);
        }
      });
    }
  }

  // Save state to localStorage
  saveState() {
    try {
      const persistedState = {
        branchPath: this.state.branchPath,
        mergeType: this.state.mergeType,
        filter: this.state.filter
      };
      localStorage.setItem(this.storageKey, JSON.stringify(persistedState));
    } catch (error) {
      console.error('[State] Failed to save state:', error);
    }
  }

  // Load state from localStorage
  loadState() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const persistedState = JSON.parse(saved);
        Object.assign(this.state, persistedState);
      }
    } catch (error) {
      console.error('[State] Failed to load state:', error);
    }
  }

  // Clear persisted state
  clearPersistedState() {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error('[State] Failed to clear state:', error);
    }
  }

  // Helper: Add selected revision
  addSelectedRevision(revision) {
    const selected = this.state.selectedRevisions;
    if (!selected.find(r => r.revision === revision.revision)) {
      this.set('selectedRevisions', [...selected, revision]);
    }
  }

  // Helper: Remove selected revision
  removeSelectedRevision(revisionNumber) {
    const selected = this.state.selectedRevisions;
    this.set('selectedRevisions', selected.filter(r => r.revision !== revisionNumber));
  }

  // Helper: Toggle selected revision
  toggleSelectedRevision(revision) {
    const selected = this.state.selectedRevisions;
    const exists = selected.find(r => r.revision === revision.revision);

    if (exists) {
      this.removeSelectedRevision(revision.revision);
    } else {
      this.addSelectedRevision(revision);
    }
  }

  // Helper: Clear selected revisions
  clearSelectedRevisions() {
    this.set('selectedRevisions', []);
  }

  // Helper: Set filter
  setFilter(key, value) {
    this.set('filter', {
      ...this.state.filter,
      [key]: value
    });
  }

  // Helper: Clear filter
  clearFilter() {
    this.set('filter', {
      author: '',
      message: '',
      dateFrom: '',
      dateTo: ''
    });
  }

  // Helper: Update merge progress
  updateMergeProgress(current, total, message) {
    this.set('mergeProgress', { current, total, message });
  }

  // Helper: Add merge result
  addMergeResult(result) {
    this.set('mergeResults', [...this.state.mergeResults, result]);
  }

  // Helper: Update merge result
  updateMergeResult(revision, updates) {
    const results = this.state.mergeResults.map(r =>
      r.revision === revision ? { ...r, ...updates } : r
    );
    this.set('mergeResults', results);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StateManager;
}
