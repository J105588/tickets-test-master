// config.js
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbwKj4OY7GFGOt6Y0qE1ZFM7GBaHVMevaIQLvrNDRaDRAcC-_CipprQqkztNxb6gLjnP/exec";
// フェイルオーバー用に複数URLを保持可能（先頭から順に試行）
const GAS_API_URLS = [
  GAS_API_URL,
  // 新しいデプロイURLがある場合は下に追加してください
  // "https://script.google.com/macros/s/AKfycbNEW.../exec"
];
const DEBUG_MODE = false;

function debugLog(message, obj = null) {
  if (DEBUG_MODE) {
    console.log(message, obj || '');
  }
}

// 個別にエクスポート
export { GAS_API_URL, GAS_API_URLS, DEBUG_MODE, debugLog };
