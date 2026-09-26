const { sameCalendarDate } = require('../utils/dateLabel');
const { parseTimetableDateQuery } = require('../bot/parseDayAttendanceQuery');

// Shared by both the weekday-based lookup below and the explicit-date one.
function formatDayRow(row, label) {
  if (!row) {
    return '⚠️ No timetable data for that day — outside the weeks currently available. Send /start to refresh, or ask again in a moment (an older week not already saved is fetched on demand).';
  }
  if (row.holiday) {
    return `🎉 ${label} (${row.day}) — Holiday, no classes!`;
  }
  if (row.periods.length === 0) {
    return `📅 ${label} (${row.day}) — No classes scheduled.`;
  }

  return (
    `📅 *${label} Timetable* (${row.day})\n\n` +
    row.periods
      .map((p) => `🕐 ${p.time}\n📘 ${p.code} - ${p.subject}\n📍 ${p.room}\n👤 ${p.instructor}`)
      .join('\n\n')
  );
}

// Ported from "Format Timetable". `text` is the already-lowercased,
// already-trimmed message text (e.g. "timetable tomorrow", "next monday timetable", "1 oct timetable").
function formatTimetable(snapshot, text) {
  const weekdayFull = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const weekdayShort = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

  const now = new Date();
  let targetDate = new Date(now);
  let label = "Today's";

  const isNext = /\bnext\b/.test(text);
  const isTomorrow = /\btomorrow\b/.test(text);

  const dateQuery = parseTimetableDateQuery(text);

  let matchedIdx = -1;
  for (let i = 0; i < 7; i++) {
    if (text.includes(weekdayFull[i]) || new RegExp(`\\b${weekdayShort[i]}\\b`).test(text)) {
      matchedIdx = i;
      break;
    }
  }

  if (dateQuery) {
    targetDate = new Date(dateQuery.year, dateQuery.monthIndex0, dateQuery.day);
    const dayName = weekdayFull[targetDate.getDay()];
    const capDayName = dayName[0].toUpperCase() + dayName.slice(1);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    label = `${capDayName}, ${dateQuery.day} ${monthNames[dateQuery.monthIndex0]}`;
  } else if (isTomorrow) {
    targetDate.setDate(now.getDate() + 1);
    label = "Tomorrow's";
  } else if (matchedIdx !== -1) {
    let diff = (matchedIdx - now.getDay() + 7) % 7;
    if (isNext) diff = diff === 0 ? 7 : diff + 7; // "next <day>" skips the immediate one
    targetDate.setDate(now.getDate() + diff);
    const dayName = weekdayFull[matchedIdx][0].toUpperCase() + weekdayFull[matchedIdx].slice(1);
    label = isNext ? `Next ${dayName}'s` : diff === 0 ? "Today's" : `${dayName}'s`;
  }

  const row = (snapshot.weeklyTimetable || []).find((d) => sameCalendarDate(d.day, targetDate));
  return formatDayRow(row, label);
}

// New: an explicit calendar date, e.g. "6 oct timetable". `row` may come
// straight from the cached snapshot or from a fresh on-demand week fetch
// (see getTimetableForDateCached in runPortalAutomation.js) — either way
// this just renders it the same way as formatTimetable does.
function formatTimetableForDate(row, date) {
  return formatDayRow(row, date.toDateString());
}

module.exports = { formatTimetable, formatTimetableForDate };