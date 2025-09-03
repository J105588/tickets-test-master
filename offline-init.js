// offline-init.js
// オフライン機能の初期化とセットアップ

import { fallbackManager } from './fallback-manager.js';
import { dataSyncAPI } from './data-sync-api.js';
import { debugLog } from './config.js';

class OfflineInit {
  constructor() {
    this.initialized = false;
    this.initPromise = null;
  }

  // オフライン機能の初期化
  async init() {
    if (this.initialized) {
      return { success: true, message: '既に初期化済みです' };
    }

    if (this.initPromise) {
      return await this.initPromise;
    }

    this.initPromise = this._performInit();
    const result = await this.initPromise;
    
    if (result.success) {
      this.initialized = true;
    }
    
    return result;
  }

  async _performInit() {
    try {
      debugLog('オフライン機能の初期化を開始');

      // フォールバックマネージャーの初期化
      await fallbackManager.init();
      
      // データ同期APIの初期化
      // (dataSyncAPIは既に初期化済み)
      
      // オフライン機能の可用性をチェック
      const isOfflineAvailable = fallbackManager.isOfflineAvailable();
      const isOnline = await fallbackManager.isOnlineStatus();
      
      debugLog(`オフライン機能の初期化完了 - オフライン利用可能: ${isOfflineAvailable}, オンライン: ${isOnline}`);
      
      return {
        success: true,
        message: 'オフライン機能の初期化が完了しました',
        offlineAvailable: isOfflineAvailable,
        online: isOnline
      };
    } catch (error) {
      console.error('オフライン機能の初期化エラー:', error);
      return {
        success: false,
        error: error.message || 'オフライン機能の初期化に失敗しました'
      };
    }
  }

  // オフライン機能の状態を取得
  async getStatus() {
    return {
      initialized: this.initialized,
      offlineAvailable: fallbackManager.isOfflineAvailable(),
      fallbackMode: fallbackManager.isFallbackMode(),
      syncStatus: await dataSyncAPI.getSyncStatus()
    };
  }

  // オフライン機能の再初期化
  async reinit() {
    debugLog('オフライン機能の再初期化を開始');
    
    this.initialized = false;
    this.initPromise = null;
    
    // フォールバックマネージャーの再試行
    await fallbackManager.retryOfflineFunctionality();
    
    return await this.init();
  }

  // オフライン機能の無効化
  disable() {
    debugLog('オフライン機能を無効化');
    fallbackManager.enableFallbackMode();
    this.initialized = false;
  }

  // オフライン機能の有効化
  async enable() {
    debugLog('オフライン機能を有効化');
    fallbackManager.disableFallbackMode();
    return await this.reinit();
  }
}

// シングルトンインスタンス
const offlineInit = new OfflineInit();

// グローバルに公開
window.offlineInit = offlineInit;

// 自動初期化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const result = await offlineInit.init();
    if (result.success) {
      debugLog('オフライン機能の自動初期化完了');
    } else {
      console.warn('オフライン機能の自動初期化に失敗:', result.error);
    }
  } catch (error) {
    console.error('オフライン機能の自動初期化でエラー:', error);
  }
});

export { OfflineInit, offlineInit };
