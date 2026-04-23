/**
 * Chrome Promise Wrapper
 *
 * Provides promise-based wrappers for commonly used Chrome APIs.
 * Used only in new orchestrator code for cleaner async/await patterns.
 *
 * Note: Do NOT retroactively rewrite existing callback-based modules.
 * This is for incremental adoption in new code only.
 */

export const chromePromise = {
  /**
   * Query tabs with promise-based API
   */
  tabsQuery: (queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> => {
    return new Promise((resolve) => {
      chrome.tabs.query(queryInfo, resolve);
    });
  },

  /**
   * Get single tab by ID with promise-based API
   */
  tabsGet: (tabId: number): Promise<chrome.tabs.Tab> => {
    return new Promise((resolve, reject) => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(tab);
        }
      });
    });
  },

  /**
   * Send message to tab with promise-based API
   */
  tabsSendMessage: <T = any>(
    tabId: number,
    message: any
  ): Promise<T> => {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, message, (response: T) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  },

  /**
   * Send message to runtime with promise-based API
   */
  runtimeSendMessage: <T = any>(message: any): Promise<T> => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response: T) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      });
    });
  },

  /**
   * Get from local storage with promise-based API
   */
  storageLocalGet: (keys: string | string[]): Promise<{ [key: string]: any }> => {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys as any, resolve);
    });
  },
};
