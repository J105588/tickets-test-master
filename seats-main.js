// seats-main.js
import GasAPI from './api.js';
import { loadSidebar, toggleSidebar, showModeChangeModal, applyModeChange, closeModeModal } from './sidebar.js';
import { GAS_API_URL, DEBUG_MODE, debugLog } from './config.js';

/**
 * 座席選択画面のメイン処理
 */
const urlParams = new URLSearchParams(window.location.search);
const GROUP = urlParams.get('group') || '見本演劇';
const DAY = urlParams.get('day') || '1';
const TIMESLOT = urlParams.get('timeslot') || 'A';
const IS_ADMIN = urlParams.get('admin') === 'true';

let selectedSeats = [];
let isAutoRefreshEnabled = true;
let autoRefreshInterval = null;
let lastUpdateTime = null;
let isRefreshing = false;
let settingsOpen = false;
let isUserInteracting = false; // ユーザーが操作中かどうか
let interactionTimeout = null; // 操作終了を検知するためのタイマー

// APIエンドポイントを設定
const apiEndpoint = GAS_API_URL;
// GasAPIはstaticメソッドを使用するため、インスタンス化は不要

// 初期化
window.onload = async () => {
  loadSidebar();

  const groupName = isNaN(parseInt(GROUP)) ? GROUP : GROUP + '組';
  const performanceInfo = document.getElementById('performance-info');
  if (performanceInfo) {
    performanceInfo.textContent = `${groupName} ${DAY}日目 ${TIMESLOT}`;
  }

  // 現在のモードを取得
  const currentMode = localStorage.getItem('currentMode') || 'normal';
  const isAdminMode = currentMode === 'admin' || IS_ADMIN;

  // 管理者モードの表示制御
  const adminIndicator = document.getElementById('admin-indicator');
  const adminLoginBtn = document.getElementById('admin-login-btn');
  const submitButton = document.getElementById('submit-button');
  const checkInSelectedBtn = document.getElementById('check-in-selected-btn');
  
  if (isAdminMode) {
    if (adminIndicator) adminIndicator.style.display = 'block';
    if (adminLoginBtn) adminLoginBtn.style.display = 'none';
    if (submitButton) submitButton.style.display = 'none';
    if (checkInSelectedBtn) checkInSelectedBtn.style.display = 'block';
  } else {
    if (adminIndicator) adminIndicator.style.display = 'none';
    if (adminLoginBtn) adminLoginBtn.style.display = 'block';
    if (submitButton) submitButton.style.display = 'block';
    if (checkInSelectedBtn) checkInSelectedBtn.style.display = 'none';
  }

  showLoader(true);

  try {
    // 現在のモードを取得して管理者権限を判定
    const currentMode = localStorage.getItem('currentMode') || 'normal';
    const isAdminMode = currentMode === 'admin' || IS_ADMIN;
    
    console.log('GasAPI.getSeatData呼び出し:', { GROUP, DAY, TIMESLOT, isAdminMode });
    const seatData = await GasAPI.getSeatData(GROUP, DAY, TIMESLOT, isAdminMode);
    
    // 詳細なデバッグ情報をコンソールに出力
    console.log("===== 座席データ詳細情報 =====");
    console.log("Received seatData:", seatData);
    
    if (seatData.seatMap) {
      console.log("座席マップ構造:", Object.keys(seatData.seatMap));
      console.log("座席データサンプル:", Object.values(seatData.seatMap).slice(0, 3));
    } else {
      console.log("座席マップが存在しません");
    }
    console.log("===== 座席データ詳細情報終了 =====");
    
    if (seatData.success === false) {
      const errorMsg = seatData.error || seatData.message || 'データ読み込みに失敗しました';
      console.error('座席データ読み込み失敗:', errorMsg);
      document.getElementById('error-message').textContent = 'データ読み込み失敗: ' + errorMsg;
      document.getElementById('error-container').style.display = 'flex';
      return;
    }

    drawSeatMap(seatData.seatMap);
    updateLastUpdateTime();
    updateSelectedSeatsDisplay(); // 初期化時に選択された座席数を更新
    
    // 自動更新設定の初期化
    const toggleCheckbox = document.getElementById('auto-refresh-toggle-checkbox');
    if (toggleCheckbox) {
      toggleCheckbox.checked = isAutoRefreshEnabled;
      toggleCheckbox.addEventListener('change', toggleAutoRefresh);
    }
    
    // 最終更新時間の初期表示
    updateLastUpdateTime();
    
    startAutoRefresh();
  } catch (error) {
    console.error('サーバー通信失敗:', error);
    document.getElementById('error-message').textContent = 'サーバー通信失敗: ' + error.message;
    document.getElementById('error-container').style.display = 'flex';
  } finally {
    showLoader(false);
  }
};

