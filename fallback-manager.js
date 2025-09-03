// fallback-manager.js
// オフライン機能が使えなくてもシステムが問題なく動くためのフォールバック管理

import { GasAPI } from './api.js';
import { debugLog } from './config.js';

class FallbackManager {
  constructor() {
    this.isOfflineAvailable = false;
    this.offlineErrorCount = 0;
    this.maxOfflineErrors = 3;
    this.fallbackMode = false;
    this.retryDelay = 1000; // 1秒
    this.maxRetries = 3;
    
    this.init();
  }

  async init() {
    try {
      // オフライン機能の可用性をチェック
      await this.checkOfflineAvailability();
    } catch (error) {
      console.warn('オフライン機能の初期化に失敗:', error);
      this.isOfflineAvailable = false;
    }
  }

  // オフライン機能の可用性をチェック
  async checkOfflineAvailability() {
    try {
      // IndexedDBの可用性をチェック
      if (!window.indexedDB) {
        throw new Error('IndexedDB not available');
      }

      // オフライン関連モジュールの可用性をチェック
      const { offlineDB } = await import('./offline-db.js');
      await offlineDB.init();
      
      this.isOfflineAvailable = true;
      this.offlineErrorCount = 0;
      debugLog('オフライン機能が利用可能です');
    } catch (error) {
      console.warn('オフライン機能が利用できません:', error);
      this.isOfflineAvailable = false;
      this.fallbackMode = true;
    }
  }

  // 座席データの取得（フォールバック対応）
  async getSeatsData(group, day, timeslot, isAdminMode = false, isSuperAdminMode = false) {
    const performanceId = `${group}_${day}_${timeslot}`;
    
    // オフライン機能が利用可能な場合
    if (this.isOfflineAvailable && !this.fallbackMode) {
      try {
        const { offlineSync } = await import('./offline-sync.js');
        
        if (await offlineSync.isOnlineStatus()) {
          // オンライン時はサーバーから取得
          const response = await GasAPI.getSeatData(group, day, timeslot, isAdminMode, isSuperAdminMode);
          if (response.success) {
            return response;
          }
        }
        
        // オフライン時またはサーバー取得失敗時はローカルから取得
        const localSeats = await offlineSync.getSeats(performanceId);
        const localReservations = await offlineSync.getReservations(performanceId);
        
        return {
          success: true,
          seatMap: localSeats.reduce((map, seat) => {
            map[`${seat.row}${seat.column}`] = seat;
            return map;
          }, {}),
          reservations: localReservations,
          source: 'offline'
        };
      } catch (error) {
        console.warn('オフライン機能でエラーが発生:', error);
        this.offlineErrorCount++;
        
        if (this.offlineErrorCount >= this.maxOfflineErrors) {
          console.warn('オフライン機能のエラーが多すぎるため、フォールバックモードに移行');
          this.fallbackMode = true;
        }
      }
    }
    
    // フォールバック: 直接サーバーから取得
    return await this.getSeatsDataFromServer(group, day, timeslot, isAdminMode, isSuperAdminMode);
  }

  // サーバーから直接座席データを取得
  async getSeatsDataFromServer(group, day, timeslot, isAdminMode = false, isSuperAdminMode = false) {
    let retryCount = 0;
    
    while (retryCount < this.maxRetries) {
      try {
        debugLog(`サーバーから座席データを取得中 (試行 ${retryCount + 1}/${this.maxRetries})`);
        
        const response = await GasAPI.getSeatData(group, day, timeslot, isAdminMode, isSuperAdminMode);
        
        if (response.success) {
          debugLog('サーバーからの座席データ取得成功');
          return {
            ...response,
            source: 'server_fallback'
          };
        } else {
          throw new Error(response.error || 'サーバーからのデータ取得に失敗');
        }
      } catch (error) {
        retryCount++;
        console.warn(`サーバー取得失敗 (試行 ${retryCount}/${this.maxRetries}):`, error);
        
        if (retryCount < this.maxRetries) {
          // リトライ前に遅延
          await this.delay(this.retryDelay * retryCount);
        } else {
          // 最終的に失敗した場合
          console.error('サーバーからの座席データ取得に完全に失敗');
          return {
            success: false,
            error: 'データの取得に失敗しました。ネットワーク接続を確認してください。',
            source: 'error'
          };
        }
      }
    }
  }

  // 予約データの取得（フォールバック対応）
  async getReservationsData(performanceId) {
    // オフライン機能が利用可能な場合
    if (this.isOfflineAvailable && !this.fallbackMode) {
      try {
        const { offlineSync } = await import('./offline-sync.js');
        return await offlineSync.getReservations(performanceId);
      } catch (error) {
        console.warn('オフライン機能で予約データ取得エラー:', error);
      }
    }
    
    // フォールバック: 空の配列を返す
    console.warn('予約データの取得に失敗、空の配列を返します');
    return [];
  }

