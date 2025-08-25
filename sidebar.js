import GasAPI from './api.js'; // GasAPIをインポート

const sidebarHTML = `
  <div id="mySidebar" class="sidebar">
    <a href="javascript:void(0)" class="closebtn" onclick="toggleSidebar()">&times;</a>
    <a href="index.html">組選択</a>
    <div class="mode-section">
      <div class="mode-title">動作モード</div>
      <div class="current-mode">現在: <span id="current-mode-display">通常モード</span></div>
      <button class="change-mode-btn" onclick="showModeChangeModal()">モード変更</button>
    </div>
  </div>
  <div id="mode-change-modal" class="modal" style="display: none;">
    <div class="modal-content">
      <h3>モード変更</h3>
      <div class="mode-options">
        <label class="mode-option">
          <input type="radio" name="mode" value="normal" checked> 
          <span>通常モード</span>
        </label>
        <label class="mode-option">
          <input type="radio" name="mode" value="admin"> 
          <span>管理者モード</span>
        </label>
        <label class="mode-option">
          <input type="radio" name="mode" value="walkin"> 
          <span>当日券モード</span>
        </label>
      </div>
      <div class="password-section">
        <input type="password" id="mode-password" placeholder="パスワード">
      </div>
      <div class="modal-buttons">
        <button class="btn-primary" onclick="applyModeChange()">変更</button>
        <button class="btn-secondary" onclick="closeModeModal()">キャンセル</button>
      </div>
    </div>
  </div>
`;

function loadSidebar() {
    const container = document.getElementById('sidebar-container');
    if (container) {
        container.innerHTML = sidebarHTML;
        updateModeDisplay(); // 必要な関数を呼び出す
    }
}

function showModeChangeModal() {
    document.getElementById("mode-change-modal").style.display = 'block';
}

function closeModeModal() {
    document.getElementById("mode-change-modal").style.display = 'none';
}

// モード変更を適用する関数
async function applyModeChange() {
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    const passwordInput = document.getElementById("mode-password");
    const password = passwordInput.value;
    let selectedMode;

    modeRadios.forEach(radio => {
        if (radio.checked) {
            selectedMode = radio.value;
        }
    });

    try {
        // 通常モードに戻る場合はパスワード検証をスキップ
        if (selectedMode === 'normal') {
            localStorage.setItem('currentMode', selectedMode);
            updateModeDisplay();
            alert('通常モードに切り替えました');
            closeModeModal();
            // ページをリロードして権限を即時反映
            location.reload();
            return;
        }

        // パスワードが入力されていない場合
        if (!password) {
            alert('パスワードを入力してください');
            return;
        }

        const result = await GasAPI.verifyModePassword(selectedMode, password);

        if (result.success) {
            localStorage.setItem('currentMode', selectedMode); // 現在のモードを保存
            updateModeDisplay(); // 表示を更新
            
            let modeText = '通常モード';
            if (selectedMode === 'admin') modeText = '管理者モード';
            if (selectedMode === 'walkin') modeText = '当日券モード';
            
            alert(`${modeText}に切り替えました`);
            closeModeModal(); // モーダルを閉じる
            
            // ページをリロードして権限を即時反映
            location.reload();
        } else {
            alert('パスワードが間違っています。');
        }
    } catch (error) {
        alert(`エラーが発生しました: ${error.message}`);
    }
}

// モード表示を更新する関数
function updateModeDisplay() {
    const modeDisplay = document.getElementById("current-mode-display");
    if (modeDisplay) {
        const currentMode = localStorage.getItem('currentMode') || 'normal';
        let displayText = '通常モード';
        
        if (currentMode === 'admin') {
            displayText = '管理者モード';
        } else if (currentMode === 'walkin') {
            displayText = '当日券モード';
        }
        
        modeDisplay.textContent = displayText;
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById("mySidebar");
    const main = document.getElementById("main-content");

    if (!sidebar || !main) {
        console.warn('Sidebar or main content element not found');
        return;
    }

    if (sidebar.style.width === "250px") {
        sidebar.style.width = "0";
        main.style.marginLeft = "0";
    } else {
        sidebar.style.width = "250px";
        main.style.marginLeft = "250px";
    }
}

// グローバル変数として設定
window.loadSidebar = loadSidebar;
window.toggleSidebar = toggleSidebar;
window.showModeChangeModal = showModeChangeModal; // モーダルを表示する関数もグローバル登録
window.closeModeModal = closeModeModal; // モーダルを閉じる関数もグローバル登録
window.applyModeChange = applyModeChange; // モード変更を適用する関数もグローバル登録

export { loadSidebar, toggleSidebar, showModeChangeModal, closeModeModal, applyModeChange };
