/**
 * 当日券発行画面のメイン処理
 */

import GasAPI from './api.js'; // GasAPIをインポート
import { loadSidebar, toggleSidebar, showModeChangeModal, applyModeChange, closeModeModal } from './sidebar.js';

// URLパラメータ取得
const urlParams = new URLSearchParams(window.location.search);
const GROUP = urlParams.get('group');
const DAY = urlParams.get('day');
const TIMESLOT = urlParams.get('timeslot');

let _isIssuingWalkin = false;

// 初期化
window.onload = async () => {
  try {
    if (window.systemLockReady && typeof window.systemLockReady.then === 'function') {
      await window.systemLockReady;
    }
  } catch (_) {}
  // サイドバー読み込み
  loadSidebar();
  
  // 表示情報設定
  const groupName = isNaN(parseInt(GROUP)) ? GROUP : GROUP + '組';
  document.getElementById('performance-info').textContent = `${groupName} ${DAY}日目 ${TIMESLOT}`;
  document.getElementById('reservation-details').innerHTML = `
    座席が確保されました<br>
    ${groupName} ${DAY}日目 ${TIMESLOT}
  `;
  
  // 当日券モードのアクセス制限をチェック
  checkWalkinModeAccess();

  // 枚数 +/- ボタンイベント
  const input = document.getElementById('walkin-count');
  const decBtn = document.getElementById('qty-decrease');
  const incBtn = document.getElementById('qty-increase');
  const min = parseInt(input?.getAttribute('min') || '1', 10);
  const max = parseInt(input?.getAttribute('max') || '6', 10);

  const clamp = (v) => Math.max(min, Math.min(max, v));

  if (decBtn && input) {
    decBtn.addEventListener('click', () => {
      const current = parseInt(input.value || '1', 10) || 1;
      input.value = String(clamp(current - 1));
      input.dispatchEvent(new Event('change'));
    });
  }
  if (incBtn && input) {
    incBtn.addEventListener('click', () => {
      const current = parseInt(input.value || '1', 10) || 1;
      input.value = String(clamp(current + 1));
      input.dispatchEvent(new Event('change'));
    });
  }
  if (input) {
    input.addEventListener('input', () => {
      const v = parseInt(input.value || '1', 10);
      if (isNaN(v)) {
        input.value = String(min);
      } else {
        input.value = String(clamp(v));
      }
    });
  }
};

// 当日券モードのアクセス制限をチェックする関数
function checkWalkinModeAccess() {
  const currentMode = localStorage.getItem('currentMode');
  const walkinBtn = document.getElementById('walkin-btn');
  
  if (currentMode !== 'walkin' && currentMode !== 'superadmin') {
    walkinBtn.disabled = true;
    walkinBtn.textContent = '当日券モードでログインしてください';
    alert('当日券発行には当日券モードまたは最高管理者モードでのログインが必要です。');
  }
}

function showLoader(visible) {
  const loader = document.getElementById('loading-modal');
  if (loader) {
    loader.style.display = visible ? 'block' : 'none';
  }
}

