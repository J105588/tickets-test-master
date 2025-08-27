// system-lock.js - システムロック機能
import errorHandler from './error-handler.js';

class SystemLock {
  constructor() {
    this.init();
  }

  async init() {
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
}

// システムロックインスタンスの作成
const systemLock = new SystemLock();

// グローバルに公開
window.systemLock = systemLock;
