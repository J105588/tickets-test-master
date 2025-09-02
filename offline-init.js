// offline-init.js
// Service Worker登録とオフライン機能の初期化

import { offlineSync } from './offline-sync.js';
import { offlineDB } from './offline-db.js';
import { priorityLoader } from './priority-loader.js';

class OfflineInitializer {
  constructor() {
    this.isInitialized = false;
    this.registration = null;
  }

  // 初期化
  async init() {
    if (this.isInitialized) return;

    try {
      console.log('オフライン機能初期化開始');
      
      // 優先度付きで初期化を実行
      await this.initWithPriority();
      
    } catch (error) {
      console.error('オフライン機能初期化エラー:', error);
    }
  }

  // 優先度付き初期化
  async initWithPriority() {
    try {
      // 1. クリティカル: IndexedDB初期化（即座に実行）
      await priorityLoader.loadCritical(async () => {
        await offlineDB.init();
        console.log('IndexedDB初期化完了');
      });

      // 2. 高優先度: Service Worker登録（並列実行）
      await priorityLoader.loadHigh(async () => {
        await this.registerServiceWorker();
        console.log('Service Worker登録完了');
      });

      // 3. 通常優先度: Service Workerメッセージリスナー設定
      await priorityLoader.loadNormal(async () => {
        this.setupServiceWorkerListeners();
        console.log('Service Workerリスナー設定完了');
      });

      // 4. 低優先度: 初期データ同期（バックグラウンド）
      await priorityLoader.loadLow(async () => {
        this.performInitialSync();
        console.log('初期データ同期完了');
      });

      this.isInitialized = true;
      console.log('オフライン機能初期化完了');
      
    } catch (error) {
      console.error('優先度付き初期化エラー:', error);
      // エラーが発生しても基本的な機能は利用可能にする
      this.isInitialized = true;
    }
  }

  // Service Worker登録
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/'
        });
        
        console.log('Service Worker登録成功:', this.registration);
        
        // インストール完了を待つ
        if (this.registration.installing) {
          await new Promise((resolve) => {
            this.registration.installing.addEventListener('statechange', () => {
              if (this.registration.installing.state === 'installed') {
                resolve();
              }
            });
          });
        }
        
        return this.registration;
      } catch (error) {
        console.error('Service Worker登録エラー:', error);
        throw error;
      }
    } else {
      console.warn('Service Workerがサポートされていません');
      return null;
    }
  }

  // Service Workerメッセージリスナー設定
  setupServiceWorkerListeners() {
    if (this.registration) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'background-sync':
            console.log('バックグラウンド同期要求受信');
            this.performBackgroundSync();
            break;
            
          default:
            console.log('Service Workerメッセージ:', type, data);
        }
      });
    }
  }

  // 初期データ同期
  async performInitialSync() {
    try {
      // 現在のパフォーマンスIDを取得（URLから）
      const urlParams = new URLSearchParams(window.location.search);
      const performanceId = urlParams.get('performance');
      
      if (performanceId) {
        offlineSync.setPerformanceId(performanceId);
        
        // オンライン時は初期データを取得
        if (navigator.onLine) {
          console.log('初期データ同期開始');
          await offlineSync.syncData();
        } else {
          console.log('オフライン状態のため初期同期スキップ');
        }
      }
    } catch (error) {
      console.error('初期同期エラー:', error);
    }
  }

  // バックグラウンド同期実行
  async performBackgroundSync() {
    try {
      console.log('バックグラウンド同期実行');
      
      // 未同期の変更を同期
      await offlineSync.syncChanges();
      
      // データ同期
      if (offlineSync.performanceId) {
        await offlineSync.syncData();
      }
      
      console.log('バックグラウンド同期完了');
    } catch (error) {
      console.error('バックグラウンド同期エラー:', error);
    }
  }

  // バックグラウンド同期登録
  async registerBackgroundSync() {
    if (this.registration && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        await this.registration.sync.register('background-sync');
        console.log('バックグラウンド同期登録完了');
      } catch (error) {
        console.error('バックグラウンド同期登録エラー:', error);
      }
    }
  }

  // プッシュ通知登録
  async registerPushNotification() {
    if (this.registration && 'pushManager' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const subscription = await this.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: this.urlBase64ToUint8Array('YOUR_VAPID_PUBLIC_KEY')
          });
          console.log('プッシュ通知登録完了:', subscription);
          return subscription;
        }
      } catch (error) {
        console.error('プッシュ通知登録エラー:', error);
      }
    }
    return null;
  }

  // VAPID公開鍵の変換
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // キャッシュクリア
  async clearCache() {
    if (this.registration) {
      try {
        // Service Workerにキャッシュクリアを要求
        this.registration.active.postMessage({
          type: 'cache-clear'
        });
        
        // 優先度付きローダーにも通知
        await priorityLoader.clearCache();
        
        console.log('キャッシュクリア完了');
      } catch (error) {
        console.error('キャッシュクリアエラー:', error);
      }
    }
  }

  // キャッシュ状態の取得
  async getCacheStatus() {
    try {
      const status = await priorityLoader.getCacheStatus();
      return status;
    } catch (error) {
      console.error('キャッシュ状態取得エラー:', error);
      return {};
    }
  }

  // リソースの事前読み込み
  async preloadResource(url, priority = 'normal') {
    try {
      await priorityLoader.preloadResource(url, priority);
      console.log(`リソース事前読み込み要求: ${url} (${priority})`);
    } catch (error) {
      console.error('リソース事前読み込みエラー:', error);
    }
  }

  // オフライン機能の状態を取得
  async getStatus() {
    const debugInfo = await offlineSync.getDebugInfo();
    const lastSyncTime = await offlineSync.getLastSyncTime();
    const unsyncedChanges = await offlineDB.getUnsyncedChanges();
    
    return {
      isOnline: navigator.onLine,
      serviceWorkerActive: !!this.registration,
      lastSyncTime: lastSyncTime,
      lastSyncDate: new Date(lastSyncTime).toLocaleString(),
      unsyncedChangesCount: unsyncedChanges.length,
      performanceId: offlineSync.performanceId,
      isSyncing: offlineSync.isSyncing,
      ...debugInfo
    };
  }

  // デバッグ情報の表示
  async showDebugInfo() {
    const status = await this.getStatus();
    const cacheStatus = await this.getCacheStatus();
    
    const debugInfo = `
オフライン機能デバッグ情報:
- オンライン状態: ${status.isOnline ? 'オンライン' : 'オフライン'}
- Service Worker: ${status.serviceWorkerActive ? 'アクティブ' : '非アクティブ'}
- パフォーマンスID: ${status.performanceId || '未設定'}
- 最後の同期: ${status.lastSyncDate}
- 未同期変更: ${status.unsyncedChangesCount}件
- 同期中: ${status.isSyncing ? 'はい' : 'いいえ'}

キャッシュ状態:
${Object.entries(cacheStatus).map(([name, info]) => 
  `- ${name}: ${info.count}件`
).join('\n')}
    `;
    
    console.log(debugInfo);
    return { ...status, cacheStatus };
  }
}

// シングルトンインスタンス
const offlineInit = new OfflineInitializer();

// ページ読み込み時に自動初期化
document.addEventListener('DOMContentLoaded', () => {
  offlineInit.init();
});

// グローバルに公開（デバッグ用）
window.offlineInit = offlineInit;

export { OfflineInitializer, offlineInit };
