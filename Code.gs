// ===============================================================
// === API処理 (POSTリクエスト) ===
// ===============================================================

function doPost(e) {
  let response;
  let callback = e.parameter.callback; // コールバック関数名を取得

  // プリフライトリクエストの場合の処理
  if (e.method === "OPTIONS") {
    const headers = {
      "Access-Control-Allow-Origin": "*", // すべてのオリジンを許可
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "3600"
    };
    return ContentService.createTextOutput("")
      .setMimeType(ContentService.MimeType.TEXT)
      .setHeaders(headers);
  }

  try {
    const body = e.postData.contents;

    // パラメータを解析
    const params = {};
    body.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      params[key] = JSON.parse(decodeURIComponent(value.replace(/\+/g, ' ')));
    });

    const funcName = params.func;
    const funcParams = params.params || [];

    if (!funcName) {
      throw new Error("呼び出す関数が指定されていません。(funcが必要です)");
    }

    const functionMap = {
      'getSeatData': getSeatData,
      'reserveSeats': reserveSeats,
      'checkInSeat': checkInSeat,
      'checkInMultipleSeats': checkInMultipleSeats,
      'assignWalkInSeat': assignWalkInSeat,
      'assignWalkInSeats': assignWalkInSeats,
      'verifyModePassword': verifyModePassword,
      'getAllTimeslotsForGroup': getAllTimeslotsForGroup,
      'testApi': testApi
    };

    if (functionMap[funcName]) {
      response = functionMap[funcName].apply(null, funcParams);
    } else {
      throw new Error("無効な関数名です: " + funcName);
    }

  } catch (err) {
    response = { error: err.message };
  }

  // JSONP形式でレスポンスを返す
  let output = callback + '(' + JSON.stringify(response) + ')';
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// ===============================================================
// === ページ表示処理 (GETリクエスト) ===
// ===============================================================

/**
 * WebアプリケーションにGETリクエストが来たときに実行されるメイン関数。
 * POSTリクエストと同様に関数呼び出しを処理する。
 */