  // 座席予約（フォールバック対応）
  async reserveSeat(reservationData) {
    // オフライン機能が利用可能な場合
    if (this.isOfflineAvailable && !this.fallbackMode) {
      try {
        const { offlineSync } = await import('./offline-sync.js');
        return await offlineSync.reserveSeat(reservationData);
      } catch (error) {
        console.warn('オフライン機能で予約エラー:', error);
      }
    }
    
    // フォールバック: 直接サーバーに送信
    return await this.reserveSeatOnServer(reservationData);
  }

  // サーバーに直接予約を送信
  async reserveSeatOnServer(reservationData) {
    let retryCount = 0;
    
    while (retryCount < this.maxRetries) {
      try {
        debugLog(`サーバーに予約を送信中 (試行 ${retryCount + 1}/${this.maxRetries})`);
        
        const response = await GasAPI.reserveSeats(reservationData.group, reservationData.day, reservationData.timeslot, [reservationData]);
        
        if (response.success) {
          debugLog('サーバーへの予約送信成功');
          return {
            ...response,
            source: 'server_fallback'
          };
        } else {
          throw new Error(response.error || 'サーバーへの予約送信に失敗');
        }
      } catch (error) {
        retryCount++;
        console.warn(`サーバー予約送信失敗 (試行 ${retryCount}/${this.maxRetries}):`, error);
        
        if (retryCount < this.maxRetries) {
          await this.delay(this.retryDelay * retryCount);
        } else {
          console.error('サーバーへの予約送信に完全に失敗');
          return {
            success: false,
            error: '予約の送信に失敗しました。ネットワーク接続を確認してください。',
            source: 'error'
          };
        }
      }
    }
  }

  // チェックイン（フォールバック対応）
  async checkinSeat(checkinData) {
    // オフライン機能が利用可能な場合
    if (this.isOfflineAvailable && !this.fallbackMode) {
      try {
        const { offlineSync } = await import('./offline-sync.js');
        return await offlineSync.checkinSeat(checkinData);
      } catch (error) {
        console.warn('オフライン機能でチェックインエラー:', error);
      }
    }
    
    // フォールバック: 直接サーバーに送信
    return await this.checkinSeatOnServer(checkinData);
  }

  // サーバーに直接チェックインを送信
  async checkinSeatOnServer(checkinData) {
    let retryCount = 0;
    
    while (retryCount < this.maxRetries) {
      try {
        const response = await GasAPI.checkInSeat(checkinData.group, checkinData.day, checkinData.timeslot, checkinData.seatId);
        
        if (response.success) {
          return {
            ...response,
            source: 'server_fallback'
          };
        } else {
          throw new Error(response.error || 'サーバーへのチェックイン送信に失敗');
        }
      } catch (error) {
        retryCount++;
        console.warn(`サーバーチェックイン送信失敗 (試行 ${retryCount}/${this.maxRetries}):`, error);
        
        if (retryCount < this.maxRetries) {
          await this.delay(this.retryDelay * retryCount);
        } else {
          return {
            success: false,
            error: 'チェックインの送信に失敗しました。ネットワーク接続を確認してください。',
            source: 'error'
          };
        }
      }
    }
  }

  // 当日券発行（フォールバック対応）
  async issueWalkinTicket(walkinData) {
    // オフライン機能が利用可能な場合
    if (this.isOfflineAvailable && !this.fallbackMode) {
      try {
        const { offlineSync } = await import('./offline-sync.js');
        return await offlineSync.issueWalkinTicket(walkinData);
      } catch (error) {
        console.warn('オフライン機能で当日券発行エラー:', error);
      }
    }
    
    // フォールバック: 直接サーバーに送信
    return await this.issueWalkinTicketOnServer(walkinData);
  }

  // サーバーに直接当日券発行を送信
  async issueWalkinTicketOnServer(walkinData) {
    let retryCount = 0;
    
    while (retryCount < this.maxRetries) {
      try {
        const response = await GasAPI.assignWalkInSeats(walkinData.group, walkinData.day, walkinData.timeslot, walkinData.count);
        
        if (response.success) {
          return {
            ...response,
            source: 'server_fallback'
          };
        } else {
          throw new Error(response.error || 'サーバーへの当日券発行送信に失敗');
        }
      } catch (error) {
        retryCount++;
        console.warn(`サーバー当日券発行送信失敗 (試行 ${retryCount}/${this.maxRetries}):`, error);
        
        if (retryCount < this.maxRetries) {
          await this.delay(this.retryDelay * retryCount);
        } else {
          return {
            success: false,
            error: '当日券の発行に失敗しました。ネットワーク接続を確認してください。',
            source: 'error'
          };
        }
      }
    }
  }

