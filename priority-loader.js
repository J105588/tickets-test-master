// priority-loader.js
// 優先度付きリソースローダー（通信速度最適化）

class PriorityLoader {
  constructor() {
    this.loadingQueue = [];
    this.isLoading = false;
    this.priorities = {
      CRITICAL: 0,    // 必須リソース（UI表示に必要）
      HIGH: 1,        // 高優先度（主要機能）
      NORMAL: 2,      // 通常優先度（オフライン機能）
      LOW: 3,         // 低優先度（バックグラウンド機能）
      BACKGROUND: 4   // バックグラウンド（非同期）
    };
    this.serviceWorker = null;
    this.init();
  }

  // 初期化
  async init() {
    if ('serviceWorker' in navigator) {
      this.serviceWorker = navigator.serviceWorker;
      // Service Workerからのメッセージを受信
      this.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
    }
  }

  // Service Workerメッセージの処理
  handleServiceWorkerMessage(event) {
    const { type, data } = event.data;
    switch (type) {
      case 'cache-status':
        console.log('キャッシュ状態:', data);
        break;
      default:
        console.log('Service Workerメッセージ:', type, data);
    }
  }

  // リソースを優先度付きでロード
  async loadWithPriority(loader, priority = this.priorities.NORMAL) {
    return new Promise((resolve, reject) => {
      this.loadingQueue.push({
        loader,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      });

      // 優先度順にソート
      this.loadingQueue.sort((a, b) => a.priority - b.priority);

      // ローディング開始
      this.processQueue();
    });
  }

  // キューの処理
  async processQueue() {
    if (this.isLoading || this.loadingQueue.length === 0) {
      return;
    }

    this.isLoading = true;

    while (this.loadingQueue.length > 0) {
      const item = this.loadingQueue.shift();
      
      try {
        console.log(`優先度 ${item.priority} のリソースをロード中...`);
        
        // Service Workerに事前読み込みを通知
        if (this.serviceWorker && this.serviceWorker.controller) {
          this.notifyPreload(item);
        }
        
        const result = await item.loader();
        item.resolve(result);
      } catch (error) {
        console.error('リソースロードエラー:', error);
        item.reject(error);
      }

      // 高優先度リソースの場合は少し待機
      if (item.priority <= this.priorities.HIGH) {
        await this.delay(50);
      }
    }

    this.isLoading = false;
  }

  // Service Workerに事前読み込みを通知
  notifyPreload(item) {
    try {
      // ローダーからURLを抽出（簡易版）
      const priority = this.getPriorityName(item.priority);
      this.serviceWorker.controller.postMessage({
        type: 'preload-resource',
        data: {
          url: this.extractUrlFromLoader(item.loader),
          priority: priority
        }
      });
    } catch (error) {
      console.warn('事前読み込み通知失敗:', error);
    }
  }

  // 優先度名の取得
  getPriorityName(priority) {
    for (const [name, value] of Object.entries(this.priorities)) {
      if (value === priority) {
        return name.toLowerCase();
      }
    }
    return 'normal';
  }

  // ローダーからURLを抽出（簡易版）
  extractUrlFromLoader(loader) {
    // 実際の実装では、ローダー関数の内容を解析してURLを抽出
    // ここでは簡易的にデフォルト値を返す
    return '/api/data';
  }

  // 遅延処理
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // クリティカルリソースの即座ロード
  async loadCritical(loader) {
    return this.loadWithPriority(loader, this.priorities.CRITICAL);
  }

  // 高優先度リソースのロード
  async loadHigh(loader) {
    return this.loadWithPriority(loader, this.priorities.HIGH);
  }

  // 通常優先度リソースのロード
  async loadNormal(loader) {
    return this.loadWithPriority(loader, this.priorities.NORMAL);
  }

  // 低優先度リソースのロード
  async loadLow(loader) {
    return this.loadWithPriority(loader, this.priorities.LOW);
  }

  // バックグラウンドリソースのロード
  async loadBackground(loader) {
    return this.loadWithPriority(loader, this.priorities.BACKGROUND);
  }

  // 複数リソースの並列ロード（同じ優先度）
  async loadParallel(loaders, priority = this.priorities.NORMAL) {
    const promises = loaders.map(loader => this.loadWithPriority(loader, priority));
    return Promise.all(promises);
  }

  // キューの状態を取得
  getQueueStatus() {
    return {
      queueLength: this.loadingQueue.length,
      isLoading: this.isLoading,
      priorities: this.loadingQueue.map(item => item.priority)
    };
  }

  // キャッシュクリア
  async clearCache() {
    if (this.serviceWorker && this.serviceWorker.controller) {
      this.serviceWorker.controller.postMessage({
        type: 'cache-clear'
      });
    }
  }

  // キャッシュ状態の取得
  async getCacheStatus() {
    return new Promise((resolve) => {
      if (this.serviceWorker && this.serviceWorker.controller) {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          resolve(event.data);
        };
        
        this.serviceWorker.controller.postMessage({
          type: 'cache-status'
        }, [channel.port2]);
      } else {
        resolve({});
      }
    });
  }

  // リソースの事前読み込み
  async preloadResource(url, priority = 'normal') {
    if (this.serviceWorker && this.serviceWorker.controller) {
      this.serviceWorker.controller.postMessage({
        type: 'preload-resource',
        data: { url, priority }
      });
    }
  }

  // キューのクリア
  clearQueue() {
    this.loadingQueue = [];
    this.isLoading = false;
  }
}

// シングルトンインスタンス
const priorityLoader = new PriorityLoader();

export { PriorityLoader, priorityLoader };