function doGet(e) {
  let response;
  let callback = e.parameter.callback; // コールバック関数名を取得

  try {
    const funcName = e.parameter.func;
    const paramsStr = e.parameter.params;
    
    if (!funcName) {
      // APIの状態情報を返す（関数呼び出しがない場合）
      response = {
        status: 'OK',
        message: 'Seat Management API is running',
        version: '1.0'
      };
    } else {
      // パラメータを解析
      const funcParams = paramsStr ? JSON.parse(decodeURIComponent(paramsStr)) : [];
      
      console.log('doGet: 関数呼び出し', { funcName, funcParams });
      
      const functionMap = {
        'getSeatData': getSeatData,
        'reserveSeats': reserveSeats,
        'checkInSeat': checkInSeat,
        'checkInMultipleSeats': checkInMultipleSeats,
        'assignWalkInSeat': assignWalkInSeat,
        'assignWalkInSeats': assignWalkInSeats,
        'verifyModePassword': verifyModePassword,
        'getAllTimeslotsForGroup': getAllTimeslotsForGroup,
        'testApi': testApi
      };

      if (functionMap[funcName]) {
        response = functionMap[funcName].apply(null, funcParams);
      } else {
        throw new Error("無効な関数名です: " + funcName);
      }
    }
  } catch (err) {
    console.error('doGet処理エラー:', err);
    response = { success: false, error: err.message };
  }

  // JSONP形式でレスポンスを返す
  let output = callback + '(' + JSON.stringify(response) + ')';
  return ContentService.createTextOutput(output)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// ===============================================================
// === APIとして呼び出される各種関数 ===
// ===============================================================

/**
 * 指定された公演の座席データを全て取得する。
 */
function getSeatData(group, day, timeslot, isAdmin = false) {
  try {
    const sheet = getSheet(group, day, timeslot, 'SEAT');
    if (!sheet) throw new Error("対象の座席シートが見つかりません。");
    
    // シートの最終行を取得
    const lastRow = sheet.getLastRow();
    
    // ヘッダー行しかない場合（lastRow <= 1）は空の座席マップを返す
    if (lastRow <= 1) {
      console.log(`警告: シート(${group}, ${day}, ${timeslot})にデータがありません。`);
      return { success: true, seatMap: {} };
    }
    
    const dataRange = sheet.getRange("A2:E" + lastRow);
    const data = dataRange.getValues();
    const seatMap = {};

    data.forEach(row => {
      const rowLabel = row[0];
      const colLabel = row[1];
      if (!rowLabel || !colLabel) return;

      const seatId = String(rowLabel) + String(colLabel);
      if (!isValidSeatId(seatId)) return;

      const statusC = row[2];
      const nameD = row[3];
      const checkinE = row[4];

      const seat = { id: seatId, status: 'available', name: null };

      if (statusC === '予約済') {
        seat.status = (checkinE === '済') ? 'checked-in' : 'to-be-checked-in';
      } else if (statusC === '確保') {
        seat.status = 'reserved';
      }

      if (isAdmin) {
        seat.name = nameD || null;
      }
      seatMap[seatId] = seat;
    });

    Logger.log(`座席データを正常に取得: [${group}-${day}-${timeslot}], 座席数: ${Object.keys(seatMap).length}`);
    return { success: true, seatMap: seatMap };

  } catch (e) {
    Logger.log(`getSeatData Error for ${group}-${day}-${timeslot}: ${e.message}\n${e.stack}`);
    return { success: false, error: `座席データの取得に失敗しました: ${e.message}` };
  }
}

/**
 * ユーザーが選択した複数の座席を予約する。
 */
function reserveSeats(group, day, timeslot, selectedSeats) {
  if (!Array.isArray(selectedSeats) || selectedSeats.length === 0) {
    return { success: false, message: '予約する座席が選択されていません。' };
  }

  const invalidSeats = selectedSeats.filter(seatId => !isValidSeatId(seatId));
  if (invalidSeats.length > 0) {
    return { success: false, message: `無効な座席IDが含まれています: ${invalidSeats.join(', ')}` };
  }

  const lock = LockService.getScriptLock();
  if (lock.tryLock(15000)) {
    try {
      const sheet = getSheet(group, day, timeslot, 'SEAT');
      if (!sheet) throw new Error("対象の公演シートが見つかりませんでした。");

      const dataRange = sheet.getRange("A2:E" + sheet.getLastRow());
      const data = dataRange.getValues();
      let reservationSuccess = false;

      for (let i = 0; i < data.length; i++) {
        const seatId = String(data[i][0]) + String(data[i][1]);
        if (!isValidSeatId(seatId)) continue;

        if (selectedSeats.includes(seatId)) {
          if (data[i][2] !== '空') {
            throw new Error(`座席 ${seatId} は既に他のお客様によって予約されています。ページを更新して再度お試しください。`);
          }
          sheet.getRange(i + 2, 3, 1, 3).setValues([['予約済', '', '']]);
          reservationSuccess = true;
        }
      }

      if (!reservationSuccess) {
        throw new Error("予約対象の座席が見つかりませんでした。");
      }

      SpreadsheetApp.flush();
      return { success: true, message: `予約が完了しました。\n座席: ${selectedSeats.join(', ')}` };

    } catch (e) {
      Logger.log(`reserveSeats Error for ${group}-${day}-${timeslot}: ${e.message}\n${e.stack}`);
      return { success: false, message: `予約エラー: ${e.message}` };
    } finally {
      lock.releaseLock();
    }
  } else {
    return { success: false, message: "処理が大変混み合っています。しばらく時間をおいてから再度お試しください。" };
  }
}

/**
 * 座席をチェックインする。
 */
function checkInSeat(group, day, timeslot, seatId) {
  if (!seatId || !isValidSeatId(seatId)) {
    return { success: false, message: `無効な座席IDです: ${seatId}` };
  }

  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) {
    try {
      const sheet = getSheet(group, day, timeslot, 'SEAT');
      if (!sheet) throw new Error("対象の座席シートが見つかりません。");
      
      const data = sheet.getRange("A2:E" + sheet.getLastRow()).getValues();
      let found = false;

      for (let i = 0; i < data.length; i++) {
        const currentSeatId = String(data[i][0]) + String(data[i][1]);
        if (currentSeatId === seatId) {
          found = true;
          const status = data[i][2];
          const name = data[i][3] || '';

          if (status === "予約済") {
            sheet.getRange(i + 2, 5).setValue("済");
            SpreadsheetApp.flush();
            return { success: true, message: `${seatId} をチェックインしました。`, checkedInName: name };
          } else {
            throw new Error(`${seatId} はチェックインできない状態です。（現在の状態: ${status}）`);
          }
        }
      }

      if (!found) {
        throw new Error(`${seatId} がシートに見つかりませんでした。`);
      }
    } catch (e) {
      Logger.log(`checkInSeat Error for ${group}-${day}-${timeslot}: ${e.message}\n${e.stack}`);
      return { success: false, message: e.message };
    } finally {
      lock.releaseLock();
    }
  } else {
    return { success: false, message: "処理が混み合っています。再度お試しください。" };
  }
}

