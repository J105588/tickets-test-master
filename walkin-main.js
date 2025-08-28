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
  const walkinBtn = document.getElementById('walkin-open-modal-btn');
  
  if (currentMode !== 'walkin' && currentMode !== 'superadmin') {
    if (walkinBtn) {
      walkinBtn.disabled = true;
      walkinBtn.textContent = '当日券モードでログインしてください';
    }
    alert('当日券発行には当日券モードまたは最高管理者モードでのログインが必要です。');
  }
}

function showLoader(visible) {
  const loader = document.getElementById('loading-modal');
  if (loader) {
    loader.style.display = visible ? 'block' : 'none';
  }
}

// モーダルを開く関数
function openWalkinOptionModal() {
  const modal = document.getElementById('walkin-option-modal');
  if (modal) modal.style.display = 'block';
}

// モーダルを閉じる関数
function closeWalkinOptionModal() {
  const modal = document.getElementById('walkin-option-modal');
  if (modal) modal.style.display = 'none';
}

// 連続席で当日券を発行する関数
async function issueWalkinConsecutive() {
  closeWalkinOptionModal();
  if (_isIssuingWalkin) return;
  _isIssuingWalkin = true;

  const reservationResult = document.getElementById('reservation-result');
  const reservedSeatEl = document.getElementById('reserved-seat');
  const countInput = document.getElementById('walkin-count');
  const num = Math.max(1, Math.min(6, parseInt(countInput ? countInput.value : '1', 10) || 1));

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
        reservedSeatEl.textContent = seats[0];
      } else {
        reservedSeatEl.textContent = seats.join(' / ');
      }
      reservationResult.classList.add('show');
    } else {
      showLoader(false);
      showErrorNotification(response.message || '連続席が見つかりませんでした。');
    }
  } catch (error) {
    console.error('連続席発行エラー:', error);
    showLoader(false);
    showErrorNotification(`連続席発行中にエラーが発生しました: ${error.message || '不明なエラー'}`);
  } finally {
    _isIssuingWalkin = false;
  }
}

// どこでもよい（ランダム）で当日券を発行する関数
async function issueWalkinAnywhere() {
  closeWalkinOptionModal();
  if (_isIssuingWalkin) return;
  _isIssuingWalkin = true;

  const reservationResult = document.getElementById('reservation-result');
  const reservedSeatEl = document.getElementById('reserved-seat');
  const countInput = document.getElementById('walkin-count');
  const num = Math.max(1, Math.min(6, parseInt(countInput ? countInput.value : '1', 10) || 1));

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
        reservedSeatEl.textContent = seats[0];
      } else {
        reservedSeatEl.textContent = seats.join(' / ');
      }
      reservationResult.classList.add('show');
    } else {
      showLoader(false);
      showErrorNotification(response.message || '空席が見つかりませんでした。');
    }
  } catch (error) {
    console.error('当日券発行エラー:', error);
    showLoader(false);
    const errorMessage = error.message || '不明なエラーが発生しました';
    showErrorNotification(`当日券発行中にエラーが発生しました: ${errorMessage}`);
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
window.showLoader = showLoader;
window.toggleSidebar = toggleSidebar;

// グローバル関数登録（HTMLから呼ぶ）
window.issueWalkinConsecutive = issueWalkinConsecutive;
window.issueWalkinAnywhere = issueWalkinAnywhere;

// グローバル登録
window.openWalkinOptionModal = openWalkinOptionModal;
window.closeWalkinOptionModal = closeWalkinOptionModal;
