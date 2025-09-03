// error-handler-enhanced.js
// 強化されたエラーハンドリングとユーザーフレンドリーなエラー表示

import { fallbackManager } from './fallback-manager.js';
import { systemStatus } from './system-status.js';
import { debugLog } from './config.js';

class ErrorHandler {
  constructor() {
    this.errorCounts = new Map();
    this.maxErrorsPerOperation = 3;
    this.errorResetTime = 60000; // 1分
    this.userFriendlyMessages = new Map();
    
    this.init();
  }

  init() {
    // ユーザーフレンドリーなエラーメッセージを設定
    this.setupUserFriendlyMessages();
    
    // グローバルエラーハンドラーを設定
    this.setupGlobalErrorHandlers();
    
    debugLog('ErrorHandler初期化完了');
  }

  // ユーザーフレンドリーなエラーメッセージを設定
  setupUserFriendlyMessages() {
    this.userFriendlyMessages.set('NetworkError', {
      title: 'ネットワークエラー',
      message: 'インターネット接続を確認してください。',
      action: '接続を確認してから再試行してください。'
    });
    
    this.userFriendlyMessages.set('QuotaExceededError', {
      title: 'ストレージ容量不足',
      message: 'ブラウザのストレージ容量が不足しています。',
      action: 'ブラウザのキャッシュをクリアしてください。'
    });
    
    this.userFriendlyMessages.set('TimeoutError', {
      title: 'タイムアウトエラー',
      message: 'サーバーからの応答が遅すぎます。',
      action: 'しばらく待ってから再試行してください。'
    });
    
    this.userFriendlyMessages.set('PermissionError', {
      title: '権限エラー',
      message: 'この操作を実行する権限がありません。',
      action: '管理者に連絡してください。'
    });
    
    this.userFriendlyMessages.set('ValidationError', {
      title: '入力エラー',
      message: '入力された情報に問題があります。',
      action: '入力内容を確認してください。'
    });
    
    this.userFriendlyMessages.set('ServerError', {
      title: 'サーバーエラー',
      message: 'サーバーで問題が発生しました。',
      action: 'しばらく待ってから再試行してください。'
    });
    
    this.userFriendlyMessages.set('OfflineError', {
      title: 'オフラインエラー',
      message: 'オフライン機能が利用できません。',
      action: 'ネットワーク接続を確認してください。'
    });
  }

  // グローバルエラーハンドラーを設定
  setupGlobalErrorHandlers() {
    // 未処理のPromise拒否をキャッチ
    window.addEventListener('unhandledrejection', (event) => {
      console.error('未処理のPromise拒否:', event.reason);
      this.handleError(event.reason, 'unhandledrejection');
      event.preventDefault();
    });
    
    // 未処理のエラーをキャッチ
    window.addEventListener('error', (event) => {
      console.error('未処理のエラー:', event.error);
      this.handleError(event.error, 'unhandlederror');
    });
  }

  // エラーを処理
  handleError(error, operation = 'unknown', context = {}) {
    const errorKey = `${operation}_${this.getErrorType(error)}`;
    
    // エラーカウントを増加
    this.incrementErrorCount(errorKey);
    
    // エラーログを出力
    this.logError(error, operation, context);
    
    // ユーザーに通知
    this.notifyUser(error, operation, context);
    
    // システムステータスを更新
    this.updateSystemStatus(error, operation);
    
    // エラーが多すぎる場合はフォールバックモードを有効化
    if (this.getErrorCount(errorKey) >= this.maxErrorsPerOperation) {
      this.handleExcessiveErrors(errorKey, operation);
    }
  }

  // エラータイプを取得
  getErrorType(error) {
    if (error.name) {
      return error.name;
    }
    
    if (error.message) {
      if (error.message.includes('network') || error.message.includes('fetch')) {
        return 'NetworkError';
      }
      if (error.message.includes('quota') || error.message.includes('storage')) {
        return 'QuotaExceededError';
      }
      if (error.message.includes('timeout')) {
        return 'TimeoutError';
      }
      if (error.message.includes('permission') || error.message.includes('unauthorized')) {
        return 'PermissionError';
      }
      if (error.message.includes('validation') || error.message.includes('invalid')) {
        return 'ValidationError';
      }
      if (error.message.includes('server') || error.message.includes('500')) {
        return 'ServerError';
      }
      if (error.message.includes('offline') || error.message.includes('IndexedDB')) {
        return 'OfflineError';
      }
    }
    
    return 'UnknownError';
  }

  // エラーカウントを増加
  incrementErrorCount(errorKey) {
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);
    
