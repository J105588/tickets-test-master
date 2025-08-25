// config.js
const GAS_API_URL = "https://script.google.com/macros/s/AKfycby8L1vx6RGR2ipWFp51msmxKjQ1HjnSgP55XSGN_iufFiAYcubf-vmidXeiFy0Yv15G/exec";
const DEBUG_MODE = true;

function debugLog(message, obj = null) {
  if (DEBUG_MODE) {
    console.log(message, obj || '');
  }
}

// 個別にエクスポート
export { GAS_API_URL, DEBUG_MODE, debugLog };
