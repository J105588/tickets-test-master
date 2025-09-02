// ==== 最適化された時間帯設定管理ファイル ====
// オフライン対応とバックグラウンド読み込みを考慮した最適化版

// 時間帯スケジュール設定（最適化版）
const TIMESLOT_SCHEDULES_OPTIMIZED = {
  // 1組
  "1": {
    "1": { // 1日目
      "A": { time: "10:00-10:55", priority: "high", offline: true },
      "B": { time: "11:35-12:30", priority: "high", offline: true },
      "C": { time: "13:10-14:05", priority: "high", offline: true }
    },
    "2": { // 2日目
      "D": { time: "10:00-10:55", priority: "high", offline: true },
      "E": { time: "11:35-12:30", priority: "high", offline: true },
      "F": { time: "13:10-14:05", priority: "high", offline: true }
    }
  },
  // 2組
  "2": {
    "1": { 
      "A": { time: "09:30-10:25", priority: "high", offline: true },
      "B": { time: "11:05-12:00", priority: "high", offline: true },
      "C": { time: "12:40-13:35", priority: "high", offline: true }
    },
    "2": { 
      "D": { time: "09:30-10:25", priority: "high", offline: true },
      "E": { time: "11:05-12:00", priority: "high", offline: true },
      "F": { time: "12:40-13:35", priority: "high", offline: true }
    }
  },
  // 3組
  "3": {
    "1": { 
      "A": { time: "10:15-11:10", priority: "high", offline: true },
      "B": { time: "11:50-12:45", priority: "high", offline: true },
      "C": { time: "13:25-14:20", priority: "high", offline: true }
    },
    "2": { 
      "D": { time: "10:15-11:10", priority: "high", offline: true },
      "E": { time: "11:50-12:45", priority: "high", offline: true },
      "F": { time: "13:25-14:20", priority: "high", offline: true }
    }
  },
  // 4組
  "4": {
    "1": { 
      "A": { time: "09:45-10:40", priority: "high", offline: true },
      "B": { time: "11:20-12:15", priority: "high", offline: true },
      "C": { time: "12:55-13:50", priority: "high", offline: true }
    },
    "2": { 
      "D": { time: "09:45-10:40", priority: "high", offline: true },
      "E": { time: "11:20-12:15", priority: "high", offline: true },
      "F": { time: "12:55-13:50", priority: "high", offline: true }
    }
  },
  // 5組
  "5": {
    "1": { 
      "A": { time: "10:30-11:25", priority: "high", offline: true },
      "B": { time: "12:05-13:00", priority: "high", offline: true },
      "C": { time: "13:40-14:35", priority: "high", offline: true }
    },
    "2": { 
      "D": { time: "10:30-11:25", priority: "high", offline: true },
      "E": { time: "12:05-13:00", priority: "high", offline: true },
      "F": { time: "13:40-14:35", priority: "high", offline: true }
    }
  },
  // 6組
  "6": {
    "1": { 
      "A": { time: "09:15-10:10", priority: "high", offline: true },
      "B": { time: "10:50-11:45", priority: "high", offline: true },
      "C": { time: "12:25-13:20", priority: "high", offline: true }
    },
    "2": { 
      "D": { time: "09:15-10:10", priority: "high", offline: true },
      "E": { time: "10:50-11:45", priority: "high", offline: true },
      "F": { time: "12:25-13:20", priority: "high", offline: true }
    }
  },
  // 7組
  "7": {
    "1": { 
      "A": { time: "10:45-11:40", priority: "high", offline: true },
      "B": { time: "12:20-13:15", priority: "high", offline: true },
      "C": { time: "13:55-14:50", priority: "high", offline: true }
    },
    "2": { 
      "D": { time: "10:45-11:40", priority: "high", offline: true },
      "E": { time: "12:20-13:15", priority: "high", offline: true },
      "F": { time: "13:55-14:50", priority: "high", offline: true }
    }
  },
  // 8組
  "8": {
    "1": { 
      "A": { time: "09:00-09:55", priority: "high", offline: true },
      "B": { time: "10:35-11:30", priority: "high", offline: true },
      "C": { time: "12:10-13:05", priority: "high", offline: true }
    },
    "2": { 
      "D": { time: "09:00-09:55", priority: "high", offline: true },
      "E": { time: "10:35-11:30", priority: "high", offline: true },
      "F": { time: "12:10-13:05", priority: "high", offline: true }
    }
  },
  // 見本演劇
  "見本演劇": {
    "1": { 
      "A": { time: "14:00-14:20", priority: "critical", offline: true },
      "B": { time: "15:30-15:50", priority: "critical", offline: true }
    }
  }
};

