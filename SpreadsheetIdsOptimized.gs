// ==== 最適化されたスプレッドシートID管理ファイル ====
// オフライン対応とバックグラウンド読み込みを考慮した最適化版

// 操作対象のシート名（最適化版）
const TARGET_SEAT_SHEET_NAME_OPTIMIZED = "Seats";
const LOG_SHEET_NAME_OPTIMIZED = "ParentApplications";
const BACKUP_SHEET_NAME_OPTIMIZED = "Backup";

// 座席管理用スプレッドシートID（最適化版）
const SEAT_SHEET_IDS_OPTIMIZED = {
  // 1組
  "1-1-A": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "1-1-B": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "1-1-C": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "1-2-D": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "1-2-E": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "1-2-F": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  
  // 2組
  "2-1-A": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "2-1-B": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "2-1-C": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "2-2-D": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "2-2-E": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "2-2-F": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  
  // 3組
  "3-1-A": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "3-1-B": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "3-1-C": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "3-2-D": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "3-2-E": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "3-2-F": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  
  // 4組
  "4-1-A": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "4-1-B": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "4-1-C": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "4-2-D": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "4-2-E": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "4-2-F": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  
  // 5組
  "5-1-A": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "5-1-B": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "5-1-C": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "5-2-D": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "5-2-E": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "5-2-F": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  
  // 6組
  "6-1-A": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "6-1-B": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "6-1-C": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "6-2-D": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "6-2-E": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "6-2-F": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  
  // 7組
  "7-1-A": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "7-1-B": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "7-1-C": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "7-2-D": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "7-2-E": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "7-2-F": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  
  // 8組
  "8-1-A": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "8-1-B": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "8-1-C": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "8-2-D": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "8-2-E": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  "8-2-F": { id: "YOUR_SHEET_ID_HERE", priority: "high", offline: true, backup: false },
  
  // 見本演劇（テスト用）
  "見本演劇-1-A": { 
    id: "1-lBQMuwjs0YnOpSt3nI8jQmHyNOqUNHiP3i2xXMcbmA", 
    priority: "critical", 
    offline: true, 
    backup: true 
  },
  "見本演劇-1-B": { 
    id: "164pnCFDZKmrHlwU0J857NzxRHBeFgdKLzxCwM7DKZmo", 
    priority: "critical", 
    offline: true, 
    backup: true 
  }
};

// ログ用スプレッドシートID（最適化版）
const LOG_SHEET_IDS_OPTIMIZED = {
  "1-1-A": { id: "YOUR_LOG_ID_HERE", priority: "normal", offline: true },
  "1-1-B": { id: "YOUR_LOG_ID_HERE", priority: "normal", offline: true },
  "1-2-D": { id: "YOUR_LOG_ID_HERE", priority: "normal", offline: true },
  "1-2-E": { id: "YOUR_LOG_ID_HERE", priority: "normal", offline: true },
  "見本演劇-1-A": { id: "YOUR_LOG_ID_HERE", priority: "high", offline: true },
  "見本演劇-1-B": { id: "YOUR_LOG_ID_HERE", priority: "high", offline: true }
};

// バックアップ用スプレッドシートID（最適化版）
const BACKUP_SHEET_IDS_OPTIMIZED = {
  "見本演劇-1-A": { id: "YOUR_BACKUP_ID_HERE", priority: "low", offline: true },
  "見本演劇-1-B": { id: "YOUR_BACKUP_ID_HERE", priority: "low", offline: true }
};

// キャッシュ用のスプレッドシートIDデータ
let spreadsheetCache = new Map();

/**
 * 座席シートIDを取得（最適化版）
 * @param {string} group - 組名
 * @param {string} day - 日
 * @param {string} timeslot - 時間帯
 * @returns {string|null} スプレッドシートID
 */
function getSeatSheetIdOptimized(group, day, timeslot) {
  const key = `${group}-${day}-${timeslot}`;
  
  // キャッシュから取得
  if (spreadsheetCache.has(key)) {
    const cached = spreadsheetCache.get(key);
    if (Date.now() - cached.timestamp < 300000) { // 5分のキャッシュ
      return cached.id;
    }
  }
  
  let sheetData = SEAT_SHEET_IDS_OPTIMIZED[key];
  
  // デバッグ情報を出力
  console.log(`getSeatSheetIdOptimized: 検索キー=${key}, 結果=${sheetData ? sheetData.id : 'なし'}`);
  
  // IDが見つからない場合、テスト用の「見本演劇」のIDを使用
  if (!sheetData || sheetData.id === "YOUR_SHEET_ID_HERE") {
    if (group === '見本演劇') {
      // 見本演劇のIDを使用
      const testKey = `見本演劇-${day}-${timeslot}`;
      sheetData = SEAT_SHEET_IDS_OPTIMIZED[testKey];
      console.log(`テスト用キーで再検索: ${testKey}, 結果=${sheetData ? sheetData.id : 'なし'}`);
      
      if (sheetData && sheetData.id !== "YOUR_SHEET_ID_HERE") {
        // キャッシュに保存
        spreadsheetCache.set(key, {
          id: sheetData.id,
          timestamp: Date.now()
        });
        return sheetData.id;
      }
    }
    
    // それでもIDが見つからない場合はエラー
    throw new Error(`座席シートIDが設定されていません: [組: ${group}, 日: ${day}, 時間帯: ${timeslot}]`);
  }
  
  // キャッシュに保存
  spreadsheetCache.set(key, {
    id: sheetData.id,
    timestamp: Date.now()
  });
  
  return sheetData.id;
}