    // 一定時間後にカウントをリセット
    setTimeout(() => {
      this.errorCounts.delete(errorKey);
    }, this.errorResetTime);
  }

  // エラーカウントを取得
  getErrorCount(errorKey) {
    return this.errorCounts.get(errorKey) || 0;
  }

  // エラーログを出力
  logError(error, operation, context) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      operation,
      errorType: this.getErrorType(error),
      message: error.message || 'Unknown error',
      stack: error.stack,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.error('=== エラー詳細 ===');
    console.error('操作:', operation);
    console.error('エラータイプ:', errorInfo.errorType);
    console.error('メッセージ:', errorInfo.message);
    console.error('コンテキスト:', context);
    console.error('スタックトレース:', error.stack);
    console.error('==================');
    
    // デバッグモードの場合は詳細情報を出力
    if (window.DEBUG_MODE) {
      console.table(errorInfo);
    }
  }

  // ユーザーに通知
  notifyUser(error, operation, context) {
    const errorType = this.getErrorType(error);
    const userMessage = this.userFriendlyMessages.get(errorType);
    
    if (userMessage) {
      systemStatus.showNotification(
        `${userMessage.title}: ${userMessage.message}`,
        this.getNotificationType(errorType),
        5000
      );
    } else {
      systemStatus.showNotification(
        `エラーが発生しました: ${error.message || '不明なエラー'}`,
        'error',
        5000
      );
    }
  }

  // 通知タイプを取得
  getNotificationType(errorType) {
    switch (errorType) {
      case 'NetworkError':
      case 'TimeoutError':
      case 'ServerError':
        return 'error';
      case 'QuotaExceededError':
      case 'PermissionError':
        return 'warning';
      case 'ValidationError':
        return 'warning';
      case 'OfflineError':
        return 'info';
      default:
        return 'error';
    }
  }

  // システムステータスを更新
  updateSystemStatus(error, operation) {
    const errorType = this.getErrorType(error);
    
    // オフライン関連のエラーの場合はフォールバックマネージャーに通知
    if (errorType === 'OfflineError' || errorType === 'QuotaExceededError') {
      fallbackManager.handleError(error, operation);
    }
  }

  // 過度なエラーを処理
  handleExcessiveErrors(errorKey, operation) {
    console.warn(`操作 "${operation}" でエラーが多すぎます。フォールバックモードを検討します。`);
    
    // オフライン関連のエラーの場合はフォールバックモードを有効化
    if (errorKey.includes('OfflineError') || errorKey.includes('QuotaExceededError')) {
      fallbackManager.enableFallbackMode();
      systemStatus.showNotification(
        'オフライン機能でエラーが多発しているため、フォールバックモードに移行しました。',
        'warning',
        8000
      );
    }
  }

  // エラーを安全に処理（try-catchのラッパー）
  async safeExecute(operation, context = {}) {
    try {
      return await operation();
    } catch (error) {
      this.handleError(error, context.operation || 'safeExecute', context);
      return context.defaultValue || null;
    }
  }

  // 同期操作を安全に実行
  safeExecuteSync(operation, context = {}) {
    try {
      return operation();
    } catch (error) {
      this.handleError(error, context.operation || 'safeExecuteSync', context);
      return context.defaultValue || null;
    }
  }

  // リトライ機能付きの実行
  async executeWithRetry(operation, maxRetries = 3, delay = 1000, context = {}) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries) {
          console.warn(`操作失敗 (試行 ${attempt}/${maxRetries}):`, error.message);
          await this.delay(delay * attempt);
        } else {
          console.error(`操作が ${maxRetries} 回失敗しました:`, error);
          this.handleError(error, context.operation || 'executeWithRetry', {
            ...context,
            attempts: maxRetries,
            finalAttempt: true
          });
        }
      }
    }
    
    throw lastError;
  }

  // エラー統計を取得
  getErrorStatistics() {
    const stats = {
      totalErrors: 0,
      errorTypes: {},
      recentErrors: []
    };
    
    for (const [errorKey, count] of this.errorCounts) {
      stats.totalErrors += count;
      const errorType = errorKey.split('_')[1];
      stats.errorTypes[errorType] = (stats.errorTypes[errorType] || 0) + count;
    }
    
    return stats;
  }

  // エラー統計をクリア
  clearErrorStatistics() {
    this.errorCounts.clear();
    console.log('エラー統計をクリアしました');
  }

  // 遅延処理
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // エラーレポートを生成
  async generateErrorReport() {
    const stats = this.getErrorStatistics();
    const fallbackStats = await fallbackManager.getStats();
    
    const report = {
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      errorStatistics: stats,
      fallbackStatistics: fallbackStats,
      systemInfo: {
        online: navigator.onLine,
        language: navigator.language,
        platform: navigator.platform
      }
    };
    
    console.log('=== エラーレポート ===');
    console.log(JSON.stringify(report, null, 2));
    console.log('====================');
    
    return report;
  }
}

// シングルトンインスタンス
const errorHandler = new ErrorHandler();

// グローバルに公開（デバッグ用）
window.errorHandler = errorHandler;

export { ErrorHandler, errorHandler };
