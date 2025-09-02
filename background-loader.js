// background-loader.js
// オフライン対応のための最適化されたバックグラウンド読み込み機能

import { offlineDB } from './offline-db.js';
import { priorityLoader } from './priority-loader.js';
import { debugLog } from './config.js';

class BackgroundLoader {
  constructor() {
    this.isInitialized = false;
    this.loadingTasks = new Map();
    this.cache = new Map();
    this.retryCount = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1秒
    this.performanceData = new Map();
    this.syncQueue = [];
    this.isProcessingQueue = false;
    
    this.init();
  }

  async init() {
    if (this.isInitialized) return;
    
    try {
      // IndexedDBの初期化
      await offlineDB.init();
      
      // 既存のキャッシュデータを復元
      await this.restoreCache();
      
      // 未同期の変更を処理
      await this.processPendingSync();
      
      this.isInitialized = true;
      debugLog('BackgroundLoader初期化完了');
    } catch (error) {
      console.error('BackgroundLoader初期化エラー:', error);
    }
  }

  // キャッシュデータの復元
  async restoreCache() {
    try {
      // 最後の同期時刻を取得
      const lastSync = await offlineDB.getSetting('lastSyncTime');
      if (lastSync) {
        this.cache.set('lastSyncTime', lastSync);
      }
      
      // パフォーマンスデータの復元
      const performances = await offlineDB.getSetting('cachedPerformances');
      if (performances) {
        this.performanceData = new Map(performances);
      }
      
      debugLog('キャッシュデータ復元完了');
    } catch (error) {
      console.error('キャッシュ復元エラー:', error);
    }
  }

  // パフォーマンスデータの事前読み込み（バックグラウンド）
  async preloadPerformanceData(performanceId, priority = 'background') {
    if (!this.isInitialized) {
      await this.init();
    }

    const taskId = `preload_${performanceId}`;
    
    // 既に読み込み中の場合は待機
    if (this.loadingTasks.has(taskId)) {
      return this.loadingTasks.get(taskId);
    }

    // キャッシュから取得を試行
    if (this.cache.has(performanceId)) {
      const cached = this.cache.get(performanceId);
      if (this.isCacheValid(cached)) {
        debugLog(`キャッシュから取得: ${performanceId}`);
        return cached.data;
      }
    }

    // バックグラウンドで読み込み
    const loadPromise = this.loadPerformanceDataInBackground(performanceId, priority);
    this.loadingTasks.set(taskId, loadPromise);

    try {
      const result = await loadPromise;
      this.cache.set(performanceId, {
        data: result,
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000 // 5分のTTL
      });
      return result;
    } finally {
      this.loadingTasks.delete(taskId);
    }
  }

  // バックグラウンドでのパフォーマンスデータ読み込み
  async loadPerformanceDataInBackground(performanceId, priority) {
    const [group, day, timeslot] = performanceId.split('_');
    
    return priorityLoader.loadBackground(async () => {
      try {
        // ローカルデータを優先的に取得
        const localSeats = await offlineDB.getSeats(performanceId);
        const localReservations = await offlineDB.getReservations(performanceId);
        
        if (localSeats.length > 0) {
          debugLog(`ローカルデータ使用: ${performanceId} (座席: ${localSeats.length}件)`);
          
          // パフォーマンスデータを保存
          this.performanceData.set(performanceId, {
            seats: localSeats,
            reservations: localReservations,
            lastUpdated: Date.now(),
            source: 'local'
          });
          
          return {
            seats: localSeats,
            reservations: localReservations,
            source: 'local',
            timestamp: Date.now()
          };
        }

        // ローカルデータがない場合はサーバーから取得
        debugLog(`サーバーから取得: ${performanceId}`);
        return await this.fetchFromServer(group, day, timeslot);
        
      } catch (error) {
        console.error(`パフォーマンスデータ読み込みエラー: ${performanceId}`, error);
        throw error;
      }
    });
  }

  // サーバーからのデータ取得
  async fetchFromServer(group, day, timeslot) {
    const performanceId = `${group}_${day}_${timeslot}`;
    
    try {
      // データ取得専用APIを使用
      const { DataSyncAPI } = await import('./data-sync-api.js');
      
      const [seatsResponse, reservationsResponse] = await Promise.all([
        DataSyncAPI.getSeats(group, day, timeslot),
        DataSyncAPI.getReservations(group, day, timeslot)
      ]);

      const seats = seatsResponse.success ? seatsResponse.data : [];
      const reservations = reservationsResponse.success ? reservationsResponse.data : [];

      // ローカルに保存
      if (seats.length > 0) {
        await offlineDB.saveSeats(performanceId, seats);
      }
      
      for (const reservation of reservations) {
        await offlineDB.saveReservation(reservation);
      }

      // パフォーマンスデータを保存
      this.performanceData.set(performanceId, {
        seats,
        reservations,
        lastUpdated: Date.now(),
        source: 'server'
      });

      // 最後の同期時刻を更新
      const syncTime = Date.now();
      this.cache.set('lastSyncTime', syncTime);
      await offlineDB.saveSetting('lastSyncTime', syncTime);

      return {
        seats,
        reservations,
        source: 'server',
        timestamp: syncTime
      };

    } catch (error) {
      console.error('サーバー取得エラー:', error);
      throw error;
    }
  }

  // キャッシュの有効性チェック
  isCacheValid(cached) {
    if (!cached || !cached.timestamp || !cached.ttl) {
      return false;
    }
    return (Date.now() - cached.timestamp) < cached.ttl;
  }

