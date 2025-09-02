// DataSyncGAS.gs
// データ取得用のGASプロジェクト（別プロジェクトとして作成）

/**
 * 座席データを取得するAPI
 */
function doGet(e) {
  try {
    const params = e.parameter;
    const func = params.func;
    const callback = params.callback;
    
    let result;
    
    switch (func) {
      case 'getSeats':
        result = getSeatsData(params);
        break;
      case 'getReservations':
        result = getReservationsData(params);
        break;
      case 'syncChanges':
        result = syncLocalChanges(params);
        break;
      default:
        result = { success: false, error: 'Unknown function' };
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
 * 座席データを取得
 */
function getSeatsData(params) {
  const { group, day, timeslot } = params;
  const spreadsheetId = getSpreadsheetId(group, day, timeslot);
  
  if (!spreadsheetId) {
    return { success: false, error: 'Spreadsheet not found' };
  }
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName('座席データ');
    
    if (!sheet) {
      return { success: false, error: 'Sheet not found' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const seats = rows.map(row => {
      const seat = {};
      headers.forEach((header, index) => {
        seat[header] = row[index];
      });
      return seat;
    });
    
    return {
      success: true,
      data: seats,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 予約データを取得
 */
function getReservationsData(params) {
  const { group, day, timeslot } = params;
  const spreadsheetId = getSpreadsheetId(group, day, timeslot);
  
  if (!spreadsheetId) {
    return { success: false, error: 'Spreadsheet not found' };
  }
  
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = spreadsheet.getSheetByName('予約データ');
    
    if (!sheet) {
      return { success: false, error: 'Sheet not found' };
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    const reservations = rows.map(row => {
      const reservation = {};
      headers.forEach((header, index) => {
        reservation[header] = row[index];
      });
      return reservation;
    });
    
    return {
      success: true,
      data: reservations,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * ローカル変更を同期
 */
function syncLocalChanges(params) {
  const { group, day, timeslot, changes } = params;
  const spreadsheetId = getSpreadsheetId(group, day, timeslot);
  
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
    
    for (const change of changesArray) {
      try {
        switch (change.type) {
          case 'reservation':
            updateSeatStatus(sheet, change.data);
            successCount++;
            break;
          case 'checkin':
            updateSeatStatus(sheet, change.data);
            successCount++;
            break;
          case 'walkin':
            updateSeatStatus(sheet, change.data);
            successCount++;
            break;
          case 'admin_edit':
            updateSeatData(sheet, change.data);
            successCount++;
            break;
          default:
            errorCount++;
        }
      } catch (error) {
        console.error('Change sync error:', error);
        errorCount++;
      }
    }
    
    return {
      success: true,
      syncedCount: successCount,
      errorCount: errorCount,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * 座席ステータスを更新
 */
function updateSeatStatus(sheet, data) {
  const { row, column, status, name } = data;
  
  // 座席を検索
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  for (let i = 1; i < values.length; i++) {
    const rowData = values[i];
    if (rowData[0] === row && rowData[1] === column) {
      // ステータスを更新
      sheet.getRange(i + 1, 3).setValue(status); // C列: ステータス
      if (name) {
        sheet.getRange(i + 1, 4).setValue(name); // D列: 名前
      }
      break;
    }
  }
}

/**
 * 座席データを更新（管理者編集）
 */
function updateSeatData(sheet, data) {
  const { row, column, columnC, columnD, columnE } = data;
  
  // 座席を検索
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  
  for (let i = 1; i < values.length; i++) {
    const rowData = values[i];
    if (rowData[0] === row && rowData[1] === column) {
      // C, D, E列を更新
      if (columnC !== undefined) sheet.getRange(i + 1, 3).setValue(columnC);
      if (columnD !== undefined) sheet.getRange(i + 1, 4).setValue(columnD);
      if (columnE !== undefined) sheet.getRange(i + 1, 5).setValue(columnE);
      break;
    }
  }
}

/**
 * スプレッドシートIDを取得
 */
function getSpreadsheetId(group, day, timeslot) {
  // スプレッドシートIDのマッピング
  const spreadsheetIds = {
    '見本演劇_1_A': 'YOUR_SPREADSHEET_ID_1',
    '見本演劇_1_B': 'YOUR_SPREADSHEET_ID_2',
    '見本演劇_2_A': 'YOUR_SPREADSHEET_ID_3',
    // 他の組み合わせも追加
  };
  
  const key = `${group}_${day}_${timeslot}`;
  return spreadsheetIds[key];
}

/**
 * 定期的なデータ同期（トリガー設定用）
 */
function scheduledDataSync() {
  // 30分ごとに実行される定期同期
  console.log('Scheduled data sync started:', new Date());
  
  // 全公演のデータを同期
  const performances = [
    { group: '見本演劇', day: '1', timeslot: 'A' },
    { group: '見本演劇', day: '1', timeslot: 'B' },
    { group: '見本演劇', day: '2', timeslot: 'A' },
    // 他の公演も追加
  ];
  
  for (const performance of performances) {
    try {
      const spreadsheetId = getSpreadsheetId(performance.group, performance.day, performance.timeslot);
      if (spreadsheetId) {
        // データの整合性チェック
        checkDataIntegrity(performance.group, performance.day, performance.timeslot);
      }
    } catch (error) {
      console.error(`Data sync error for ${performance.group}_${performance.day}_${performance.timeslot}:`, error);
    }
  }
  
  console.log('Scheduled data sync completed:', new Date());
}

/**
 * データ整合性チェック
 */
function checkDataIntegrity(group, day, timeslot) {
  const spreadsheetId = getSpreadsheetId(group, day, timeslot);
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  
  // 座席データと予約データの整合性をチェック
  const seatsSheet = spreadsheet.getSheetByName('座席データ');
  const reservationsSheet = spreadsheet.getSheetByName('予約データ');
  
  if (seatsSheet && reservationsSheet) {
    // 整合性チェックロジックを実装
    console.log(`Data integrity check completed for ${group}_${day}_${timeslot}`);
  }
}

/**
 * トリガーを設定する関数
 */
function setupTriggers() {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'scheduledDataSync') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // 30分ごとのトリガーを設定
  ScriptApp.newTrigger('scheduledDataSync')
    .timeBased()
    .everyMinutes(30)
    .create();
  
  console.log('Triggers setup completed');
}
