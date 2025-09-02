// DataSyncGASOptimized.gs
// オフライン対応とバックグラウンド読み込みを考慮した最適化版データ同期GAS

// 最適化された設定ファイルをインポート（実際のGAS環境では別ファイルとして配置）
// 注意: GAS環境では直接ファイルをインポートできないため、以下の関数を同じファイル内に配置

/**
 * 最適化された時間帯設定（TimeSlotConfigOptimized.gsから）
 */
const TIMESLOT_SCHEDULES_OPTIMIZED = {
  "見本演劇": {
    "1": { 
      "A": { time: "14:00-14:20", priority: "critical", offline: true },
      "B": { time: "15:30-15:50", priority: "critical", offline: true }
    }
  }
};

/**
 * 最適化されたスプレッドシートID設定（SpreadsheetIdsOptimized.gsから）
 */
const SEAT_SHEET_IDS_OPTIMIZED = {
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

// キャッシュ用のデータストア
const dataCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5分

/**
 * 最適化された座席データ取得API
 */
function doGet(e) {
  try {
    const params = e.parameter;
    const func = params.func;
    const callback = params.callback;
    
    // キャッシュキーを生成
    const cacheKey = `${func}_${JSON.stringify(params)}`;
    
    // キャッシュから取得を試行
    const cached = getFromCache(cacheKey);
    if (cached) {
      console.log(`Cache hit for ${func}`);
      const response = ContentService.createTextOutput(`${callback}(${JSON.stringify(cached)})`);
      response.setMimeType(ContentService.MimeType.JAVASCRIPT);
      return response;
    }
    
    let result;
    
    switch (func) {
      case 'getSeats':
        result = getSeatsDataOptimized(params);
        break;
      case 'getReservations':
        result = getReservationsDataOptimized(params);
        break;
      case 'syncChanges':
        result = syncLocalChangesOptimized(params);
        break;
      case 'getTimeslotInfo':
        result = getTimeslotInfoOptimized(params);
        break;
      case 'getSpreadsheetInfo':
        result = getSpreadsheetInfoOptimized(params);
        break;
      case 'batchGetData':
        result = batchGetDataOptimized(params);
        break;
      default:
        result = { success: false, error: 'Unknown function' };
    }
    
    // キャッシュに保存（成功時のみ）
    if (result.success) {
      setCache(cacheKey, result);
    }
    
    // JSONP形式でレスポンス
    const response = ContentService.createTextOutput(`${callback}(${JSON.stringify(result)})`);
    response.setMimeType(ContentService.MimeType.JAVASCRIPT);
    return response;
    
  } catch (error) {
    console.error('API Error:', error);
    const errorResponse = { success: false, error: error.toString() };
    const response = ContentService.createTextOutput(`${callback}(${JSON.stringify(errorResponse)})`);
    response.setMimeType(ContentService.MimeType.JAVASCRIPT);
    return response;
  }
}

/**
 * 最適化された座席データ取得
 */
function getSeatsDataOptimized(params) {
  const { group, day, timeslot } = params;
  const spreadsheetId = getSpreadsheetIdOptimized(group, day, timeslot);
  
  if (!spreadsheetId) {
    return { success: false, error: 'Spreadsheet not found' };
  }
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName('座席データ');
    
    if (!sheet) {
      return { success: false, error: 'Sheet not found' };
    }
    
    // データ範囲を効率的に取得
    const dataRange = sheet.getDataRange();
    const data = dataRange.getValues();
    
    if (data.length <= 1) {
      return { success: true, data: [], timestamp: new Date().toISOString() };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    // 効率的なデータ変換
    const seats = rows.map((row, index) => {
      const seat = { _rowIndex: index + 2 }; // 実際の行番号を保持
      headers.forEach((header, colIndex) => {
        seat[header] = row[colIndex];
      });
      return seat;
    });
    
    return {
      success: true,
      data: seats,
      timestamp: new Date().toISOString(),
      count: seats.length,
      source: 'optimized'
    };
    
  } catch (error) {
    console.error('getSeatsDataOptimized error:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 最適化された予約データ取得
 */
function getReservationsDataOptimized(params) {
  const { group, day, timeslot } = params;
  const spreadsheetId = getSpreadsheetIdOptimized(group, day, timeslot);
  
  if (!spreadsheetId) {
    return { success: false, error: 'Spreadsheet not found' };
  }
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName('予約データ');
    
    if (!sheet) {
      return { success: true, data: [], timestamp: new Date().toISOString() };
    }
    
    const dataRange = sheet.getDataRange();
    const data = dataRange.getValues();
    
    if (data.length <= 1) {
      return { success: true, data: [], timestamp: new Date().toISOString() };
    }
    
    const headers = data[0];
    const rows = data.slice(1);
    
    const reservations = rows.map((row, index) => {
      const reservation = { _rowIndex: index + 2 };
      headers.forEach((header, colIndex) => {
        reservation[header] = row[colIndex];
      });
      return reservation;
    });
    
    return {
      success: true,
      data: reservations,
      timestamp: new Date().toISOString(),
      count: reservations.length,
      source: 'optimized'
    };
    
  } catch (error) {
    console.error('getReservationsDataOptimized error:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 最適化されたローカル変更同期
 */
function syncLocalChangesOptimized(params) {
  const { group, day, timeslot, changes } = params;
  const spreadsheetId = getSpreadsheetIdOptimized(group, day, timeslot);
  
  if (!spreadsheetId) {
    return { success: false, error: 'Spreadsheet not found' };
  }
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName('座席データ');
    
    if (!sheet) {
      return { success: false, error: 'Sheet not found' };
    }
    
    const changesArray = JSON.parse(changes);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    // バッチ処理で効率化
    const batchUpdates = [];
    
    for (const change of changesArray) {
      try {
        const updateData = processChangeOptimized(change);
        if (updateData) {
          batchUpdates.push(updateData);
        }
        successCount++;
      } catch (error) {
        console.error('Change sync error:', error);
        errorCount++;
        errors.push({ change: change, error: error.toString() });
      }
    }
    
    // バッチ更新を実行
    if (batchUpdates.length > 0) {
      executeBatchUpdates(sheet, batchUpdates);
    }
    
    // キャッシュをクリア（データが変更されたため）
    clearCacheByPattern(`${group}_${day}_${timeslot}`);
    
    return {
      success: true,
      syncedCount: successCount,
      errorCount: errorCount,
      errors: errors,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('syncLocalChangesOptimized error:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 変更データの処理（最適化版）
 */
function processChangeOptimized(change) {
  switch (change.type) {
    case 'reservation':
    case 'checkin':
    case 'walkin':
      return {
        type: 'status_update',
        data: change.data,
        row: change.data.row,
        column: change.data.column
      };
    case 'admin_edit':
      return {
        type: 'data_update',
        data: change.data,
        row: change.data.row,
        column: change.data.column
      };
    default:
      return null;
  }
}

/**
 * バッチ更新の実行
 */
function executeBatchUpdates(sheet, updates) {
  // 行番号でグループ化
  const updatesByRow = {};
  
  updates.forEach(update => {
    const row = update.row;
    if (!updatesByRow[row]) {
      updatesByRow[row] = [];
    }
    updatesByRow[row].push(update);
  });
  
  // 各行の更新を実行
  for (const row in updatesByRow) {
    const rowUpdates = updatesByRow[row];
    const rowNum = parseInt(row) + 1; // 0ベースから1ベースに変換
    
    try {
      // 座席を検索
      const dataRange = sheet.getDataRange();
      const values = dataRange.getValues();
      
      for (let i = 1; i < values.length; i++) {
        const rowData = values[i];
        if (rowData[0] == row && rowData[1] == rowUpdates[0].column) {
          // 該当行の更新を実行
          rowUpdates.forEach(update => {
            if (update.type === 'status_update') {
              sheet.getRange(i + 1, 3).setValue(update.data.status);
              if (update.data.name) {
                sheet.getRange(i + 1, 4).setValue(update.data.name);
              }
            } else if (update.type === 'data_update') {
              if (update.data.columnC !== undefined) {
                sheet.getRange(i + 1, 3).setValue(update.data.columnC);
              }
              if (update.data.columnD !== undefined) {
                sheet.getRange(i + 1, 4).setValue(update.data.columnD);
              }
              if (update.data.columnE !== undefined) {
                sheet.getRange(i + 1, 5).setValue(update.data.columnE);
              }
            }
          });
          break;
        }
      }
    } catch (error) {
      console.error(`Batch update error for row ${row}:`, error);
    }
  }
}

/**
 * 時間帯情報の取得（最適化版）
 */
function getTimeslotInfoOptimized(params) {
  const { group, day, timeslot } = params;
  
  try {
    const schedule = TIMESLOT_SCHEDULES_OPTIMIZED[group];
    if (!schedule) {
      return { success: false, error: 'Group not found' };
    }
    
    const daySchedule = schedule[day];
    if (!daySchedule) {
      return { success: false, error: 'Day not found' };
    }
    
    const timeslotData = daySchedule[timeslot];
    if (!timeslotData) {
      return { success: false, error: 'Timeslot not found' };
    }
    
    return {
      success: true,
      data: {
        group: group,
        day: day,
        timeslot: timeslot,
        time: timeslotData.time,
        priority: timeslotData.priority,
        offline: timeslotData.offline,
        displayName: `${timeslot}時間帯 (${timeslotData.time})`
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('getTimeslotInfoOptimized error:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * スプレッドシート情報の取得（最適化版）
 */
function getSpreadsheetInfoOptimized(params) {
  const { group, day, timeslot } = params;
  const key = `${group}-${day}-${timeslot}`;
  
  try {
    const sheetData = SEAT_SHEET_IDS_OPTIMIZED[key];
    if (!sheetData) {
      return { success: false, error: 'Spreadsheet not found' };
    }
    
    return {
      success: true,
      data: {
        key: key,
        group: group,
        day: day,
        timeslot: timeslot,
        id: sheetData.id,
        priority: sheetData.priority,
        offline: sheetData.offline,
        backup: sheetData.backup
      },
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('getSpreadsheetInfoOptimized error:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * バッチデータ取得（最適化版）
 */
function batchGetDataOptimized(params) {
  const { requests } = params;
  
  try {
    const requestsArray = JSON.parse(requests);
    const results = [];
    
    for (const request of requestsArray) {
      let result;
      
      switch (request.func) {
        case 'getSeats':
          result = getSeatsDataOptimized(request.params);
          break;
        case 'getReservations':
          result = getReservationsDataOptimized(request.params);
          break;
        case 'getTimeslotInfo':
          result = getTimeslotInfoOptimized(request.params);
          break;
        case 'getSpreadsheetInfo':
          result = getSpreadsheetInfoOptimized(request.params);
          break;
        default:
          result = { success: false, error: 'Unknown function' };
      }
      
      results.push({
        requestId: request.id,
        result: result
      });
    }
    
    return {
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
      count: results.length
    };
    
  } catch (error) {
    console.error('batchGetDataOptimized error:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 最適化されたスプレッドシートID取得
 */
function getSpreadsheetIdOptimized(group, day, timeslot) {
  const key = `${group}-${day}-${timeslot}`;
  const sheetData = SEAT_SHEET_IDS_OPTIMIZED[key];
  
  if (!sheetData || sheetData.id === "YOUR_SHEET_ID_HERE") {
    console.error(`Spreadsheet ID not configured: ${key}`);
    return null;
  }
  
  return sheetData.id;
}

/**
 * キャッシュ管理関数
 */
function getFromCache(key) {
  const cached = dataCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCache(key, data) {
  dataCache.set(key, {
    data: data,
    timestamp: Date.now()
  });
}

function clearCacheByPattern(pattern) {
  const keysToDelete = [];
  for (const key of dataCache.keys()) {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => dataCache.delete(key));
}

/**
 * 最適化された定期的なデータ同期
 */
function scheduledDataSyncOptimized() {
  console.log('Optimized scheduled data sync started:', new Date());
  
  // 全公演のデータを効率的に同期
  const performances = [
    { group: '見本演劇', day: '1', timeslot: 'A' },
    { group: '見本演劇', day: '1', timeslot: 'B' }
  ];
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const performance of performances) {
    try {
      // データの整合性チェック
      const integrityResult = checkDataIntegrityOptimized(
        performance.group, 
        performance.day, 
        performance.timeslot
      );
      
      if (integrityResult.success) {
        successCount++;
      } else {
        errorCount++;
        console.error(`Integrity check failed for ${performance.group}_${performance.day}_${performance.timeslot}:`, integrityResult.error);
      }
    } catch (error) {
      errorCount++;
      console.error(`Data sync error for ${performance.group}_${performance.day}_${performance.timeslot}:`, error);
    }
  }
  
  console.log(`Optimized scheduled data sync completed: ${successCount} success, ${errorCount} errors`);
}

/**
 * 最適化されたデータ整合性チェック
 */
function checkDataIntegrityOptimized(group, day, timeslot) {
  try {
    const spreadsheetId = getSpreadsheetIdOptimized(group, day, timeslot);
    if (!spreadsheetId) {
      return { success: false, error: 'Spreadsheet not found' };
    }
    
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const seatsSheet = spreadsheet.getSheetByName('座席データ');
    const reservationsSheet = spreadsheet.getSheetByName('予約データ');
    
    if (!seatsSheet) {
      return { success: false, error: 'Seats sheet not found' };
    }
    
    // 基本的な整合性チェック
    const seatsData = seatsSheet.getDataRange().getValues();
    const reservationsData = reservationsSheet ? reservationsSheet.getDataRange().getValues() : [];
    
    // 座席データの基本チェック
    if (seatsData.length <= 1) {
      return { success: false, error: 'No seat data found' };
    }
    
    // 予約データとの整合性チェック（簡易版）
    const seatCount = seatsData.length - 1; // ヘッダー行を除く
    const reservationCount = reservationsData.length - 1;
    
    console.log(`Data integrity check completed for ${group}_${day}_${timeslot}: ${seatCount} seats, ${reservationCount} reservations`);
    
    return {
      success: true,
      seatCount: seatCount,
      reservationCount: reservationCount,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('checkDataIntegrityOptimized error:', error);
    return { success: false, error: error.toString() };
  }
}

/**
 * 最適化されたトリガー設定
 */
function setupTriggersOptimized() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'scheduledDataSyncOptimized') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // 30分ごとのトリガーを設定
  ScriptApp.newTrigger('scheduledDataSyncOptimized')
    .timeBased()
    .everyMinutes(30)
    .create();
  
  console.log('Optimized triggers setup completed');
}

/**
 * キャッシュ統計の取得
 */
function getCacheStatistics() {
  return {
    cacheSize: dataCache.size,
    cacheKeys: Array.from(dataCache.keys()),
    timestamp: new Date().toISOString()
  };
}

/**
 * キャッシュのクリア
 */
function clearAllCache() {
  dataCache.clear();
  console.log('All cache cleared');
}

// 後方互換性のための関数
function getSeatsData(params) {
  return getSeatsDataOptimized(params);
}

function getReservationsData(params) {
  return getReservationsDataOptimized(params);
}

function syncLocalChanges(params) {
  return syncLocalChangesOptimized(params);
}

function scheduledDataSync() {
  return scheduledDataSyncOptimized();
}

function checkDataIntegrity(group, day, timeslot) {
  return checkDataIntegrityOptimized(group, day, timeslot);
}

function setupTriggers() {
  return setupTriggersOptimized();
}