  // 管理者編集（フォールバック対応）
  async adminEditSeat(editData) {
    // オフライン機能が利用可能な場合
    if (this.isOfflineAvailable && !this.fallbackMode) {
      try {
        const { offlineSync } = await import('./offline-sync.js');
        return await offlineSync.adminEditSeat(editData);
      } catch (error) {
        console.warn('オフライン機能で管理者編集エラー:', error);
      }
    }
    
    // フォールバック: 直接サーバーに送信
    return await this.adminEditSeatOnServer(editData);
  }

  // サーバーに直接管理者編集を送信
  async adminEditSeatOnServer(editData) {
    let retryCount = 0;
    
    while (retryCount < this.maxRetries) {
      try {
        const response = await GasAPI.updateSeatData(editData.group, editData.day, editData.timeslot, editData.seatId, editData.columnC, editData.columnD, editData.columnE);
        
        if (response.success) {
          return {
            ...response,
            source: 'server_fallback'
          };
        } else {
          throw new Error(response.error || 'サーバーへの管理者編集送信に失敗');
        }
      } catch (error) {
        retryCount++;
        console.warn(`サーバー管理者編集送信失敗 (試行 ${retryCount}/${this.maxRetries}):`, error);
        
        if (retryCount < this.maxRetries) {
          await this.delay(this.retryDelay * retryCount);
        } else {
          return {
            success: false,
            error: '管理者編集の送信に失敗しました。ネットワーク接続を確認してください。',
            source: 'error'
          };
        }
      }
    }
  }

  // パフォーマンスIDの設定（フォールバック対応）
  async setPerformanceId(performanceId) {
    if (this.isOfflineAvailable && !this.fallbackMode) {
      try {
        const { offlineSync } = await import('./offline-sync.js');
        offlineSync.setPerformanceId(performanceId);
        debugLog('オフライン同期にパフォーマンスIDを設定');
      } catch (error) {
        console.warn('オフライン同期のパフォーマンスID設定に失敗:', error);
      }
    }
  }

  // オンライン状態の確認（フォールバック対応）
  async isOnlineStatus() {
    if (this.isOfflineAvailable && !this.fallbackMode) {
      try {
        const { offlineSync } = await import('./offline-sync.js');
        return offlineSync.isOnlineStatus();
      } catch (error) {
        console.warn('オフライン同期のオンライン状態確認に失敗:', error);
      }
    }
    
    // フォールバック: navigator.onLineを使用
    return navigator.onLine;
  }

  // オフライン状態の確認（フォールバック対応）
  async isOfflineStatus() {
    return !(await this.isOnlineStatus());
  }

  // フォールバックモードの状態を取得
  isFallbackMode() {
    return this.fallbackMode;
  }

  // オフライン機能の可用性を取得
  isOfflineAvailable() {
    return this.isOfflineAvailable;
  }

  // フォールバックモードを手動で有効化
  enableFallbackMode() {
    this.fallbackMode = true;
    console.log('フォールバックモードを手動で有効化しました');
  }

  // フォールバックモードを手動で無効化
  disableFallbackMode() {
    this.fallbackMode = false;
    this.offlineErrorCount = 0;
    console.log('フォールバックモードを手動で無効化しました');
  }

  // オフライン機能を再試行
  async retryOfflineFunctionality() {
    console.log('オフライン機能の再試行を開始');
    this.fallbackMode = false;
    this.offlineErrorCount = 0;
    await this.checkOfflineAvailability();
  }

  // 統計情報の取得
  async getStats() {
    return {
      isOfflineAvailable: this.isOfflineAvailable,
      fallbackMode: this.fallbackMode,
      offlineErrorCount: this.offlineErrorCount,
      maxOfflineErrors: this.maxOfflineErrors,
      isOnline: await this.isOnlineStatus()
    };
  }

  // 遅延処理
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // エラーハンドリングの改善
  handleError(error, operation) {
    console.error(`${operation}でエラーが発生:`, error);
    
    // エラーの種類に応じた処理
    if (error.name === 'QuotaExceededError') {
      console.warn('ストレージ容量が不足しています');
      return {
        success: false,
        error: 'ストレージ容量が不足しています。ブラウザのキャッシュをクリアしてください。',
        source: 'storage_error'
      };
    } else if (error.name === 'NetworkError') {
      console.warn('ネットワークエラーが発生しました');
      return {
        success: false,
        error: 'ネットワークエラーが発生しました。接続を確認してください。',
        source: 'network_error'
      };
    } else {
      return {
        success: false,
        error: `${operation}でエラーが発生しました: ${error.message}`,
        source: 'unknown_error'
      };
    }
  }
}

// シングルトンインスタンス
const fallbackManager = new FallbackManager();

export { FallbackManager, fallbackManager };