/**
 * 複数の座席をチェックインする。
 */
function checkInMultipleSeats(group, day, timeslot, seatIds) {
  if (!Array.isArray(seatIds) || seatIds.length === 0) {
    return { success: false, message: 'チェックインする座席が選択されていません。' };
  }

  const invalidSeats = seatIds.filter(seatId => !isValidSeatId(seatId));
  if (invalidSeats.length > 0) {
    return { success: false, message: `無効な座席IDが含まれています: ${invalidSeats.join(', ')}` };
  }

  const lock = LockService.getScriptLock();
  if (lock.tryLock(15000)) {
    try {
      const sheet = getSheet(group, day, timeslot, 'SEAT');
      if (!sheet) throw new Error("対象の座席シートが見つかりません。");

      const data = sheet.getRange("A2:E" + sheet.getLastRow()).getValues();
      let successCount = 0;
      let errorMessages = [];

      for (const seatId of seatIds) {
        let found = false;
        for (let i = 0; i < data.length; i++) {
          const currentSeatId = String(data[i][0]) + String(data[i][1]);
          if (currentSeatId === seatId) {
            found = true;
            const status = data[i][2];
            const name = data[i][3] || '';

            // 予約済みまたは確保状態の座席をチェックイン可能にする
            if (status === "予約済" || status === "確保") {
              // 確保状態の場合は、まず予約済みに変更してからチェックイン
              if (status === "確保") {
                sheet.getRange(i + 2, 3).setValue("予約済");
              }
              sheet.getRange(i + 2, 5).setValue("済");
              successCount++;
            } else {
              errorMessages.push(`${seatId} はチェックインできない状態です。（現在の状態: ${status}）`);
            }
            break;
          }
        }
        if (!found) {
          errorMessages.push(`${seatId} がシートに見つかりませんでした。`);
        }
      }

      SpreadsheetApp.flush();
      if (successCount > 0) {
        return { success: true, message: `${successCount}件の座席をチェックインしました。`, checkedInCount: successCount };
      } else {
        return { success: false, message: errorMessages.length > 0 ? errorMessages.join('\n') : 'チェックインできる座席が見つかりませんでした。' };
      }

    } catch (e) {
      Logger.log(`checkInMultipleSeats Error for ${group}-${day}-${timeslot}: ${e.message}\n${e.stack}`);
      return { success: false, message: `チェックインエラー: ${e.message}` };
    } finally {
      lock.releaseLock();
    }
  } else {
    return { success: false, message: "処理が混み合っています。再度お試しください。" };
  }
}

/**
 * 当日券発行：空いている席を1つ自動で探し、確保する。
 */
function assignWalkInSeat(group, day, timeslot) {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(15000)) {
    try {
      const sheet = getSheet(group, day, timeslot, 'SEAT');
      if (!sheet) throw new Error("対象の公演シートが見つかりませんでした。");

      const data = sheet.getRange("A2:C" + sheet.getLastRow()).getValues();
      let assignedSeat = null;

      // 有効な空席を探す
      for (let i = 0; i < data.length; i++) {
        const seatId = String(data[i][0]) + String(data[i][1]);
        if (!isValidSeatId(seatId)) {
           continue;
        }
        if (data[i][2] === '空') {
          const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm:ss");
          sheet.getRange(i + 2, 3, 1, 3).setValues([['予約済', `当日券_${timestamp}`, '']]);
          assignedSeat = seatId;
          break;
        }
      }

      if (assignedSeat) {
        SpreadsheetApp.flush();
        return { success: true, message: `当日券を発行しました！\n\nあなたの座席は 【${assignedSeat}】 です。`, seatId: assignedSeat };
      } else {
        return { success: false, message: '申し訳ありません、この回の座席は現在満席です。' };
      }
    } catch (e) {
      Logger.log(`assignWalkInSeat Error: ${e.message}\n${e.stack}`);
      return { success: false, message: `エラーが発生しました: ${e.message}` };
    } finally {
      lock.releaseLock();
    }
  } else {
    return { success: false, message: "処理が混み合っています。しばらくしてから再度お試しください。" };
  }
}

