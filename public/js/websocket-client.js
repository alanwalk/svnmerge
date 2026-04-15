// SVN Merge Tool - WebSocket Client

class WebSocketClient {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 1000;
    this.listeners = new Map();
    this.taskListeners = new Map();
    this.connected = false;
    this.intentionallyClosed = false;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('[WebSocket] Connected to daemon');
          this.connected = true;
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('[WebSocket] Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          this.emit('error', error);
        };

        this.ws.onclose = () => {
          console.log('[WebSocket] Disconnected from daemon');
          this.connected = false;
          this.emit('disconnected');

          if (!this.intentionallyClosed) {
            this.reconnect();
          }
        };

        // Connection timeout
        setTimeout(() => {
          if (this.ws.readyState !== WebSocket.OPEN) {
            reject(new Error('Connection timeout'));
          }
        }, 5000);

      } catch (error) {
        reject(error);
      }
    });
  }

  reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnection attempts reached');
      this.emit('reconnect-failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
      this.connect().catch(error => {
        console.error('[WebSocket] Reconnection failed:', error);
      });
    }, delay);
  }

  disconnect() {
    this.intentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  handleMessage(message) {
    console.log('[WebSocket] Received:', message.type, 'for task', message.taskId);

    // Emit general event
    this.emit('message', message);

    // Emit type-specific event
    this.emit(message.type, message);

    // Emit task-specific event
    if (message.taskId) {
      const taskListeners = this.taskListeners.get(message.taskId);
      if (taskListeners) {
        taskListeners.forEach(callback => callback(message));

        // Clean up completed/failed/cancelled task listeners
        if (['complete', 'error', 'cancelled'].includes(message.type)) {
          this.taskListeners.delete(message.taskId);
        }
      }
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WebSocket] Error in ${event} callback:`, error);
        }
      });
    }
  }

  onTask(taskId, callback) {
    if (!this.taskListeners.has(taskId)) {
      this.taskListeners.set(taskId, []);
    }
    this.taskListeners.get(taskId).push(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.taskListeners.get(taskId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  onTaskComplete(taskId, callback) {
    return this.onTask(taskId, (message) => {
      if (message.type === 'complete') {
        callback(message);
      }
    });
  }

  onTaskProgress(taskId, callback) {
    return this.onTask(taskId, (message) => {
      if (message.type === 'progress') {
        callback(message);
      }
    });
  }

  onTaskError(taskId, callback) {
    return this.onTask(taskId, (message) => {
      if (message.type === 'error') {
        callback(message);
      }
    });
  }

  waitForTask(taskId, timeout = 300000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        unsubscribe();
        reject(new Error('Task timeout'));
      }, timeout);

      const unsubscribe = this.onTask(taskId, (message) => {
        if (message.type === 'complete') {
          clearTimeout(timer);
          unsubscribe();
          resolve(message.result);
        } else if (message.type === 'error') {
          clearTimeout(timer);
          unsubscribe();
          reject(new Error(message.error));
        } else if (message.type === 'cancelled') {
          clearTimeout(timer);
          unsubscribe();
          reject(new Error('Task cancelled'));
        }
      });
    });
  }

  isConnected() {
    return this.connected && this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebSocketClient;
}