  // 座席データの取得（オフライン対応）
  async getSeats(performanceId) {
    if (!this.isInitialized) {
      await this.init();
    }

    // パフォーマンスデータから取得
    if (this.performanceData.has(performanceId)) {
      const data = this.performanceData.get(performanceId);
      if (this.isDataFresh(data)) {
        return data.seats;
      }
    }

    // ローカルデータベースから取得
    try {
      const localSeats = await offlineDB.getSeats(performanceId);
      if (localSeats.length > 0) {
        return localSeats;
      }
    } catch (error) {
      console.error('ローカル座席データ取得エラー:', error);
    }

    // データがない場合は空配列を返す
    return [];
  }

  // 予約データの取得（オフライン対応）
  async getReservations(performanceId) {
    if (!this.isInitialized) {
      await this.init();
    }

    // パフォーマンスデータから取得
    if (this.performanceData.has(performanceId)) {
      const data = this.performanceData.get(performanceId);
      if (this.isDataFresh(data)) {
        return data.reservations;
      }
    }

    // ローカルデータベースから取得
    try {
      const localReservations = await offlineDB.getReservations(performanceId);
      return localReservations;
    } catch (error) {
      console.error('ローカル予約データ取得エラー:', error);
      return [];
    }
  }

  // データの鮮度チェック
  isDataFresh(data) {
    if (!data || !data.lastUpdated) {
      return false;
    }
    // 5分以内のデータは新鮮とみなす
    return (Date.now() - data.lastUpdated) < 5 * 60 * 1000;
  }

  // 変更の記録と同期キューへの追加
  async recordChange(type, data) {
    if (!this.isInitialized) {
      await this.init();
    }

    try {
      // ローカルに記録
      await offlineDB.recordChange(type, data);
      
      // 同期キューに追加
      this.syncQueue.push({
        type,
        data,
        timestamp: Date.now(),
        retryCount: 0
      });

      // キュー処理を開始
      this.processSyncQueue();
      
      debugLog(`変更記録: ${type}`, data);
    } catch (error) {
      console.error('変更記録エラー:', error);
    }
  }

  // 同期キューの処理
  async processSyncQueue() {
    if (this.isProcessingQueue || this.syncQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.syncQueue.length > 0) {
      const change = this.syncQueue.shift();
      
      try {
        await this.syncChange(change);
      } catch (error) {
        console.error('同期エラー:', error);
        
        // リトライ処理
        if (change.retryCount < this.maxRetries) {
          change.retryCount++;
          this.syncQueue.push(change);
          
          // リトライ前に遅延
          await this.delay(this.retryDelay * change.retryCount);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  // 個別の変更同期
  async syncChange(change) {
    const { type, data } = change;
    
    try {
      // パフォーマンスIDからパラメータを抽出
      const performanceId = data.performanceId || `${data.group}_${data.day}_${data.timeslot}`;
      const [group, day, timeslot] = performanceId.split('_');
      
      // データ取得専用APIを使用して同期
      const { DataSyncAPI } = await import('./data-sync-api.js');
      const response = await DataSyncAPI.syncChanges(group, day, timeslot, [change]);
      
      if (response.success) {
        debugLog(`同期成功: ${type}`);
      } else {
        throw new Error(response.error || '同期失敗');
      }
    } catch (error) {
      console.error(`同期失敗: ${type}`, error);
      throw error;
    }
  }

  // 未同期の変更を処理
  async processPendingSync() {
    try {
      const unsyncedChanges = await offlineDB.getUnsyncedChanges();
      if (unsyncedChanges.length > 0) {
        debugLog(`未同期変更を処理: ${unsyncedChanges.length}件`);
        
        for (const change of unsyncedChanges) {
          this.syncQueue.push({
            ...change,
            retryCount: 0
          });
        }
        
        this.processSyncQueue();
      }
    } catch (error) {
      console.error('未同期変更処理エラー:', error);
    }
  }

  // 複数パフォーマンスの並列事前読み込み
  async preloadMultiplePerformances(performanceIds, priority = 'background') {
    const promises = performanceIds.map(id => 
      this.preloadPerformanceData(id, priority)
    );
    
    try {
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      debugLog(`並列事前読み込み完了: ${successful}/${performanceIds.length}件`);
      return results;
    } catch (error) {
      console.error('並列事前読み込みエラー:', error);
      return [];
    }
  }

  // キャッシュのクリア
  async clearCache() {
    this.cache.clear();
    this.performanceData.clear();
    this.loadingTasks.clear();
    this.retryCount.clear();
    
    try {
      await offlineDB.clear();
      debugLog('キャッシュクリア完了');
    } catch (error) {
      console.error('キャッシュクリアエラー:', error);
    }
  }

  // 統計情報の取得
  async getStats() {
    const lastSync = this.cache.get('lastSyncTime') || 0;
    const unsyncedChanges = await offlineDB.getUnsyncedChanges();
    
    return {
      cacheSize: this.cache.size,
      performanceDataSize: this.performanceData.size,
      loadingTasksCount: this.loadingTasks.size,
      syncQueueLength: this.syncQueue.length,
      lastSyncTime: lastSync,
      lastSyncDate: new Date(lastSync).toLocaleString(),
      unsyncedChangesCount: unsyncedChanges.length,
      isProcessingQueue: this.isProcessingQueue
    };
  }

  // 遅延処理
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // パフォーマンスデータの保存
  async savePerformanceData() {
    try {
      const performances = Array.from(this.performanceData.entries());
      await offlineDB.saveSetting('cachedPerformances', performances);
      debugLog('パフォーマンスデータ保存完了');
    } catch (error) {
      console.error('パフォーマンスデータ保存エラー:', error);
    }
  }

  // 定期的なデータ保存
  startPeriodicSave() {
    setInterval(() => {
      this.savePerformanceData();
    }, 60000); // 1分ごと
  }
}

// シングルトンインスタンス
const backgroundLoader = new BackgroundLoader();

export { BackgroundLoader, backgroundLoader };
