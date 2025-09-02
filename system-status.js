// system-status.js
// システムの状態表示とユーザーへの通知管理

import { fallbackManager } from './fallback-manager.js';
import { debugLog } from './config.js';

class SystemStatus {
  constructor() {
    this.statusElement = null;
    this.notificationQueue = [];
    this.isShowingNotification = false;
    this.statusUpdateInterval = null;
    
    this.init();
  }

  async init() {
    // ステータス表示要素を作成
    this.createStatusElement();
    
    // 定期的なステータス更新を開始
    this.startStatusUpdates();
    
    // ネットワーク状態の監視
    this.setupNetworkMonitoring();
    
    debugLog('SystemStatus初期化完了');
  }

  // ステータス表示要素を作成
  createStatusElement() {
    // 既存の要素があれば削除
    const existing = document.getElementById('system-status');
    if (existing) {
      existing.remove();
    }

    // 新しいステータス要素を作成
    this.statusElement = document.createElement('div');
    this.statusElement.id = 'system-status';
    this.statusElement.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 8px 12px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 10000;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    document.body.appendChild(this.statusElement);
  }

  // ステータス更新を開始
  startStatusUpdates() {
    // 初回更新
    this.updateStatus();
    
    // 5秒ごとに更新
    this.statusUpdateInterval = setInterval(() => {
      this.updateStatus();
    }, 5000);
  }

  // ステータスを更新
  async updateStatus() {
    try {
      const stats = fallbackManager.getStats();
      const isOnline = fallbackManager.isOnlineStatus();
      
      let statusText = '';
      let statusColor = '#4CAF50'; // 緑
      
      if (stats.fallbackMode) {
        statusText = 'フォールバックモード';
        statusColor = '#FF9800'; // オレンジ
      } else if (!stats.isOfflineAvailable) {
        statusText = 'オフライン機能無効';
        statusColor = '#F44336'; // 赤
      } else if (!isOnline) {
        statusText = 'オフライン';
        statusColor = '#FF9800'; // オレンジ
      } else {
        statusText = 'オンライン';
        statusColor = '#4CAF50'; // 緑
      }
      
      // エラーカウントがある場合は表示
      if (stats.offlineErrorCount > 0) {
        statusText += ` (エラー: ${stats.offlineErrorCount})`;
      }
      
      this.statusElement.textContent = statusText;
      this.statusElement.style.background = statusColor;
      
      // 詳細情報をツールチップとして設定
      this.statusElement.title = this.getDetailedStatusText(stats, isOnline);
      
    } catch (error) {
      console.error('ステータス更新エラー:', error);
      this.statusElement.textContent = 'ステータス不明';
      this.statusElement.style.background = '#9E9E9E'; // グレー
    }
  }

  // 詳細なステータステキストを取得
  getDetailedStatusText(stats, isOnline) {
    const lines = [];
    
    lines.push(`ネットワーク: ${isOnline ? 'オンライン' : 'オフライン'}`);
    lines.push(`オフライン機能: ${stats.isOfflineAvailable ? '利用可能' : '利用不可'}`);
    lines.push(`フォールバックモード: ${stats.fallbackMode ? '有効' : '無効'}`);
    
    if (stats.offlineErrorCount > 0) {
      lines.push(`エラー数: ${stats.offlineErrorCount}/${stats.maxOfflineErrors}`);
    }
    
    return lines.join('\n');
  }

  // ネットワーク状態の監視を設定
  setupNetworkMonitoring() {
    window.addEventListener('online', () => {
      this.showNotification('ネットワーク接続が復旧しました', 'success');
      this.updateStatus();
    });

    window.addEventListener('offline', () => {
      this.showNotification('ネットワーク接続が切断されました', 'warning');
      this.updateStatus();
    });
  }

  // 通知を表示
  showNotification(message, type = 'info', duration = 3000) {
    const notification = {
      message,
      type,
      duration,
      timestamp: Date.now()
    };
    
    this.notificationQueue.push(notification);
    this.processNotificationQueue();
  }

  // 通知キューを処理
  async processNotificationQueue() {
    if (this.isShowingNotification || this.notificationQueue.length === 0) {
      return;
    }
    
    this.isShowingNotification = true;
    
    while (this.notificationQueue.length > 0) {
      const notification = this.notificationQueue.shift();
      await this.displayNotification(notification);
      
      // 通知間の間隔
      await this.delay(500);
    }
    
    this.isShowingNotification = false;
  }