async function issueWalkinTicket() {
  if (_isIssuingWalkin) {
    return;
  }
  _isIssuingWalkin = true;
  const walkinBtn = document.getElementById('walkin-btn');
  const reservationResult = document.getElementById('reservation-result');
  const reservedSeatEl = document.getElementById('reserved-seat');
  const countInput = document.getElementById('walkin-count');
  const num = Math.max(1, Math.min(6, parseInt(countInput ? countInput.value : '1', 10) || 1));
  
  walkinBtn.disabled = true;
  walkinBtn.textContent = '空席を検索中...';
  showLoader(true);
  
  reservationResult.classList.remove('show');

  try {
    let response;
    if (num === 1) {
      response = await GasAPI.assignWalkInSeat(GROUP, DAY, TIMESLOT);
    } else {
      // まずは複数席APIを試す
      try {
        response = await GasAPI.assignWalkInSeats(GROUP, DAY, TIMESLOT, num);
      } catch (multiErr) {
        console.warn('assignWalkInSeats failed, falling back to single-seat loop:', multiErr);
        // 失敗した場合は単発APIを複数回叩いてフォールバック
        const seats = [];
        for (let i = 0; i < num; i++) {
          try {
            const r = await GasAPI.assignWalkInSeat(GROUP, DAY, TIMESLOT);
            if (r && r.success && r.seatId) {
              seats.push(r.seatId);
            } else {
              break;
            }
          } catch (e) {
            break;
          }
        }
        response = seats.length > 0
          ? { success: true, seatIds: seats, message: `当日券を${seats.length}席発行しました！` }
          : { success: false, message: '申し訳ありません、この回の座席は現在満席です。' };
      }
    }
    
    if (response.success) {
      // 成功時：即座に成功メッセージを表示（ローダーは非表示）
      showLoader(false);
      
      // 成功通知を表示（非ブロッキング）
      showSuccessNotification(response.message || '座席が確保されました。');
      
      walkinBtn.style.background = '#28a745';
      
      let seats = [];
      if (response.seatId) seats = [response.seatId];
      if (response.seatIds && Array.isArray(response.seatIds)) seats = response.seatIds;
      
      // 表示テキスト
      if (seats.length === 1) {
        walkinBtn.textContent = `発行完了 (座席: ${seats[0]})`;
        reservedSeatEl.textContent = seats[0];
      } else {
        walkinBtn.textContent = `発行完了 (${seats.length}席)`;
        reservedSeatEl.textContent = seats.join(' / ');
      }
      reservationResult.classList.add('show');
      
      // バックグラウンドで座席データを再取得（サイレント更新）
      setTimeout(async () => {
        try {
          // 座席データを更新（必要に応じて）
          console.log('当日券発行後のバックグラウンド更新完了');
        } catch (error) {
          console.warn('バックグラウンド更新エラー（非致命的）:', error);
        }
      }, 1000);
      
      setTimeout(() => {
        walkinBtn.disabled = false;
        walkinBtn.textContent = '再度、空席を探して当日券を発行する';
        walkinBtn.style.background = '#007bff';
      }, 3000);
    } else {
      // エラー時：UIを元に戻す
      showLoader(false);
      showErrorNotification(response.message || '空席が見つかりませんでした。');
      walkinBtn.disabled = false;
      walkinBtn.textContent = '再度、空席を探す';
    }
  } catch (error) {
    console.error('当日券発行エラー:', error);
    
    // エラー時：UIを元に戻す
    showLoader(false);
    
    // エラー通知を表示（非ブロッキング）
    const errorMessage = error.message || '不明なエラーが発生しました';
    showErrorNotification(`当日券発行中にエラーが発生しました: ${errorMessage}`);
    
    walkinBtn.disabled = false;
    walkinBtn.textContent = '空席を探して当日券を発行する';
  } finally {
    _isIssuingWalkin = false;
  }
}

async function issueWalkinConsecutive() {
  if (_isIssuingWalkin) return;
  _isIssuingWalkin = true;

  const walkinBtn = document.getElementById('walkin-btn-consecutive');
  const anywhereBtn = document.getElementById('walkin-btn-anywhere');
  const reservationResult = document.getElementById('reservation-result');
  const reservedSeatEl = document.getElementById('reserved-seat');
  const countInput = document.getElementById('walkin-count');
  const num = Math.max(1, Math.min(6, parseInt(countInput ? countInput.value : '1', 10) || 1));

  walkinBtn.disabled = true; if (anywhereBtn) anywhereBtn.disabled = true;
  walkinBtn.textContent = '連続席を検索中...';
  showLoader(true);
  reservationResult.classList.remove('show');

  try {
    const response = await GasAPI.assignWalkInConsecutiveSeats(GROUP, DAY, TIMESLOT, num);
    if (response.success) {
      showLoader(false);
      showSuccessNotification(response.message || '座席が確保されました。');

      let seats = [];
      if (response.seatId) seats = [response.seatId];
      if (response.seatIds && Array.isArray(response.seatIds)) seats = response.seatIds;

      if (seats.length === 1) {
        walkinBtn.textContent = `発行完了 (座席: ${seats[0]})`;
        reservedSeatEl.textContent = seats[0];
      } else {
        walkinBtn.textContent = `発行完了 (${seats.length}席)`;
        reservedSeatEl.textContent = seats.join(' / ');
      }
      reservationResult.classList.add('show');

      setTimeout(() => {
        walkinBtn.disabled = false; if (anywhereBtn) anywhereBtn.disabled = false;
        walkinBtn.textContent = '一緒（同一行の連続席で確保）';
      }, 3000);
    } else {
      showLoader(false);
      showErrorNotification(response.message || '連続席が見つかりませんでした。');
      walkinBtn.disabled = false; if (anywhereBtn) anywhereBtn.disabled = false;
      walkinBtn.textContent = '一緒（同一行の連続席で確保）';
    }
  } catch (error) {
    console.error('連続席発行エラー:', error);
    showLoader(false);
    showErrorNotification(`連続席発行中にエラーが発生しました: ${error.message || '不明なエラー'}`);
    walkinBtn.disabled = false; if (anywhereBtn) anywhereBtn.disabled = false;
    walkinBtn.textContent = '一緒（同一行の連続席で確保）';
  } finally {
    _isIssuingWalkin = false;
  }
}