// 最終アップデート時間を取得
function updateLastUpdateTime() {
  lastUpdateTime = new Date();
  const lastUpdateEl = document.getElementById('last-update-display');
  if (lastUpdateEl) {
    lastUpdateEl.textContent = `最終更新: ${lastUpdateTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    console.warn('最終更新時間を表示する要素が見つかりません');
  }
}

// ローダー表示制御
function showLoader(visible) {
  const loader = document.getElementById('loading-modal');
  if (loader) {
    loader.style.display = visible ? 'block' : 'none';
  }
}

// 座席マップを描画する関数
function drawSeatMap(seatMap) {
  const container = document.getElementById('seat-map-container');
  if (!container) {
    console.error('座席マップコンテナが見つかりません');
    return;
  }
  container.innerHTML = '';

  const layout = {
    rows: ['A', 'B', 'C', 'D', 'E'],
    cols: 12,
    passageAfter: 6
  };

  const seatSection = document.createElement('div');
  seatSection.className = 'seat-section';

  layout.rows.forEach(rowLabel => {
      const rowEl = document.createElement('div');
      rowEl.className = 'seat-row';
      
      for (let i = 1; i <= layout.cols; i++) {
          let seatId;
          
          if (rowLabel === 'E') {
              // E列は4,5,6,7,8,9の位置に1,2,3,4,5,6が配置される
              if (i >= 4 && i <= 9) {
                  const eSeatNumber = i - 3; // 1,2,3,4,5,6
                  seatId = 'E' + eSeatNumber;
              } else {
                  // 1,2,3,10,11,12の位置は空席（通路または使用不可）
                  const emptySpace = document.createElement('div');
                  emptySpace.className = 'empty-space';
                  rowEl.appendChild(emptySpace);
                  continue;
              }
          } else {
              // A-D列は通常通り1-12の位置
              seatId = rowLabel + i;
          }
          
          const seatData = seatMap[seatId] || { id: seatId, status: 'unavailable', name: null };
          rowEl.appendChild(createSeatElement(seatData));

          if (i === layout.passageAfter) {
              const passage = document.createElement('div');
              passage.className = 'passage';
              rowEl.appendChild(passage);
          }
      }
      seatSection.appendChild(rowEl);
  });

  container.appendChild(seatSection);
}

// 自動更新機能の実装
function startAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
  
  // ユーザーが操作中でない場合のみ自動更新を開始
  if (isAutoRefreshEnabled && isPageVisible && !isUserInteracting) {
    autoRefreshInterval = setInterval(async () => {
      if (isRefreshing || !isPageVisible || isUserInteracting) return; // 操作中は更新しない
      
      isRefreshing = true;
      try {
        // 現在のモードを取得して管理者権限を判定
        const currentMode = localStorage.getItem('currentMode') || 'normal';
        const isAdminMode = currentMode === 'admin' || IS_ADMIN;
        
        const seatData = await GasAPI.getSeatData(GROUP, DAY, TIMESLOT, isAdminMode);
        
        if (seatData.success) {
          drawSeatMap(seatData.seatMap);
          updateLastUpdateTime();
        }
      } catch (error) {
        console.error('自動更新エラー:', error);
      } finally {
        isRefreshing = false;
      }
    }, 30000); // 30秒ごとに更新
  }
}

// 自動更新の切り替え
function toggleAutoRefresh() {
  isAutoRefreshEnabled = !isAutoRefreshEnabled;
  const toggleBtn = document.getElementById('auto-refresh-toggle-checkbox');
  
  if (toggleBtn) {
    toggleBtn.checked = isAutoRefreshEnabled;
  }
  
  if (isAutoRefreshEnabled && isPageVisible) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
}

// 座席要素を作成する関数
function createSeatElement(seatData) {
  const seat = document.createElement('div');
  seat.className = `seat ${seatData.status}`;
  seat.dataset.id = seatData.id;
  
  // 座席IDを表示
  const seatIdEl = document.createElement('div');
  seatIdEl.className = 'seat-id';
  seatIdEl.textContent = seatData.id;
  seat.appendChild(seatIdEl);
  
  // 管理者モードでチェックイン可能な座席を選択可能にする
  const currentMode = localStorage.getItem('currentMode') || 'normal';
  const isAdminMode = currentMode === 'admin' || IS_ADMIN;
  
  if (isAdminMode && (seatData.status === 'to-be-checked-in' || seatData.status === 'reserved')) {
    // チェックイン可能な座席を選択可能にする
    seat.classList.add('checkin-selectable');
    seat.dataset.seatName = seatData.name || '';
  }
  
  // 名前を表示（長い場合は省略）
  if (seatData.name && seatData.status !== 'available') {
    const nameEl = document.createElement('div');
    nameEl.className = 'seat-name';
    
    // 名前が長すぎる場合は省略表示
    if (seatData.name.length > 8) {
      nameEl.textContent = seatData.name.substring(0, 8) + '...';
      nameEl.title = seatData.name; // ツールチップで全文表示
    } else {
      nameEl.textContent = seatData.name;
    }
    
    seat.appendChild(nameEl);
  }
  
  seat.addEventListener('click', () => handleSeatClick(seatData));
  return seat;
}

// 座席クリック時の処理
function handleSeatClick(seatData) {
  const currentMode = localStorage.getItem('currentMode') || 'normal';
  const isAdminMode = currentMode === 'admin' || IS_ADMIN;
  
  if (isAdminMode) {
    // 管理者モード：チェックイン可能な座席を選択
    handleAdminSeatClick(seatData);
  } else {
    // 通常モード：予約可能な座席を選択
    handleNormalSeatClick(seatData);
  }
}

// 管理者モードでの座席クリック処理
function handleAdminSeatClick(seatData) {
  // チェックイン可能な座席のみ選択可能（確保ステータスも含む）
  if (seatData.status !== 'to-be-checked-in' && seatData.status !== 'reserved') {
    console.log('この座席はチェックインできません:', seatData.status);
    return;
  }

  const seatElement = document.querySelector(`[data-id="${seatData.id}"]`);
  if (!seatElement) return;

  // ユーザー操作開始
  startUserInteraction();

  // 座席の選択状態を切り替え
  if (seatElement.classList.contains('selected-for-checkin')) {
    // 選択解除
    seatElement.classList.remove('selected-for-checkin');
    selectedSeats = selectedSeats.filter(id => id !== seatData.id);
  } else {
    // 選択
    seatElement.classList.add('selected-for-checkin');
    selectedSeats.push(seatData.id);
  }

  // 選択された座席数を表示
  updateSelectedSeatsDisplay();
  
  console.log('チェックイン対象座席:', selectedSeats);
}

// 通常モードでの座席クリック処理
function handleNormalSeatClick(seatData) {
  // 利用可能な座席のみ選択可能
  if (seatData.status !== 'available') {
    console.log('この座席は選択できません:', seatData.status);
    return;
  }

  const seatElement = document.querySelector(`[data-id="${seatData.id}"]`);
  if (!seatElement) return;

  // ユーザー操作開始
  startUserInteraction();

  // 座席の選択状態を切り替え
  if (seatElement.classList.contains('selected')) {
    // 選択解除
    seatElement.classList.remove('selected');
    selectedSeats = selectedSeats.filter(id => id !== seatData.id);
  } else {
    // 選択
    seatElement.classList.add('selected');
    selectedSeats.push(seatData.id);
  }

  // 選択された座席数を表示
  updateSelectedSeatsDisplay();
  
  console.log('選択された座席:', selectedSeats);
}

// 選択された座席数の表示を更新
function updateSelectedSeatsDisplay() {
  const submitButton = document.getElementById('submit-button');
  if (submitButton) {
    if (selectedSeats.length > 0) {
      submitButton.textContent = `この席で予約する (${selectedSeats.length}席)`;
      submitButton.disabled = false;
    } else {
      submitButton.textContent = 'この席で予約する';
      submitButton.disabled = true;
    }
  }
}

// グローバル関数として設定
window.showLoader = showLoader;
window.toggleAutoRefresh = toggleAutoRefresh;
window.checkInSelected = checkInSelected;
window.confirmReservation = confirmReservation;
window.promptForAdminPassword = promptForAdminPassword;
window.toggleAutoRefreshSettings = toggleAutoRefreshSettings;
window.closeAutoRefreshSettings = closeAutoRefreshSettings;
window.manualRefresh = manualRefresh;
window.showModeChangeModal = showModeChangeModal;
window.closeModeModal = closeModeModal;
window.applyModeChange = applyModeChange;
window.startUserInteraction = startUserInteraction;
window.endUserInteraction = endUserInteraction;

// 自動更新設定メニューの表示制御
function toggleAutoRefreshSettings() {
  const panel = document.getElementById('auto-refresh-settings-panel');
  const overlay = document.getElementById('auto-refresh-overlay');
  
  if (panel.classList.contains('show')) {
    closeAutoRefreshSettings();
  } else {
    panel.classList.add('show');
    if (overlay) overlay.classList.add('show');
  }
}

// 自動更新設定メニューを閉じる
function closeAutoRefreshSettings() {
  const panel = document.getElementById('auto-refresh-settings-panel');
  const overlay = document.getElementById('auto-refresh-overlay');
  
  if (panel) panel.classList.remove('show');
  if (overlay) overlay.classList.remove('show');
}

// 手動更新
async function manualRefresh() {
  if (isRefreshing) return;
  
  isRefreshing = true;
  showLoader(true);
  
  try {
    const currentMode = localStorage.getItem('currentMode') || 'normal';
    const isAdminMode = currentMode === 'admin' || IS_ADMIN;
    
    const seatData = await GasAPI.getSeatData(GROUP, DAY, TIMESLOT, isAdminMode);
    
    if (seatData.success) {
      drawSeatMap(seatData.seatMap);
      updateLastUpdateTime();
      alert('座席データを更新しました');
    }
  } catch (error) {
    console.error('手動更新エラー:', error);
    alert('更新に失敗しました: ' + error.message);
  } finally {
    showLoader(false);
    isRefreshing = false;
  }
}

// 画面の可視性変更を監視
let isPageVisible = true;
document.addEventListener('visibilitychange', () => {
  isPageVisible = !document.hidden;
  if (isPageVisible && isAutoRefreshEnabled) {
    startAutoRefresh();
  } else {
    stopAutoRefresh();
  }
});

// ESCキーで設定メニューを閉じる
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeAutoRefreshSettings();
  }
});

// 自動更新の停止
function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

// 管理者パスワード入力関数
function promptForAdminPassword() {
  // サイドバーのモード変更モーダルを表示
  showModeChangeModal();
  
  // 管理者モードを選択状態にする
  setTimeout(() => {
    const adminRadio = document.querySelector('input[name="mode"][value="admin"]');
    if (adminRadio) {
      adminRadio.checked = true;
    }
  }, 100);
}

// 複数同時チェックイン機能
async function checkInSelected() {
  const selectedSeatElements = document.querySelectorAll('.seat.selected-for-checkin');
  if (selectedSeatElements.length === 0) {
    alert('チェックインする座席を選択してください。');
    return;
  }

  const selectedSeats = Array.from(selectedSeatElements).map(seatEl => ({
    id: seatEl.dataset.id,
    name: seatEl.dataset.seatName
  }));

  // 選択された座席の一覧を表示
  const seatList = selectedSeats.map(seat => `${seat.id}：${seat.name}`).join('\n');
  const confirmMessage = `以下の座席をチェックインしますか？\n\n${seatList}`;
  
  if (!confirm(confirmMessage)) {
    return;
  }

  showLoader(true);
  
  try {
    const seatIds = selectedSeats.map(seat => seat.id);
    const response = await GasAPI.checkInMultipleSeats(GROUP, DAY, TIMESLOT, seatIds);
    
    if (response.success) {
      alert(`チェックインが完了しました！\n\n${response.message}`);
      // 座席データを再読み込み
      const currentMode = localStorage.getItem('currentMode') || 'normal';
      const isAdminMode = currentMode === 'admin' || IS_ADMIN;
      const seatData = await GasAPI.getSeatData(GROUP, DAY, TIMESLOT, isAdminMode);
      
      if (seatData.success) {
        drawSeatMap(seatData.seatMap);
        updateLastUpdateTime();
        // 選択をクリア
        selectedSeats.length = 0;
        updateSelectedSeatsDisplay();
        // ユーザー操作終了
        endUserInteraction();
      }
    } else {
      alert(`チェックインエラー：\n${response.message}`);
      // エラーが発生した場合も操作状態を終了
      endUserInteraction();
    }
  } catch (error) {
    console.error('チェックインエラー:', error);
    alert(`チェックインエラー：\n${error.message}`);
  } finally {
    showLoader(false);
  }
}

// 予約確認・実行関数
async function confirmReservation() {
  if (selectedSeats.length === 0) {
    alert('予約する座席を選択してください。');
    return;
  }

  const confirmMessage = `以下の座席で予約しますか？\n\n${selectedSeats.join(', ')}`;
  if (!confirm(confirmMessage)) {
    return;
  }

  showLoader(true);
  
  try {
    const response = await GasAPI.reserveSeats(GROUP, DAY, TIMESLOT, selectedSeats);
    
    if (response.success) {
      alert(response.message || '予約が完了しました！');
      // 座席データを再読み込み
      const currentMode = localStorage.getItem('currentMode') || 'normal';
      const isAdminMode = currentMode === 'admin' || IS_ADMIN;
      const seatData = await GasAPI.getSeatData(GROUP, DAY, TIMESLOT, isAdminMode);
      
      if (seatData.success) {
        drawSeatMap(seatData.seatMap);
        updateLastUpdateTime();
        selectedSeats = []; // 選択をクリア
        updateSelectedSeatsDisplay();
        // ユーザー操作終了
        endUserInteraction();
      }
    } else {
      alert(`予約エラー：\n${response.message}`);
    }
  } catch (error) {
    console.error('予約エラー:', error);
    alert(`予約エラー：\n${error.message}`);
  } finally {
    showLoader(false);
  }
}

// ユーザー操作の開始を検知
function startUserInteraction() {
  isUserInteracting = true;
  
  // 既存のタイマーをクリア
  if (interactionTimeout) {
    clearTimeout(interactionTimeout);
  }
  
  // 操作終了を検知するタイマーを設定（5秒後）
  interactionTimeout = setTimeout(() => {
    isUserInteracting = false;
    // 操作終了後、自動更新を再開
    if (isAutoRefreshEnabled && isPageVisible) {
      startAutoRefresh();
    }
  }, 5000);
  
  // 操作中は自動更新を停止
  stopAutoRefresh();
}

// ユーザー操作の終了を検知
function endUserInteraction() {
  isUserInteracting = false;
  if (interactionTimeout) {
    clearTimeout(interactionTimeout);
    interactionTimeout = null;
  }
  
  // 操作終了後、自動更新を再開
  if (isAutoRefreshEnabled && isPageVisible) {
    startAutoRefresh();
  }
}

