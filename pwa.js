// pwa.js - PWA管理用スクリプト
import errorHandler from './error-handler.js';

class PWA {
  constructor() {
    this.deferredPrompt = null;
    this.isOnline = navigator.onLine;
    this.init();
  }

  async init() {
    this.registerServiceWorker();
    this.setupEventListeners();
    this.checkInstallability();
    this.updateOnlineStatus();
    // ロック状態の監視はページ安定後・アイドル時に開始（他機能を最優先）
    const deferStart = () => this.startSystemLockWatcher();
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(deferStart, { timeout: 5000 });
    } else {
      window.addEventListener('load', () => setTimeout(deferStart, 1500));
    }
  }

  async startSystemLockWatcher() {
    try {
      const { default: GasAPI } = await import('./api.js');
      let domObserver = null;
      const ensureGate = () => {
        if (!document.getElementById('system-lock-gate')) {
          const gate = document.createElement('div');
          gate.id = 'system-lock-gate';
          gate.style.position = 'fixed';
          gate.style.inset = '0';
          gate.style.zIndex = '99999';
          gate.style.background = 'rgba(0,0,0,0.85)';
          gate.style.display = 'flex';
          gate.style.alignItems = 'center';
          gate.style.justifyContent = 'center';
          gate.style.pointerEvents = 'all';
          gate.innerHTML = '<div style="background:#fff;padding:24px;border-radius:8px;max-width:360px;width:90%;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.3)"><h3 style="margin:0 0 12px 0;">システムはロックされています</h3><p style="margin:0 0 16px 0;color:#555;font-size:14px;">アクセスには最高管理者パスワードが必要です。</p></div>';
          document.body.appendChild(gate);
        }
      };

      const tick = async () => {
        try {
          const status = await GasAPI.getSystemLock();
          if (status && status.success && status.locked) {
            ensureGate();
            // ロック中のみDOM監視を有効化
            if (!domObserver) {
              domObserver = new MutationObserver(() => {
                if (!document.getElementById('system-lock-gate')) ensureGate();
              });
              domObserver.observe(document.body, { childList: true });
            }
          } else {
            const gate = document.getElementById('system-lock-gate');
            if (gate) gate.remove();
            if (domObserver) { domObserver.disconnect(); domObserver = null; }
          }
        } catch (error) {
          errorHandler.handleError(error, 'lock', () => {
            console.warn('System lock check failed, maintaining lock state for safety');
          });
        }
      };

      // 初回は軽く遅延してUIをブロックしない
      setTimeout(tick, 1000);
      // ポーリング間隔は30秒（低負荷）
      setInterval(tick, 30000);
    } catch (error) {
      errorHandler.handleError(error, 'lock', () => {
        console.warn('Failed to start system lock watcher, disabling lock feature');
      });
    }
  }

  // Service Workerの登録
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully:', registration);
        
        // 更新の確認
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateNotification();
            }
          });
        });
      } catch (error) {
        errorHandler.handleError(error, 'service-worker', () => {
          console.error('Service Worker registration failed, continuing without PWA features');
        });
      }
    }
  }

  // イベントリスナーの設定
  setupEventListeners() {
    // インストールプロンプトの保存
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this.showInstallButton();
    });

    // インストール完了時の処理
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed');
      this.hideInstallButton();
      this.deferredPrompt = null;
    });

    // オンライン/オフライン状態の監視
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.updateOnlineStatus();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.updateOnlineStatus();
    });
  }

  // インストール可能かチェック
  checkInstallability() {
    if (this.deferredPrompt) {
      this.showInstallButton();
    }
  }

  // インストールボタンの表示
  showInstallButton() {
    let installButton = document.getElementById('install-button');
    if (!installButton) {
      installButton = this.createInstallButton();
    }
    installButton.style.display = 'block';
  }

  // インストールボタンの非表示
  hideInstallButton() {
    const installButton = document.getElementById('install-button');
    if (installButton) {
      installButton.style.display = 'none';
    }
  }

  // インストールボタンの作成
  createInstallButton() {
    const button = document.createElement('button');
    button.id = 'install-button';
    button.className = 'install-button';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
      </svg>
      アプリをインストール
    `;
    button.addEventListener('click', () => this.installApp());
    
    // ヘッダーに追加
    const header = document.querySelector('.page-header');
    if (header) {
      header.appendChild(button);
    }
    
    return button;
  }

  // アプリのインストール
  async installApp() {
    if (!this.deferredPrompt) {
      return;
    }

    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    this.deferredPrompt = null;
    this.hideInstallButton();
  }

  // オンライン状態の更新
  updateOnlineStatus() {
    const statusIndicator = document.getElementById('online-status');
    if (!statusIndicator) {
      this.createOnlineStatusIndicator();
    } else {
      statusIndicator.className = this.isOnline ? 'online' : 'offline';
      statusIndicator.textContent = this.isOnline ? 'オンライン' : 'オフライン';
    }
  }

  // オンライン状態インジケーターの作成
  createOnlineStatusIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'online-status';
    indicator.className = this.isOnline ? 'online' : 'offline';
    indicator.textContent = this.isOnline ? 'オンライン' : 'オフライン';
    // 右下に固定表示
    indicator.style.position = 'fixed';
    indicator.style.right = '20px';
    indicator.style.bottom = '20px';
    indicator.style.zIndex = '1000';
    document.body.appendChild(indicator);
  }

  // 更新通知の表示
  showUpdateNotification() {
    const notification = document.createElement('div');
    notification.className = 'update-notification';
    notification.innerHTML = `
      <div class="update-content">
        <p>新しいバージョンが利用可能です</p>
        <button onclick="location.reload()">更新</button>
        <button onclick="this.parentElement.parentElement.remove()">後で</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // 5秒後に自動で消す
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  // オフライン時のデータ保存
  saveOfflineData(key, data) {
    if ('localStorage' in window) {
      try {
        localStorage.setItem(`offline_${key}`, JSON.stringify({
          data: data,
          timestamp: Date.now()
        }));
      } catch (error) {
        console.error('Failed to save offline data:', error);
      }
    }
  }

  // オフライン時のデータ取得
  getOfflineData(key) {
    if ('localStorage' in window) {
      try {
        const stored = localStorage.getItem(`offline_${key}`);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (error) {
        console.error('Failed to get offline data:', error);
      }
    }
    return null;
  }

  // プッシュ通知の登録
  async registerPushNotifications() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Push notifications enabled');
        return true;
      }
    }
    return false;
  }
}

// PWAインスタンスの作成
const pwa = new PWA();

// グローバルに公開
window.pwa = pwa;