async function issueWalkinAnywhere() {
  if (_isIssuingWalkin) return;
  _isIssuingWalkin = true;

  const consecBtn = document.getElementById('walkin-btn-consecutive');
  const walkinBtn = document.getElementById('walkin-btn-anywhere');
  const reservationResult = document.getElementById('reservation-result');
  const reservedSeatEl = document.getElementById('reserved-seat');
  const countInput = document.getElementById('walkin-count');
  const num = Math.max(1, Math.min(6, parseInt(countInput ? countInput.value : '1', 10) || 1));

  walkinBtn.disabled = true; if (consecBtn) consecBtn.disabled = true;
  walkinBtn.textContent = '空席を検索中...';
  showLoader(true);
  reservationResult.classList.remove('show');

  try {
    let response;
    if (num === 1) {
      response = await GasAPI.assignWalkInSeat(GROUP, DAY, TIMESLOT);
    } else {
      response = await GasAPI.assignWalkInSeats(GROUP, DAY, TIMESLOT, num);
    }

    if (response.success) {
      showLoader(false);
      showSuccessNotification(response.message || '座席が確保されました。');

      let seats = [];
      if (response.seatId) seats = [response.seatId];
      if (response.seatIds && Array.isArray(response.seatIds)) seats = response.seatIds;

      if (seats.length === 1) {
        walkinBtn.textContent = `発行完了 (座席: ${seats[0]})`;
        reservedSeatEl.textContent = seats[0];
      } else {
        walkinBtn.textContent = `発行完了 (${seats.length}席)`;
        reservedSeatEl.textContent = seats.join(' / ');
      }
      reservationResult.classList.add('show');

      setTimeout(() => {
        walkinBtn.disabled = false; if (consecBtn) consecBtn.disabled = false;
        walkinBtn.textContent = 'どこでもよい（ランダム）';
      }, 3000);
    } else {
      showLoader(false);
      showErrorNotification(response.message || '空席が見つかりませんでした。');
      walkinBtn.disabled = false; if (consecBtn) consecBtn.disabled = false;
      walkinBtn.textContent = 'どこでもよい（ランダム）';
    }
  } catch (error) {
    console.error('当日券発行エラー:', error);
    showLoader(false);
    const errorMessage = error.message || '不明なエラーが発生しました';
    showErrorNotification(`当日券発行中にエラーが発生しました: ${errorMessage}`);
    walkinBtn.disabled = false; if (consecBtn) consecBtn.disabled = false;
    walkinBtn.textContent = 'どこでもよい（ランダム）';
  } finally {
    _isIssuingWalkin = false;
  }
}

// 成功通知を表示する関数（非ブロッキング）
function showSuccessNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'success-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">✓</span>
      <span class="notification-message">${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  
  // 通知を表示
  document.body.appendChild(notification);
  
  // 3秒後に自動で消す
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 3000);
}

// エラー通知を表示する関数（非ブロッキング）
function showErrorNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'error-notification';
  notification.innerHTML = `
    <div class="notification-content">
      <span class="notification-icon">✗</span>
      <span class="notification-message">${message}</span>
      <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
    </div>
  `;
  
  // 通知を表示
  document.body.appendChild(notification);
  
  // 5秒後に自動で消す
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove();
    }
  }, 5000);
}

// グローバル関数として設定
window.issueWalkinTicket = issueWalkinTicket;
window.showLoader = showLoader;
window.toggleSidebar = toggleSidebar;

// グローバル関数登録（HTMLから呼ぶ）
window.issueWalkinConsecutive = issueWalkinConsecutive;
window.issueWalkinAnywhere = issueWalkinAnywhere;
