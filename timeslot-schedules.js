/**
 * 時間帯設定データ（フロントエンド用）
 * TimeSlotConfig.gsの内容をJavaScript形式に変換
 */

const TIMESLOT_SCHEDULES = {
  // ... (中身は変更なし) ...
  "1": {
    "1": { "A": "10:00-10:55", "B": "11:35-12:30", "C": "13:10-14:05" },
    "2": { "D": "10:00-10:55", "E": "11:35-12:30", "F": "13:10-14:05" }
  },
  "2": {
    "1": { "A": "09:30-10:25", "B": "11:05-12:00", "C": "12:40-13:35" },
    "2": { "D": "09:30-10:25", "E": "11:05-12:00", "F": "12:40-13:35" }
  },
  "3": {
    "1": { "A": "10:15-11:10", "B": "11:50-12:45", "C": "13:25-14:20" },
    "2": { "D": "10:15-11:10", "E": "11:50-12:45", "F": "13:25-14:20" }
  },
  "4": {
    "1": { "A": "09:45-10:40", "B": "11:20-12:15", "C": "12:55-13:50" },
    "2": { "D": "09:45-10:40", "E": "11:20-12:15", "F": "12:55-13:50" }
  },
  "5": {
    "1": { "A": "10:30-11:25", "B": "12:05-13:00", "C": "13:40-14:35" },
    "2": { "D": "10:30-11:25", "E": "12:05-13:00", "F": "13:40-14:35" }
  },
  "6": {
    "1": { "A": "09:15-10:10", "B": "10:50-11:45", "C": "12:25-13:20" },
    "2": { "D": "09:15-10:10", "E": "10:50-11:45", "F": "12:25-13:20" }
  },
  "7": {
    "1": { "A": "10:45-11:40", "B": "12:20-13:15", "C": "13:55-14:50" },
    "2": { "D": "10:45-11:40", "E": "12:20-13:15", "F": "13:55-14:50" }
  },
  "8": {
    "1": { "A": "09:00-09:55", "B": "10:35-11:30", "C": "12:10-13:05" },
    "2": { "D": "09:00-09:55", "E": "10:35-11:30", "F": "12:10-13:05" }
  },
  "見本演劇": {
    "1": { "A": "14:00-14:20", "B": "15:30-15:50" }
  }
};

function getTimeslotTime(group, day, timeslot) {
  try {
    return TIMESLOT_SCHEDULES[group.toString()][day.toString()][timeslot];
  } catch (e) {
    console.log(`Time not found for ${group}-${day}-${timeslot}`);
    return timeslot;
  }
}

function getTimeslotDisplayName(group, day, timeslot) {
  const time = getTimeslotTime(group, day, timeslot);
  return `${timeslot}時間帯 (${time})`;
}


// ★★★ 修正点 ★★★
// この関数を他のファイルから import できるように、exportキーワードを追加します。
export function getAllTimeslotsForGroup(group) {
  const groupSchedule = TIMESLOT_SCHEDULES[group.toString()];
  if (!groupSchedule) return [];

  const results = [];
  for (const day in groupSchedule) {
    const daySchedule = groupSchedule[day];
    for (const timeslot in daySchedule) {
      const time = daySchedule[timeslot];
      results.push({
        day: day,
        timeslot: timeslot,
        time: time,
        displayName: `${timeslot}時間帯 (${time})`
      });
    }
  }
  return results;
}
