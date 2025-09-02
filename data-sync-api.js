// data-sync-api.js
// データ取得専用のAPIクラス（オフライン同期用）

import { DATA_SYNC_GAS_URL, DEBUG_MODE, debugLog } from './config.js';

class DataSyncAPI {
  static _callApi(functionName, params = []) {
    return new Promise((resolve, reject) => {
      try {
        debugLog(`Data Sync API Call (JSONP): ${functionName}`, params);

        const callbackName = 'dataSyncCallback_' + functionName + '_' + Date.now();
        const encodedParams = encodeURIComponent(JSON.stringify(params));
        const encodedFuncName = encodeURIComponent(functionName);
        
        window[callbackName] = (data) => {
          debugLog(`Data Sync API Response (JSONP): ${functionName}`, data);
          try {
            try { clearTimeout(timeoutId); } catch (e) {}
            delete window[callbackName]; // コールバック関数を削除
            if (script && script.parentNode) {
              script.parentNode.removeChild(script); // スクリプトタグを削除
            }
            
            // success: falseの場合も正常なレスポンスとして扱う
            if (data && typeof data === 'object') {
              resolve(data);
            } else {
              // エラーレスポンスでもresolveして、呼び出し側で処理
              resolve({ success: false, error: '無効なAPIレスポンスです', data: data });
            }
          } catch (e) {
            console.error('Data Sync API response cleanup failed:', e);
            resolve({ success: false, error: 'API応答の処理中にエラーが発生しました: ' + e.message });
          }
        };

        // URL 構築（キャッシュバスター付き）
        const cacheBuster = `_=${Date.now()}`;
        const formData = `func=${encodedFuncName}&params=${encodedParams}`;
        const fullUrl = `${DATA_SYNC_GAS_URL}?callback=${callbackName}&${formData}&${cacheBuster}`;

        const script = document.createElement('script');
        script.src = fullUrl;
        script.async = true;
        
        let timeoutId = setTimeout(() => {
          console.error('Data Sync API call timeout:', { functionName, fullUrl });
          try {
            // 遅延応答で callback 未定義にならないよう、しばらくはNOOPを残す
            window[callbackName] = function noop() { /* late JSONP ignored */ };
            // 60秒後に完全クリーンアップ
            setTimeout(() => { try { delete window[callbackName]; } catch (_) {} }, 60000);
            if (script && script.parentNode) {
              script.parentNode.removeChild(script);
            }
          } catch (e) {}
          this._reportError(`Data Sync JSONPタイムアウト: ${functionName}`);
          resolve({ success: false, error: `Data Sync JSONPタイムアウト: ${functionName}`, timeout: true });
        }, 15000);

        script.onerror = (error) => {
          console.error('Data Sync API call error:', error, { functionName, fullUrl });
          try {
            delete window[callbackName];
            if (script && script.parentNode) {
              script.parentNode.removeChild(script);
            }
            clearTimeout(timeoutId);
            
            // より詳細なエラー情報を提供
            const errorDetails = {
              functionName,
              fullUrl,
              errorType: 'script_error',
              timestamp: new Date().toISOString()
            };
            console.error('Data Sync API call failed details:', errorDetails);
            
            this._reportError(`Data Sync JSONPリクエストに失敗しました: ${functionName} (詳細: ${JSON.stringify(errorDetails)})`);
            resolve({ success: false, error: `Data Sync JSONPリクエストに失敗しました: ${functionName}`, details: errorDetails });
          } catch (e) {
            console.error('Data Sync API error cleanup failed:', e);
            resolve({ success: false, error: 'Data Sync APIエラー処理中に例外が発生しました: ' + e.message });
          }
        };
        
        (document.head || document.body || document.documentElement).appendChild(script);
      } catch (err) {
        console.error('Data Sync API call exception:', err);
        this._reportError(`Data Sync API呼び出し例外: ${err.message}`);
        resolve({ success: false, error: `Data Sync API呼び出し例外: ${err.message}` });
      }
    });
  }

  // エラー報告
  static _reportError(message) {
    console.error('Data Sync API Error:', message);
    // 必要に応じてエラー報告システムに送信
  }

  // 座席データを取得
  static async getSeats(group, day, timeslot) {
    return this._callApi('getSeats', [group, day, timeslot]);
  }

  // 予約データを取得
  static async getReservations(group, day, timeslot) {
    return this._callApi('getReservations', [group, day, timeslot]);
  }

  // ローカル変更を同期
  static async syncChanges(group, day, timeslot, changes) {
    return this._callApi('syncChanges', [group, day, timeslot, changes]);
  }
}

export default DataSyncAPI;