/**
 * 当日券発行：複数席を自動で探し、確保する。
 */
function assignWalkInSeats(group, day, timeslot, count) {
  const num = Math.max(1, parseInt(count, 10) || 1);
  const lock = LockService.getScriptLock();
  if (lock.tryLock(15000)) {
    try {
      const sheet = getSheet(group, day, timeslot, 'SEAT');
      if (!sheet) throw new Error("対象の公演シートが見つかりませんでした。");

      const data = sheet.getRange("A2:C" + sheet.getLastRow()).getValues();
      const assigned = [];

      for (let i = 0; i < data.length && assigned.length < num; i++) {
        const seatId = String(data[i][0]) + String(data[i][1]);
        if (!isValidSeatId(seatId)) continue;
        if (data[i][2] === '空') {
          const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy/MM/dd HH:mm:ss");
          sheet.getRange(i + 2, 3, 1, 3).setValues([["予約済", `当日券_${timestamp}`, '']]);
          assigned.push(seatId);
        }
      }

      if (assigned.length > 0) {
        SpreadsheetApp.flush();
        const title = (assigned.length === 1) ? `当日券を発行しました！\n\nあなたの座席は 【${assigned[0]}】 です。` : `当日券を${assigned.length}席発行しました！`;
        return { success: true, message: title, seatIds: assigned };
      } else {
        return { success: false, message: '申し訳ありません、この回の座席は現在満席です。' };
      }
    } catch (e) {
      Logger.log(`assignWalkInSeats Error: ${e.message}\n${e.stack}`);
      return { success: false, message: `エラーが発生しました: ${e.message}` };
    } finally {
      lock.releaseLock();
    }
  } else {
    return { success: false, message: "処理が混み合っています。しばらくしてから再度お試しください。" };
  }
}

/**
 * モード別のパスワードを検証する。
 */
function verifyModePassword(mode, password) {
  try {
    const props = PropertiesService.getScriptProperties();
    const adminPassword = props.getProperty('ADMIN_PASSWORD');
    const walkinPassword = props.getProperty('WALKIN_PASSWORD');

    if (mode === 'admin') return { success: adminPassword && password === adminPassword };
    if (mode === 'walkin') return { success: walkinPassword && password === walkinPassword };
    return { success: false };

  } catch (e) {
    Logger.log("verifyModePassword Error: " + e.message);
    return { success: false };
  }
}

// ===============================================================
// === 内部ヘルパー関数 ===
// ===============================================================

/**
 * 座席IDの形式が有効かどうかを検証する。
 */
function isValidSeatId(seatId) {
  if (!seatId || typeof seatId !== 'string') return false;
  const match = seatId.match(/^([A-E])(\d+)$/);
  if (!match) return false;

  const row = match[1];
  const col = parseInt(match[2], 10);

  const maxSeats = { 'A': 12, 'B': 12, 'C': 12, 'D': 12, 'E': 6 };
  return col >= 1 && col <= (maxSeats[row] || 0);
}

/**
 * スプレッドシートIDとシート名からシートオブジェクトを取得する。
 */
function getSheet(group, day, timeslot, type) {
  try {
    const ssId = getSeatSheetId(group, day, timeslot);
    if (!ssId) {
      throw new Error(`Spreadsheet ID not found for ${group}-${day}-${timeslot}`);
    }

    const sheetName = (type === 'SEAT') ? TARGET_SEAT_SHEET_NAME : LOG_SHEET_NAME;
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found in spreadsheet ID: ${ssId}`);
    }
    return sheet;

  } catch (e) {
    Logger.log(`getSheet Error for ${group}-${day}-${timeslot}: ${e.message}`);
    throw e;
  }
}

/**
 * TimeSlotConfig.gsの関数を呼び出すための窓口
 */
function getAllTimeslotsForGroup(group) {
  return _getAllTimeslotsForGroup(group);
}

/**
 * シンプルなテスト用API関数
 */
function testApi() {
  return { success: true, data: "Test API is working!" };
}

/**
 * クライアント側からエラー情報を送信するためのAPI
 */
function reportError(errorMessage) {
  Logger.log(`Client-side error: ${errorMessage}`);
  return { success: true };
}