  // 個別の通知を表示
  async displayNotification(notification) {
    const { message, type, duration } = notification;
    
    // 通知要素を作成
    const notificationElement = document.createElement('div');
    notificationElement.style.cssText = `
      position: fixed;
      top: 50px;
      right: 10px;
      background: ${this.getNotificationColor(type)};
      color: white;
      padding: 12px 16px;
      border-radius: 4px;
      font-size: 14px;
      z-index: 10001;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      transition: all 0.3s ease;
      max-width: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transform: translateX(100%);
    `;
    
    notificationElement.textContent = message;
    document.body.appendChild(notificationElement);
    
    // アニメーションで表示
    setTimeout(() => {
      notificationElement.style.transform = 'translateX(0)';
    }, 100);
    
    // 指定時間後に非表示
    setTimeout(() => {
      notificationElement.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notificationElement.parentNode) {
          notificationElement.parentNode.removeChild(notificationElement);
        }
      }, 300);
    }, duration);
  }

  // 通知タイプに応じた色を取得
  getNotificationColor(type) {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'warning':
        return '#FF9800';
      case 'error':
        return '#F44336';
      case 'info':
      default:
        return '#2196F3';
    }
  }

  // システム状態の詳細情報を表示
  showDetailedStatus() {
    const stats = fallbackManager.getStats();
    const isOnline = fallbackManager.isOnlineStatus();
    
    const details = [
      '=== システム状態詳細 ===',
      `ネットワーク: ${isOnline ? 'オンライン' : 'オフライン'}`,
      `オフライン機能: ${stats.isOfflineAvailable ? '利用可能' : '利用不可'}`,
      `フォールバックモード: ${stats.fallbackMode ? '有効' : '無効'}`,
      `エラー数: ${stats.offlineErrorCount}/${stats.maxOfflineErrors}`,
      '',
      '=== 推奨アクション ==='
    ];
    
    if (stats.fallbackMode) {
      details.push('• オフライン機能の再試行を検討してください');
      details.push('• ネットワーク接続を確認してください');
    } else if (!stats.isOfflineAvailable) {
      details.push('• ブラウザの設定を確認してください');
      details.push('• プライベートブラウジングモードを無効にしてください');
    } else if (!isOnline) {
      details.push('• ネットワーク接続を確認してください');
      details.push('• オフライン機能が自動的に動作します');
    } else {
      details.push('• システムは正常に動作しています');
    }
    
    console.log(details.join('\n'));
    this.showNotification('詳細情報をコンソールに表示しました', 'info');
  }

  // フォールバックモードを手動で切り替え
  toggleFallbackMode() {
    if (fallbackManager.isFallbackMode()) {
      fallbackManager.disableFallbackMode();
      this.showNotification('フォールバックモードを無効にしました', 'info');
    } else {
      fallbackManager.enableFallbackMode();
      this.showNotification('フォールバックモードを有効にしました', 'warning');
    }
    this.updateStatus();
  }

  // オフライン機能を再試行
  async retryOfflineFunctionality() {
    this.showNotification('オフライン機能の再試行を開始...', 'info');
    
    try {
      await fallbackManager.retryOfflineFunctionality();
      this.showNotification('オフライン機能の再試行が完了しました', 'success');
    } catch (error) {
      this.showNotification('オフライン機能の再試行に失敗しました', 'error');
      console.error('オフライン機能再試行エラー:', error);
    }
    
    this.updateStatus();
  }

  // ステータス表示をクリア
  clearStatus() {
    if (this.statusElement && this.statusElement.parentNode) {
      this.statusElement.parentNode.removeChild(this.statusElement);
      this.statusElement = null;
    }
    
    if (this.statusUpdateInterval) {
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }
  }

  // 遅延処理
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // キーボードショートカットを設定
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      // Ctrl+Shift+S: 詳細ステータス表示
      if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        this.showDetailedStatus();
      }
      
      // Ctrl+Shift+F: フォールバックモード切り替え
      if (event.ctrlKey && event.shiftKey && event.key === 'F') {
        event.preventDefault();
        this.toggleFallbackMode();
      }
      
      // Ctrl+Shift+R: オフライン機能再試行
      if (event.ctrlKey && event.shiftKey && event.key === 'R') {
        event.preventDefault();
        this.retryOfflineFunctionality();
      }
    });
  }
}

// シングルトンインスタンス
const systemStatus = new SystemStatus();

// キーボードショートカットを設定
systemStatus.setupKeyboardShortcuts();

export { SystemStatus, systemStatus };