// キャッシュ用の時間帯データ
let timeslotCache = new Map();

/**
 * 時間帯の実際の時間を取得（最適化版）
 * @param {string} group - 組名
 * @param {string} day - 日
 * @param {string} timeslot - 時間帯
 * @returns {string} 時間
 */
function getTimeslotTimeOptimized(group, day, timeslot) {
  const cacheKey = `${group}_${day}_${timeslot}`;
  
  // キャッシュから取得
  if (timeslotCache.has(cacheKey)) {
    const cached = timeslotCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 300000) { // 5分のキャッシュ
      return cached.time;
    }
  }
  
  try {
    const schedule = TIMESLOT_SCHEDULES_OPTIMIZED[group.toString()];
    if (!schedule) {
      console.warn(`Group not found: ${group}`);
      return timeslot;
    }
    
    const daySchedule = schedule[day.toString()];
    if (!daySchedule) {
      console.warn(`Day not found: ${group}-${day}`);
      return timeslot;
    }
    
    const timeslotData = daySchedule[timeslot];
    if (!timeslotData) {
      console.warn(`Timeslot not found: ${group}-${day}-${timeslot}`);
      return timeslot;
    }
    
    const time = timeslotData.time;
    
    // キャッシュに保存
    timeslotCache.set(cacheKey, {
      time: time,
      timestamp: Date.now()
    });
    
    return time;
  } catch (e) {
    console.error(`Error getting timeslot time for ${group}-${day}-${timeslot}:`, e);
    return timeslot;
  }
}

/**
 * 時間帯の表示名を取得（最適化版）
 * @param {string} group - 組名
 * @param {string} day - 日
 * @param {string} timeslot - 時間帯
 * @returns {string} 表示名
 */
function getTimeslotDisplayNameOptimized(group, day, timeslot) {
  const time = getTimeslotTimeOptimized(group, day, timeslot);
  return `${timeslot}時間帯 (${time})`;
}

/**
 * 時間帯の優先度を取得
 * @param {string} group - 組名
 * @param {string} day - 日
 * @param {string} timeslot - 時間帯
 * @returns {string} 優先度
 */
function getTimeslotPriority(group, day, timeslot) {
  try {
    const schedule = TIMESLOT_SCHEDULES_OPTIMIZED[group.toString()];
    if (!schedule) return 'normal';
    
    const daySchedule = schedule[day.toString()];
    if (!daySchedule) return 'normal';
    
    const timeslotData = daySchedule[timeslot];
    if (!timeslotData) return 'normal';
    
    return timeslotData.priority || 'normal';
  } catch (e) {
    console.error(`Error getting timeslot priority for ${group}-${day}-${timeslot}:`, e);
    return 'normal';
  }
}

/**
 * 時間帯のオフライン対応フラグを取得
 * @param {string} group - 組名
 * @param {string} day - 日
 * @param {string} timeslot - 時間帯
 * @returns {boolean} オフライン対応フラグ
 */
function isTimeslotOfflineEnabled(group, day, timeslot) {
  try {
    const schedule = TIMESLOT_SCHEDULES_OPTIMIZED[group.toString()];
    if (!schedule) return false;
    
    const daySchedule = schedule[day.toString()];
    if (!daySchedule) return false;
    
    const timeslotData = daySchedule[timeslot];
    if (!timeslotData) return false;
    
    return timeslotData.offline === true;
  } catch (e) {
    console.error(`Error checking offline flag for ${group}-${day}-${timeslot}:`, e);
    return false;
  }
}

/**
 * 指定組の全時間帯を取得（最適化版）
 * @param {string} group - 組名
 * @returns {Array} 時間帯情報の配列
 */
function getAllTimeslotsForGroupOptimized(group) {
  const cacheKey = `group_${group}`;
  
  // キャッシュから取得
  if (timeslotCache.has(cacheKey)) {
    const cached = timeslotCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 300000) { // 5分のキャッシュ
      return cached.data;
    }
  }
  
  const groupSchedule = TIMESLOT_SCHEDULES_OPTIMIZED[group.toString()];
  if (!groupSchedule) {
    console.warn(`Group not found: ${group}`);
    return [];
  }

  const results = [];
  for (const day in groupSchedule) {
    const daySchedule = groupSchedule[day];
    for (const timeslot in daySchedule) {
      const timeslotData = daySchedule[timeslot];
      results.push({
        day: day,
        timeslot: timeslot,
        time: timeslotData.time,
        priority: timeslotData.priority,
        offline: timeslotData.offline,
        displayName: `${timeslot}時間帯 (${timeslotData.time})`
      });
    }
  }
  
  // キャッシュに保存
  timeslotCache.set(cacheKey, {
    data: results,
    timestamp: Date.now()
  });
  
  return results;
}

