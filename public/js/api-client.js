// SVN Merge Tool - API Client

class APIClient {
  constructor(baseURL) {
    this.baseURL = baseURL;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`[API] Request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${endpoint}?${queryString}` : endpoint;
    return this.request(url, { method: 'GET' });
  }

  async post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Health Check
  async health() {
    return this.get('/api/health');
  }

  // Server Info
  async info() {
    return this.get('/api/info');
  }

  // Repository Info
  async getRepoInfo(cwd = null) {
    const params = cwd ? { cwd } : {};
    return this.get('/api/repo/info', params);
  }

  // Query Revisions (async task)
  async queryRevisions(options = {}) {
    const {
      branchPath,
      limit = 100,
      offset = 0,
      cwd = null,
      filter = {}
    } = options;

    return this.post('/api/revisions/query', {
      branchPath,
      limit,
      offset,
      cwd,
      filter
    });
  }

  // Get Revision Detail (sync, cached)
  async getRevisionDetail(revision, branchPath, cwd = null) {
    const params = { branchPath };
    if (cwd) params.cwd = cwd;
    return this.get(`/api/revisions/${revision}/detail`, params);
  }

  // Start Merge (async task)
  async startMerge(branchPath, revisions, cwd = null) {
    return this.post('/api/merge/start', {
      branchPath,
      revisions,
      cwd
    });
  }

  // Cancel Task
  async cancelTask(taskId) {
    return this.post('/api/merge/cancel', { taskId });
  }

  // Get Conflicts
  async getConflicts(cwd = null) {
    const params = cwd ? { cwd } : {};
    return this.get('/api/conflicts', params);
  }

  // Resolve Single Conflict (async task)
  async resolveConflict(filepath, strategy, revision = null, cwd = null) {
    return this.post('/api/conflicts/resolve', {
      filepath,
      strategy,
      revision,
      cwd
    });
  }

  // Resolve All Conflicts (async task)
  async resolveAllConflicts(strategy, cwd = null) {
    return this.post('/api/conflicts/resolve-all', {
      strategy,
      cwd
    });
  }

  // Get MergeInfo
  async getMergeInfo(cwd = null) {
    const params = cwd ? { cwd } : {};
    return this.get('/api/mergeinfo', params);
  }

  // Commit Changes (async task)
  async commit(message, cwd = null) {
    return this.post('/api/commit', {
      message,
      cwd
    });
  }

  // Get Task Status
  async getTaskStatus(taskId) {
    return this.get(`/api/tasks/${taskId}`);
  }

  // Get All Tasks
  async getAllTasks() {
    return this.get('/api/tasks');
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIClient;
}
