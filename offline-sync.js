// offline-sync.js
// オフライン検出とバックグラウンド同期管理

import { GasAPI } from './api.js';
import { dataSyncAPI } from './data-sync-api.js';
import { offlineDB } from './offline-db.js';
import { debugLog } from './config.js';

class OfflineSync {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInterval = null;
    this.syncIntervalMs = 30000; // 30秒間隔で同期
    this.lastSyncTime = 0;
    this.isSyncing = false;
    this.performanceId = null;
    
    this.init();
  }

  init() {
    // オンライン/オフライン状態の監視
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('オンライン状態に復帰');
      this.showStatus('オンラインに復帰しました');
      this.syncChanges();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('オフライン状態に移行');
      this.showStatus('オフライン状態です - ローカルデータを使用中');
    });

    // 定期的な同期開始
    this.startPeriodicSync();
  }

  // パフォーマンスIDを設定
  setPerformanceId(performanceId) {
    this.performanceId = performanceId;
    console.log('パフォーマンスID設定:', performanceId);
  }

  // 定期的な同期を開始
  startPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.performanceId) {
        this.syncData();
      }
    }, this.syncIntervalMs);

    console.log('定期同期開始:', this.syncIntervalMs + 'ms間隔');
  }

  // 定期的な同期を停止
  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('定期同期停止');
    }
  }

  // データ同期（座席データの取得と保存）
  async syncData() {
    if (this.isSyncing || !this.isOnline || !this.performanceId) {
      return;
    }

    this.isSyncing = true;
    console.log('データ同期開始');

    try {
      // パフォーマンスIDからパラメータを抽出
      const [group, day, timeslot] = this.performanceId.split('_');
      
      // データ取得専用APIを使用（高速化）
      const seatsResponse = await dataSyncAPI.syncSeatData(group, day, timeslot);
      if (seatsResponse.success) {
        const seatsData = Object.values(seatsResponse.seatMap || {});
        await offlineDB.saveSeats(this.performanceId, seatsData);
        console.log('座席データ同期完了:', seatsData.length + '件');
      }

      // 予約データを取得
      const reservationsResponse = await dataSyncAPI.syncReservationData(this.performanceId);
      if (reservationsResponse.success) {
        for (const reservation of reservationsResponse.data) {
          await offlineDB.saveReservation(reservation);
        }
        console.log('予約データ同期完了:', reservationsResponse.data.length + '件');
      }

      this.lastSyncTime = Date.now();
      await offlineDB.saveSetting('lastSyncTime', this.lastSyncTime);
      
      console.log('データ同期完了');
    } catch (error) {
      console.error('データ同期エラー:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  // 変更の同期（ローカル変更をサーバーに送信）
  async syncChanges() {
    if (!this.isOnline) {
      console.log('オフライン状態のため同期スキップ');
      return;
    }

    try {
      const unsyncedChanges = await offlineDB.getUnsyncedChanges();
      if (unsyncedChanges.length === 0) {
        console.log('同期対象の変更なし');
        return;
      }

      console.log('変更同期開始:', unsyncedChanges.length + '件');

      // パフォーマンスIDからパラメータを抽出
      const [group, day, timeslot] = this.performanceId.split('_');
      
      // データ取得専用APIを使用して一括同期
      const response = await dataSyncAPI.syncSeatData(group, day, timeslot);
      
      if (response.success) {
        // 成功した変更を同期済みとしてマーク
        const syncedIds = unsyncedChanges.map(change => change.id);
        await offlineDB.markChangesAsSynced(syncedIds);
        console.log('同期済みマーク完了:', syncedIds.length + '件');
      } else {
        console.error('変更同期失敗:', response.error);
      }

      console.log('変更同期完了');
    } catch (error) {
      console.error('変更同期エラー:', error);
    }
  }

  // オフライン状態かどうかを判定
  isOffline() {
    return !this.isOnline;
  }

  // オンライン状態かどうかを判定
  isOnlineStatus() {
    return this.isOnline;
  }

  // 最後の同期時刻を取得
  async getLastSyncTime() {
    return await offlineDB.getSetting('lastSyncTime') || 0;
  }

  // 座席データを取得（オフライン対応）
  async getSeats(performanceId) {
    if (this.isOnline) {
      // オンライン時はサーバーから取得してローカルに保存
      try {
        const [group, day, timeslot] = performanceId.split('_');
        const response = await GasAPI.getSeatData(group, day, timeslot);
        if (response.success) {
          await offlineDB.saveSeats(performanceId, response.data);
          return response.data;
        }
      } catch (error) {
        console.warn('オンライン取得失敗、ローカルデータを使用:', error);
      }
    }

    // オフライン時またはオンライン取得失敗時はローカルから取得
    try {
      const localSeats = await offlineDB.getSeats(performanceId);
      if (localSeats && localSeats.length > 0) {
        console.log('ローカル座席データ使用:', localSeats.length + '件');
        return localSeats;
      }
    } catch (error) {
      console.error('ローカル座席データ取得エラー:', error);
    }

    return [];
  }

  // 予約データを取得（オフライン対応）
  async getReservations(performanceId) {
    if (this.isOnline) {
      // オンライン時はサーバーから取得してローカルに保存
      try {
        const [group, day, timeslot] = performanceId.split('_');
        const response = await GasAPI.getSeatData(group, day, timeslot);
        if (response.success) {
          for (const reservation of response.data) {
            await offlineDB.saveReservation(reservation);
          }
          return response.data;
        }
      } catch (error) {
        console.warn('オンライン取得失敗、ローカルデータを使用:', error);
      }
    }

    // オフライン時またはオンライン取得失敗時はローカルから取得
    try {
      const localReservations = await offlineDB.getReservations(performanceId);
      console.log('ローカル予約データ使用:', localReservations.length + '件');
      return localReservations;
    } catch (error) {
      console.error('ローカル予約データ取得エラー:', error);
      return [];
    }
  }

  // 座席予約（オフライン対応）
  async reserveSeat(reservationData) {
    const changeData = {
      type: 'reservation',
      data: reservationData
    };

    // ローカルに保存
    await offlineDB.saveReservation(reservationData);
    await offlineDB.recordChange('reservation', reservationData);

    if (this.isOnline) {
      // オンライン時は即座にサーバーに送信
      try {
        const response = await GasAPI.reserveSeats(reservationData.group, reservationData.day, reservationData.timeslot, [reservationData]);
        if (response.success) {
          // 成功した変更を同期済みとしてマーク
          const changes = await offlineDB.getUnsyncedChanges();
          const change = changes.find(c => 
            c.type === 'reservation' && 
            JSON.stringify(c.data) === JSON.stringify(reservationData)
          );
          if (change) {
            await offlineDB.markChangesAsSynced([change.id]);
          }
          return response;
        }
      } catch (error) {
        console.warn('オンライン予約失敗、オフライン保存のみ:', error);
      }
    }

    return { success: true, offline: true, message: 'オフラインで保存されました' };
  }

  // チェックイン（オフライン対応）
  async checkinSeat(checkinData) {
    const changeData = {
      type: 'checkin',
      data: checkinData
    };

    // ローカルに保存
    await offlineDB.saveReservation(checkinData);
    await offlineDB.recordChange('checkin', checkinData);

    if (this.isOnline) {
      // オンライン時は即座にサーバーに送信
      try {
        const response = await GasAPI.checkInSeat(checkinData.group, checkinData.day, checkinData.timeslot, checkinData.seatId);
        if (response.success) {
          // 成功した変更を同期済みとしてマーク
          const changes = await offlineDB.getUnsyncedChanges();
          const change = changes.find(c => 
            c.type === 'checkin' && 
            JSON.stringify(c.data) === JSON.stringify(checkinData)
          );
          if (change) {
            await offlineDB.markChangesAsSynced([change.id]);
          }
          return response;
        }
      } catch (error) {
        console.warn('オンラインチェックイン失敗、オフライン保存のみ:', error);
      }
    }

    return { success: true, offline: true, message: 'オフラインで保存されました' };
  }

  // 当日券発行（オフライン対応）
  async issueWalkinTicket(walkinData) {
    const changeData = {
      type: 'walkin',
      data: walkinData
    };

    // ローカルに保存
    await offlineDB.saveReservation(walkinData);
    await offlineDB.recordChange('walkin', walkinData);

    if (this.isOnline) {
      // オンライン時は即座にサーバーに送信
      try {
        const response = await GasAPI.assignWalkInSeats(walkinData.group, walkinData.day, walkinData.timeslot, walkinData.count);
        if (response.success) {
          // 成功した変更を同期済みとしてマーク
          const changes = await offlineDB.getUnsyncedChanges();
          const change = changes.find(c => 
            c.type === 'walkin' && 
            JSON.stringify(c.data) === JSON.stringify(walkinData)
          );
          if (change) {
            await offlineDB.markChangesAsSynced([change.id]);
          }
          return response;
        }
      } catch (error) {
        console.warn('オンライン当日券発行失敗、オフライン保存のみ:', error);
      }
    }

    return { success: true, offline: true, message: 'オフラインで保存されました' };
  }

  // 管理者編集（オフライン対応）
  async adminEditSeat(editData) {
    const changeData = {
      type: 'admin_edit',
      data: editData
    };

    // ローカルに保存
    await offlineDB.saveReservation(editData);
    await offlineDB.recordChange('admin_edit', editData);

    if (this.isOnline) {
      // オンライン時は即座にサーバーに送信
      try {
        const response = await GasAPI.updateSeatData(editData.group, editData.day, editData.timeslot, editData.seatId, editData.columnC, editData.columnD, editData.columnE);
        if (response.success) {
          // 成功した変更を同期済みとしてマーク
          const changes = await offlineDB.getUnsyncedChanges();
          const change = changes.find(c => 
            c.type === 'admin_edit' && 
            JSON.stringify(c.data) === JSON.stringify(editData)
          );
          if (change) {
            await offlineDB.markChangesAsSynced([change.id]);
          }
          return response;
        }
      } catch (error) {
        console.warn('オンライン管理者編集失敗、オフライン保存のみ:', error);
      }
    }

    return { success: true, offline: true, message: 'オフラインで保存されました' };
  }

  // ステータス表示
  showStatus(message) {
    // 既存のステータス表示要素があれば更新、なければ作成
    let statusElement = document.getElementById('offline-status');
    if (!statusElement) {
      statusElement = document.createElement('div');
      statusElement.id = 'offline-status';
      statusElement.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: ${this.isOnline ? '#4CAF50' : '#FF9800'};
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        z-index: 10000;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        transition: all 0.3s ease;
      `;
      document.body.appendChild(statusElement);
    }

    statusElement.textContent = message;
    statusElement.style.background = this.isOnline ? '#4CAF50' : '#FF9800';

    // 3秒後に自動非表示
    setTimeout(() => {
      if (statusElement && statusElement.parentNode) {
        statusElement.style.opacity = '0';
        setTimeout(() => {
          if (statusElement && statusElement.parentNode) {
            statusElement.parentNode.removeChild(statusElement);
          }
        }, 300);
      }
    }, 3000);
  }

  // デバッグ情報の取得
  async getDebugInfo() {
    const lastSync = await this.getLastSyncTime();
    const unsyncedChanges = await offlineDB.getUnsyncedChanges();
    
    return {
      isOnline: this.isOnline,
      lastSyncTime: lastSync,
      lastSyncDate: new Date(lastSync).toLocaleString(),
      unsyncedChangesCount: unsyncedChanges.length,
      performanceId: this.performanceId,
      isSyncing: this.isSyncing
    };
  }
}

// シングルトンインスタンス
const offlineSync = new OfflineSync();

export { OfflineSync, offlineSync };