/**
 * ログシートIDを取得（最適化版）
 * @param {string} group - 組名
 * @param {string} day - 日
 * @param {string} timeslot - 時間帯
 * @returns {string|null} ログシートID
 */
function getLogSheetIdOptimized(group, day, timeslot) {
  const key = `${group}-${day}-${timeslot}`;
  
  // キャッシュから取得
  if (spreadsheetCache.has(`log_${key}`)) {
    const cached = spreadsheetCache.get(`log_${key}`);
    if (Date.now() - cached.timestamp < 300000) { // 5分のキャッシュ
      return cached.id;
    }
  }
  
  const logData = LOG_SHEET_IDS_OPTIMIZED[key];
  
  if (!logData || logData.id === "YOUR_LOG_ID_HERE") {
    console.log(`ログシートIDが設定されていません: [組: ${group}, 日: ${day}, 時間帯: ${timeslot}]`);
    return null;
  }
  
  // キャッシュに保存
  spreadsheetCache.set(`log_${key}`, {
    id: logData.id,
    timestamp: Date.now()
  });
  
  return logData.id;
}

/**
 * バックアップシートIDを取得（最適化版）
 * @param {string} group - 組名
 * @param {string} day - 日
 * @param {string} timeslot - 時間帯
 * @returns {string|null} バックアップシートID
 */
function getBackupSheetIdOptimized(group, day, timeslot) {
  const key = `${group}-${day}-${timeslot}`;
  
  // キャッシュから取得
  if (spreadsheetCache.has(`backup_${key}`)) {
    const cached = spreadsheetCache.get(`backup_${key}`);
    if (Date.now() - cached.timestamp < 300000) { // 5分のキャッシュ
      return cached.id;
    }
  }
  
  const backupData = BACKUP_SHEET_IDS_OPTIMIZED[key];
  
  if (!backupData || backupData.id === "YOUR_BACKUP_ID_HERE") {
    console.log(`バックアップシートIDが設定されていません: [組: ${group}, 日: ${day}, 時間帯: ${timeslot}]`);
    return null;
  }
  
  // キャッシュに保存
  spreadsheetCache.set(`backup_${key}`, {
    id: backupData.id,
    timestamp: Date.now()
  });
  
  return backupData.id;
}

/**
 * スプレッドシートの詳細情報を取得
 * @param {string} group - 組名
 * @param {string} day - 日
 * @param {string} timeslot - 時間帯
 * @returns {Object|null} スプレッドシート詳細情報
 */
function getSpreadsheetDetails(group, day, timeslot) {
  const key = `${group}-${day}-${timeslot}`;
  
  const seatData = SEAT_SHEET_IDS_OPTIMIZED[key];
  const logData = LOG_SHEET_IDS_OPTIMIZED[key];
  const backupData = BACKUP_SHEET_IDS_OPTIMIZED[key];
  
  if (!seatData) {
    return null;
  }
  
  return {
    group: group,
    day: day,
    timeslot: timeslot,
    seatSheetId: seatData.id,
    logSheetId: logData ? logData.id : null,
    backupSheetId: backupData ? backupData.id : null,
    priority: seatData.priority,
    offline: seatData.offline,
    backup: seatData.backup,
    targetSheetName: TARGET_SEAT_SHEET_NAME_OPTIMIZED,
    logSheetName: LOG_SHEET_NAME_OPTIMIZED,
    backupSheetName: BACKUP_SHEET_NAME_OPTIMIZED
  };
}

/**
 * 優先度別のスプレッドシートを取得
 * @param {string} priority - 優先度
 * @returns {Array} スプレッドシート情報の配列
 */
function getSpreadsheetsByPriority(priority) {
  const results = [];
  
  for (const key in SEAT_SHEET_IDS_OPTIMIZED) {
    const sheetData = SEAT_SHEET_IDS_OPTIMIZED[key];
    if (sheetData.priority === priority) {
      const [group, day, timeslot] = key.split('-');
      results.push({
        key: key,
        group: group,
        day: day,
        timeslot: timeslot,
        id: sheetData.id,
        priority: sheetData.priority,
        offline: sheetData.offline,
        backup: sheetData.backup
      });
    }
  }
  
  return results;
}

