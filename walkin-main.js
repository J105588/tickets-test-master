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

// 初期化
window.onload = () => {
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
  
  if (currentMode !== 'walkin' && currentMode !== 'admin') {
    walkinBtn.disabled = true;
    walkinBtn.textContent = '当日券モードでログインしてください';
    alert('当日券発行には当日券モードまたは管理者モードでのログインが必要です。');
  }
}

function showLoader(visible) {
  const loader = document.getElementById('loading-modal');
  if (loader) {
    loader.style.display = visible ? 'block' : 'none';
  }
}

async function issueWalkinTicket() {
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
      response = await GasAPI.assignWalkInSeats(GROUP, DAY, TIMESLOT, num);
    }
    
    if (response.success) {
      alert(response.message || '座席が確保されました。');
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
      
      setTimeout(() => {
        walkinBtn.disabled = false;
        walkinBtn.textContent = '再度、空席を探して当日券を発行する';
        walkinBtn.style.background = '#007bff';
      }, 3000);
    } else {
      alert(response.message || '空席が見つかりませんでした。');
      walkinBtn.disabled = false;
      walkinBtn.textContent = '再度、空席を探す';
    }
  } catch (error) {
    alert('エラーが発生しました: ' + error.message);
    walkinBtn.disabled = false;
    walkinBtn.textContent = '空席を探して当日券を発行する';
  } finally {
    showLoader(false);
  }
}

// ボタン押下時に実行されるようにイベントリスナーを追加
document.getElementById('walkin-btn').addEventListener('click', issueWalkinTicket);

// グローバル関数として設定
window.issueWalkinTicket = issueWalkinTicket;
window.showLoader = showLoader;
window.toggleSidebar = toggleSidebar;
