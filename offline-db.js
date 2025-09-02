// offline-db.js
// IndexedDBを使用したローカルデータベース管理

class OfflineDatabase {
  constructor() {
    this.dbName = 'TicketSystemDB';
    this.dbVersion = 1;
    this.db = null;
    this.isInitialized = false;
  }

  // データベース初期化
  async init() {
    if (this.isInitialized) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB初期化エラー:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('IndexedDB初期化完了');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // 座席データストア
        if (!db.objectStoreNames.contains('seats')) {
          const seatsStore = db.createObjectStore('seats', { keyPath: 'id' });
          seatsStore.createIndex('performanceId', 'performanceId', { unique: false });
          seatsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 予約データストア
        if (!db.objectStoreNames.contains('reservations')) {
          const reservationsStore = db.createObjectStore('reservations', { keyPath: 'id' });
          reservationsStore.createIndex('performanceId', 'performanceId', { unique: false });
          reservationsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // 変更履歴ストア（同期用）
        if (!db.objectStoreNames.contains('changes')) {
          const changesStore = db.createObjectStore('changes', { keyPath: 'id', autoIncrement: true });
          changesStore.createIndex('type', 'type', { unique: false });
          changesStore.createIndex('timestamp', 'timestamp', { unique: false });
          changesStore.createIndex('synced', 'synced', { unique: false });
        }

        // 設定ストア
        if (!db.objectStoreNames.contains('settings')) {
          const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
        }

        console.log('IndexedDBスキーマ更新完了');
      };
    });
  }

  // 座席データの保存
  async saveSeats(performanceId, seatsData) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['seats'], 'readwrite');
      const store = transaction.objectStore('seats');

      // 既存データを削除
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        // 新しいデータを保存
        const timestamp = Date.now();
        const seatsWithMeta = seatsData.map(seat => ({
          ...seat,
          id: `${performanceId}_${seat.row}_${seat.column}`,
          performanceId,
          timestamp
        }));

        let completed = 0;
        let errors = [];

        seatsWithMeta.forEach(seat => {
          const request = store.add(seat);
          request.onsuccess = () => {
            completed++;
            if (completed === seatsWithMeta.length) {
              resolve({ success: true, count: completed });
            }
          };
          request.onerror = () => {
            errors.push(request.error);
            completed++;
            if (completed === seatsWithMeta.length) {
              reject({ success: false, errors });
            }
          };
        });
      };
    });
  }

  // 座席データの取得
  async getSeats(performanceId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['seats'], 'readonly');
      const store = transaction.objectStore('seats');
      const index = store.index('performanceId');
      const request = index.getAll(performanceId);

      request.onsuccess = () => {
        const seats = request.result.map(seat => {
          const { id, performanceId, timestamp, ...seatData } = seat;
          return seatData;
        });
        resolve(seats);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // 予約データの保存
  async saveReservation(reservation) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['reservations'], 'readwrite');
      const store = transaction.objectStore('reservations');

      const reservationWithMeta = {
        ...reservation,
        id: `${reservation.performanceId}_${reservation.row}_${reservation.column}`,
        timestamp: Date.now()
      };

      const request = store.put(reservationWithMeta);
      request.onsuccess = () => resolve({ success: true });
      request.onerror = () => reject(request.error);
    });
  }

  // 予約データの取得
  async getReservations(performanceId) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['reservations'], 'readonly');
      const store = transaction.objectStore('reservations');
      const index = store.index('performanceId');
      const request = index.getAll(performanceId);

      request.onsuccess = () => {
        const reservations = request.result.map(reservation => {
          const { id, timestamp, ...reservationData } = reservation;
          return reservationData;
        });
        resolve(reservations);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // 変更履歴の記録
  async recordChange(type, data) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['changes'], 'readwrite');
      const store = transaction.objectStore('changes');

      const change = {
        type,
        data,
        timestamp: Date.now(),
        synced: false
      };

      const request = store.add(change);
      request.onsuccess = () => resolve({ success: true });
      request.onerror = () => reject(request.error);
    });
  }

  // 未同期の変更を取得
  async getUnsyncedChanges() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['changes'], 'readonly');
      const store = transaction.objectStore('changes');
      const index = store.index('synced');
      const request = index.getAll(false);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // 変更を同期済みとしてマーク
  async markChangesAsSynced(changeIds) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['changes'], 'readwrite');
      const store = transaction.objectStore('changes');

      let completed = 0;
      let errors = [];

      changeIds.forEach(id => {
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
          const change = getRequest.result;
          if (change) {
            change.synced = true;
            const updateRequest = store.put(change);
            updateRequest.onsuccess = () => {
              completed++;
              if (completed === changeIds.length) {
                resolve({ success: true });
              }
            };
            updateRequest.onerror = () => {
              errors.push(updateRequest.error);
              completed++;
              if (completed === changeIds.length) {
                reject({ success: false, errors });
              }
            };
          } else {
            completed++;
            if (completed === changeIds.length) {
              resolve({ success: true });
            }
          }
        };
        getRequest.onerror = () => {
          errors.push(getRequest.error);
          completed++;
          if (completed === changeIds.length) {
            reject({ success: false, errors });
          }
        };
      });
    });
  }

  // 設定の保存
  async saveSetting(key, value) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['settings'], 'readwrite');
      const store = transaction.objectStore('settings');

      const request = store.put({ key, value, timestamp: Date.now() });
      request.onsuccess = () => resolve({ success: true });
      request.onerror = () => reject(request.error);
    });
  }

  // 設定の取得
  async getSetting(key) {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['settings'], 'readonly');
      const store = transaction.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result ? request.result.value : null);
      };
      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  // データベースのクリア
  async clear() {
    await this.init();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(['seats', 'reservations', 'changes', 'settings'], 'readwrite');
      
      let completed = 0;
      const stores = ['seats', 'reservations', 'changes', 'settings'];
      
      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => {
          completed++;
          if (completed === stores.length) {
            resolve({ success: true });
          }
        };
        request.onerror = () => {
          reject(request.error);
        };
      });
    });
  }
}

// シングルトンインスタンス
const offlineDB = new OfflineDatabase();

export { OfflineDatabase, offlineDB };