/**
 * 優先度別の時間帯を取得
 * @param {string} group - 組名
 * @param {string} priority - 優先度
 * @returns {Array} 時間帯情報の配列
 */
function getTimeslotsByPriority(group, priority) {
  const allTimeslots = getAllTimeslotsForGroupOptimized(group);
  return allTimeslots.filter(ts => ts.priority === priority);
}

/**
 * オフライン対応の時間帯を取得
 * @param {string} group - 組名
 * @returns {Array} オフライン対応時間帯の配列
 */
function getOfflineEnabledTimeslots(group) {
  const allTimeslots = getAllTimeslotsForGroupOptimized(group);
  return allTimeslots.filter(ts => ts.offline === true);
}

/**
 * 日付名を取得（最適化版）
 * @param {string} day - 日
 * @returns {string} 日付名
 */
function getDayNameOptimized(day) {
  const dayNum = parseInt(day);
  return dayNum === 1 ? '1日目' : `${dayNum}日目`;
}

/**
 * 時間帯の詳細情報を取得
 * @param {string} group - 組名
 * @param {string} day - 日
 * @param {string} timeslot - 時間帯
 * @returns {Object} 時間帯詳細情報
 */
function getTimeslotDetails(group, day, timeslot) {
  try {
    const schedule = TIMESLOT_SCHEDULES_OPTIMIZED[group.toString()];
    if (!schedule) return null;
    
    const daySchedule = schedule[day.toString()];
    if (!daySchedule) return null;
    
    const timeslotData = daySchedule[timeslot];
    if (!timeslotData) return null;
    
    return {
      group: group,
      day: day,
      timeslot: timeslot,
      time: timeslotData.time,
      priority: timeslotData.priority,
      offline: timeslotData.offline,
      displayName: `${timeslot}時間帯 (${timeslotData.time})`,
      dayName: getDayNameOptimized(day)
    };
  } catch (e) {
    console.error(`Error getting timeslot details for ${group}-${day}-${timeslot}:`, e);
    return null;
  }
}

/**
 * 全時間帯の統計情報を取得
 * @returns {Object} 統計情報
 */
function getTimeslotStatistics() {
  const stats = {
    totalGroups: 0,
    totalDays: 0,
    totalTimeslots: 0,
    priorityCounts: {},
    offlineCount: 0
  };
  
  for (const group in TIMESLOT_SCHEDULES_OPTIMIZED) {
    stats.totalGroups++;
    const groupSchedule = TIMESLOT_SCHEDULES_OPTIMIZED[group];
    
    for (const day in groupSchedule) {
      stats.totalDays++;
      const daySchedule = groupSchedule[day];
      
      for (const timeslot in daySchedule) {
        stats.totalTimeslots++;
        const timeslotData = daySchedule[timeslot];
        
        // 優先度カウント
        const priority = timeslotData.priority || 'normal';
        stats.priorityCounts[priority] = (stats.priorityCounts[priority] || 0) + 1;
        
        // オフライン対応カウント
        if (timeslotData.offline === true) {
          stats.offlineCount++;
        }
      }
    }
  }
  
  return stats;
}

/**
 * キャッシュをクリア
 */
function clearTimeslotCache() {
  timeslotCache.clear();
  console.log('Timeslot cache cleared');
}

/**
 * キャッシュ統計を取得
 * @returns {Object} キャッシュ統計
 */
function getCacheStatistics() {
  return {
    cacheSize: timeslotCache.size,
    cacheKeys: Array.from(timeslotCache.keys())
  };
}

// 後方互換性のための関数（既存コードとの互換性を保つ）
function getTimeslotTime(group, day, timeslot) {
  return getTimeslotTimeOptimized(group, day, timeslot);
}

function getTimeslotDisplayName(group, day, timeslot) {
  return getTimeslotDisplayNameOptimized(group, day, timeslot);
}

function _getAllTimeslotsForGroup(group) {
  return getAllTimeslotsForGroupOptimized(group);
}

function getDayName(day) {
  return getDayNameOptimized(day);
}
