// api.js
import { GAS_API_URL, GAS_API_URLS, DEBUG_MODE, debugLog } from './config.js';

class GasAPI {
  static _callApi(functionName, params = []) {
    return new Promise((resolve, reject) => {
      try {
        debugLog(`API Call (JSONP): ${functionName}`, params);

        const callbackName = 'jsonpCallback_' + functionName + '_' + Date.now();
        const encodedParams = encodeURIComponent(JSON.stringify(params));
        const encodedFuncName = encodeURIComponent(functionName);
        
        window[callbackName] = (data) => {
          debugLog(`API Response (JSONP): ${functionName}`, data);
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
              reject(new Error('無効なAPIレスポンスです'));
            }
          } catch (e) {
            console.error('API response cleanup failed:', e);
            reject(new Error('API応答の処理中にエラーが発生しました: ' + e.message));
          }
        };

        // URL 構築（キャッシュバスター付き）
        const urls = Array.isArray(GAS_API_URLS) && GAS_API_URLS.length > 0 ? GAS_API_URLS : [GAS_API_URL];
        const cacheBuster = `_=${Date.now()}`;
        const formData = `func=${encodedFuncName}&params=${encodedParams}`;
        let currentUrlIndex = 0;
        let fullUrl = `${urls[currentUrlIndex]}?callback=${callbackName}&${formData}&${cacheBuster}`;

        const script = document.createElement('script');
        script.src = fullUrl;
        script.async = true;
        
        let timeoutId = setTimeout(() => {
          console.error('API call timeout:', { functionName, fullUrl });
          try {
            delete window[callbackName];
            if (script && script.parentNode) {
              script.parentNode.removeChild(script);
            }
          } catch (e) {}
          this._reportError(`JSONPタイムアウト: ${functionName}`);
          reject(new Error(`JSONPタイムアウト: ${functionName}`));
        }, 15000);

        script.onerror = (error) => {
          console.error('API call error:', error, { functionName, fullUrl });
          try {
            // 次のURLがあればフェイルオーバー
            if (Array.isArray(urls) && currentUrlIndex < urls.length - 1) {
              currentUrlIndex++;
              const nextUrl = `${urls[currentUrlIndex]}?callback=${callbackName}&${formData}&${cacheBuster}`;
              console.warn('Failing over to next GAS url:', nextUrl);
              script.src = nextUrl;
              return; // タイムアウトは継続
            }

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
            console.error('API call failed details:', errorDetails);
            
            this._reportError(`JSONPリクエストに失敗しました: ${functionName} (詳細: ${JSON.stringify(errorDetails)})`);
            reject(new Error(`JSONPリクエストに失敗しました: ${functionName}`));
          } catch (e) {
            console.error('API error cleanup failed:', e);
            reject(new Error('APIエラー処理中に例外が発生しました: ' + e.message));
          }
        };
        
        (document.head || document.body || document.documentElement).appendChild(script);
      } catch (err) {
        console.error('API call exception:', err);
        this._reportError(`API呼び出し例外: ${err.message}`);
        reject(err);
      }
    });
  }

  static _reportError(errorMessage) {
    // エラー詳細をコンソールに出力
    console.error('API Error Details:', {
      message: errorMessage,
      timestamp: new Date().toISOString(),
      url: window.location.href
    });
    
    // UIにエラーメッセージを表示
    try {
      const errorContainer = document.getElementById('error-container');
      const errorMessageElement = document.getElementById('error-message');
      
      if (errorContainer && errorMessageElement) {
        errorMessageElement.textContent = 'サーバー通信失敗: ' + errorMessage;
        errorContainer.style.display = 'flex';
      }
    } catch (e) {
      console.error('エラー表示に失敗しました:', e);
    }
    
    // エラー報告APIを呼び出す（ただし、エラーが発生している場合はスキップ）
    try {
      const callbackName = 'jsonpCallback_reportError_' + Date.now();
      const script = document.createElement('script');
      
      window[callbackName] = (data) => {
        try {
          delete window[callbackName]; // コールバック関数を削除
          if (script && script.parentNode) {
            script.parentNode.removeChild(script); // スクリプトタグを削除
          }
          console.log('Error reported to server:', data);
        } catch (e) {
          console.error('Error cleanup failed:', e);
        }
      };

      let url = `${GAS_API_URL}?callback=${callbackName}&func=reportError&params=${encodeURIComponent(JSON.stringify([errorMessage]))}`;
      script.src = url;
      document.head.appendChild(script);
    } catch (e) {
      console.error('Error reporting failed:', e);
    }
  }

  static async getAllTimeslotsForGroup(group) {
    const response = await this._callApi('getAllTimeslotsForGroup', [group]);
    return response.data; // データを返す
  }

  static async testApi() {
    const response = await this._callApi('testApi');
    return response.data;
  }

  static async verifyModePassword(mode, password) {
    const response = await this._callApi('verifyModePassword', [mode, password]);
    return response;
  }

  static async getSeatData(group, day, timeslot, isAdmin) {
    const response = await this._callApi('getSeatData', [group, day, timeslot, isAdmin]);
    return response;
  }

  static async assignWalkInSeat(group, day, timeslot) {
    const response = await this._callApi('assignWalkInSeat', [group, day, timeslot]);
    return response;
  }

  static async reserveSeats(group, day, timeslot, selectedSeats) {
    const response = await this._callApi('reserveSeats', [group, day, timeslot, selectedSeats]);
    return response;
  }

  static async checkInSeat(group, day, timeslot, seatId) {
    const response = await this._callApi('checkInSeat', [group, day, timeslot, seatId]);
    return response;
  }

  static async checkInMultipleSeats(group, day, timeslot, seatIds) {
    const response = await this._callApi('checkInMultipleSeats', [group, day, timeslot, seatIds]);
    return response;
  }

  static async assignWalkInSeats(group, day, timeslot, count) {
    const response = await this._callApi('assignWalkInSeats', [group, day, timeslot, count]);
    return response;
  }

  static async updateSeatData(group, day, timeslot, seatId, columnC, columnD, columnE) {
    const response = await this._callApi('updateSeatData', [group, day, timeslot, seatId, columnC, columnD, columnE]);
    return response;
  }

  // GASの疎通テスト用関数
  static async testGASConnection() {
    try {
      console.log('GAS疎通テスト開始...');
      const response = await this._callApi('testApi');
      console.log('GAS疎通テスト成功:', response);
      return { success: true, data: response };
    } catch (error) {
      console.error('GAS疎通テスト失敗:', error);
      return { success: false, error: error.message };
    }
  }
}

export default GasAPI;