/**
 * オフライン対応のスプレッドシートを取得
 * @returns {Array} オフライン対応スプレッドシートの配列
 */
function getOfflineEnabledSpreadsheets() {
  const results = [];
  
  for (const key in SEAT_SHEET_IDS_OPTIMIZED) {
    const sheetData = SEAT_SHEET_IDS_OPTIMIZED[key];
    if (sheetData.offline === true) {
      const [group, day, timeslot] = key.split('-');
      results.push({
        key: key,
        group: group,
        day: day,
        timeslot: timeslot,
        id: sheetData.id,
        priority: sheetData.priority,
        offline: sheetData.offline,
        backup: sheetData.backup
      });
    }
  }
  
  return results;
}

/**
 * バックアップ対応のスプレッドシートを取得
 * @returns {Array} バックアップ対応スプレッドシートの配列
 */
function getBackupEnabledSpreadsheets() {
  const results = [];
  
  for (const key in SEAT_SHEET_IDS_OPTIMIZED) {
    const sheetData = SEAT_SHEET_IDS_OPTIMIZED[key];
    if (sheetData.backup === true) {
      const [group, day, timeslot] = key.split('-');
      results.push({
        key: key,
        group: group,
        day: day,
        timeslot: timeslot,
        id: sheetData.id,
        priority: sheetData.priority,
        offline: sheetData.offline,
        backup: sheetData.backup
      });
    }
  }
  
  return results;
}

/**
 * 全スプレッドシートの統計情報を取得
 * @returns {Object} 統計情報
 */
function getSpreadsheetStatistics() {
  const stats = {
    totalSpreadsheets: 0,
    priorityCounts: {},
    offlineCount: 0,
    backupCount: 0,
    configuredCount: 0,
    unconfiguredCount: 0
  };
  
  for (const key in SEAT_SHEET_IDS_OPTIMIZED) {
    const sheetData = SEAT_SHEET_IDS_OPTIMIZED[key];
    stats.totalSpreadsheets++;
    
    // 優先度カウント
    const priority = sheetData.priority || 'normal';
    stats.priorityCounts[priority] = (stats.priorityCounts[priority] || 0) + 1;
    
    // オフライン対応カウント
    if (sheetData.offline === true) {
      stats.offlineCount++;
    }
    
    // バックアップ対応カウント
    if (sheetData.backup === true) {
      stats.backupCount++;
    }
    
    // 設定済み/未設定カウント
    if (sheetData.id && sheetData.id !== "YOUR_SHEET_ID_HERE") {
      stats.configuredCount++;
    } else {
      stats.unconfiguredCount++;
    }
  }
  
  return stats;
}

/**
 * スプレッドシートIDの検証
 * @param {string} group - 組名
 * @param {string} day - 日
 * @param {string} timeslot - 時間帯
 * @returns {Object} 検証結果
 */
function validateSpreadsheetId(group, day, timeslot) {
  const key = `${group}-${day}-${timeslot}`;
  const sheetData = SEAT_SHEET_IDS_OPTIMIZED[key];
  
  if (!sheetData) {
    return {
      valid: false,
      error: 'スプレッドシート設定が見つかりません',
      key: key
    };
  }
  
  if (!sheetData.id || sheetData.id === "YOUR_SHEET_ID_HERE") {
    return {
      valid: false,
      error: 'スプレッドシートIDが設定されていません',
      key: key,
      priority: sheetData.priority,
      offline: sheetData.offline
    };
  }
  
  // 基本的なID形式チェック（Google Sheets IDは通常17文字）
  if (sheetData.id.length < 10) {
    return {
      valid: false,
      error: 'スプレッドシートIDの形式が正しくありません',
      key: key,
      id: sheetData.id
    };
  }
  
  return {
    valid: true,
    key: key,
    id: sheetData.id,
    priority: sheetData.priority,
    offline: sheetData.offline,
    backup: sheetData.backup
  };
}

/**
 * キャッシュをクリア
 */
function clearSpreadsheetCache() {
  spreadsheetCache.clear();
  console.log('Spreadsheet cache cleared');
}

/**
 * キャッシュ統計を取得
 * @returns {Object} キャッシュ統計
 */
function getSpreadsheetCacheStatistics() {
  return {
    cacheSize: spreadsheetCache.size,
    cacheKeys: Array.from(spreadsheetCache.keys())
  };
}

// 後方互換性のための関数（既存コードとの互換性を保つ）
function getSeatSheetId(group, day, timeslot) {
  return getSeatSheetIdOptimized(group, day, timeslot);
}

function getLogSheetId(group, day, timeslot) {
  return getLogSheetIdOptimized(group, day, timeslot);
}

// 定数も後方互換性のために提供
const TARGET_SEAT_SHEET_NAME = TARGET_SEAT_SHEET_NAME_OPTIMIZED;
const LOG_SHEET_NAME = LOG_SHEET_NAME_OPTIMIZED;
