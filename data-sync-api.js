// data-sync-api.js
// データ同期API - オフライン機能とサーバー間のデータ同期を管理

import GasAPI from './api.js';
import { fallbackManager } from './fallback-manager.js';
import { debugLog } from './config.js';

class DataSyncAPI {
  constructor() {
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.syncInterval = 30000; // 30秒
    this.retryDelay = 5000; // 5秒
    this.maxRetries = 3;
  }

  // 座席データの同期
  async syncSeatData(group, day, timeslot, isAdminMode = false, isSuperAdminMode = false) {
    if (this.syncInProgress) {
      debugLog('データ同期が既に進行中です');
      return { success: false, error: '同期が既に進行中です' };
    }

    this.syncInProgress = true;
    
    try {
      debugLog(`座席データの同期開始: ${group}_${day}_${timeslot}`);
      
      // フォールバックマネージャーを使用してデータを取得
      const result = await fallbackManager.getSeatsData(group, day, timeslot, isAdminMode, isSuperAdminMode);
      
      if (result.success) {
        this.lastSyncTime = new Date();
        debugLog('座席データの同期完了');
        return result;
      } else {
        throw new Error(result.error || 'データ同期に失敗');
      }
    } catch (error) {
      console.error('座席データの同期エラー:', error);
      return {
        success: false,
        error: error.message || 'データ同期に失敗しました'
      };
    } finally {
      this.syncInProgress = false;
    }
  }

  // 予約データの同期
  async syncReservationData(performanceId) {
    try {
      debugLog(`予約データの同期開始: ${performanceId}`);
      
      const result = await fallbackManager.getReservationsData(performanceId);
      
      debugLog('予約データの同期完了');
      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('予約データの同期エラー:', error);
      return {
        success: false,
        error: error.message || '予約データの同期に失敗しました'
      };
    }
  }

  // 予約の送信
  async submitReservation(reservationData) {
    try {
      debugLog('予約データの送信開始');
      
      const result = await fallbackManager.reserveSeat(reservationData);
      
      if (result.success) {
        debugLog('予約データの送信完了');
      }
      
      return result;
    } catch (error) {
      console.error('予約データの送信エラー:', error);
      return {
        success: false,
        error: error.message || '予約の送信に失敗しました'
      };
    }
  }

  // チェックインの送信
  async submitCheckin(checkinData) {
    try {
      debugLog('チェックインデータの送信開始');
      
      const result = await fallbackManager.checkinSeat(checkinData);
      
      if (result.success) {
        debugLog('チェックインデータの送信完了');
      }
      
      return result;
    } catch (error) {
      console.error('チェックインデータの送信エラー:', error);
      return {
        success: false,
        error: error.message || 'チェックインの送信に失敗しました'
      };
    }
  }

  // 当日券発行の送信
  async submitWalkinTicket(walkinData) {
    try {
      debugLog('当日券発行データの送信開始');
      
      const result = await fallbackManager.issueWalkinTicket(walkinData);
      
      if (result.success) {
        debugLog('当日券発行データの送信完了');
      }
      
      return result;
    } catch (error) {
      console.error('当日券発行データの送信エラー:', error);
      return {
        success: false,
        error: error.message || '当日券の発行に失敗しました'
      };
    }
  }

  // 管理者編集の送信
  async submitAdminEdit(editData) {
    try {
      debugLog('管理者編集データの送信開始');
      
      const result = await fallbackManager.adminEditSeat(editData);
      
      if (result.success) {
        debugLog('管理者編集データの送信完了');
      }
      
      return result;
    } catch (error) {
      console.error('管理者編集データの送信エラー:', error);
      return {
        success: false,
        error: error.message || '管理者編集の送信に失敗しました'
      };
    }
  }

  // オンライン状態の確認
  async isOnline() {
    try {
      return await fallbackManager.isOnlineStatus();
    } catch (error) {
      console.warn('オンライン状態の確認に失敗:', error);
      return navigator.onLine;
    }
  }

  // 同期状態の取得
  async getSyncStatus() {
    return {
      syncInProgress: this.syncInProgress,
      lastSyncTime: this.lastSyncTime,
      isOnline: await fallbackManager.isOnlineStatus(),
      fallbackMode: fallbackManager.isFallbackMode(),
      offlineAvailable: fallbackManager.isOfflineAvailable()
    };
  }

  // 手動同期の実行
  async forceSync(group, day, timeslot, isAdminMode = false, isSuperAdminMode = false) {
    debugLog('手動同期を実行');
    return await this.syncSeatData(group, day, timeslot, isAdminMode, isSuperAdminMode);
  }

  // 同期の停止
  stopSync() {
    this.syncInProgress = false;
    debugLog('データ同期を停止');
  }
}

// シングルトンインスタンス
const dataSyncAPI = new DataSyncAPI();

// グローバルに公開
window.dataSyncAPI = dataSyncAPI;

export { DataSyncAPI, dataSyncAPI };
