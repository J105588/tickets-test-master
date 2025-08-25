// config.js
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbzT7BklezxfABLTcIhwinzlHaeDCuTEAe4bp9XVAtFMqn9C6E8DH2F8RLGTCfwyGZLX/exec";
const DEBUG_MODE = true;

function debugLog(message, obj = null) {
  if (DEBUG_MODE) {
    console.log(message, obj || '');
  }
}

// 個別にエクスポート
export { GAS_API_URL, DEBUG_MODE, debugLog };
