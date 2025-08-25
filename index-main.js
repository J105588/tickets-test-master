import { loadSidebar, toggleSidebar, showModeChangeModal } from './sidebar.js';    
loadSidebar();

// グローバルスコープに関数を登録
window.toggleSidebar = toggleSidebar;
window.showModeChangeModal = showModeChangeModal;
