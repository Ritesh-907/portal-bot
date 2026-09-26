// Ported from "Format Attendance".
function formatAttendance(snapshot) {
  const home = snapshot.home || {};

  let text = `📊 *Attendance Summary*\n\nOverall: ${home.present}/${home.totalClasses} (${home.percentage}%)\n\n`;

  if (Array.isArray(snapshot.courses) && snapshot.courses.length) {
    text += snapshot.courses
      .map((c) => {
        const name = (c.courseName || '').replace(/&amp;/g, '&');
        const pct = String(c.percentage || '').padStart(4);
        const count = (c.attended !== undefined && c.delivered !== undefined) ? ` (${c.attended}/${c.delivered})` : '';
        return `${pct}${count} — ${name} [${c.courseCode}]`;
      })
      .join('\n');
  } else {
    text += '_(Per-course breakdown unavailable right now — send /start to refresh.)_';
  }

  return text;
}

// The portal's day labels look like "Mon, 26 Aug 2026" — same convention as
// the weekly timetable's day labels (see formatTimetable's sameDate).
function findDayRow(days, date) {
  return (days || []).find((d) => {
    const parsed = new Date(String(d.day).replace(/^[A-Za-z]+,\s*/, ''));
    return parsed.toDateString() === date.toDateString();
  });
}

const STATUS_EMOJI = {
  green: '🟢',
  red: '🔴',
  yellow: '🟡',
  present: '🟢',
  absent: '🔴',
  p: '🟢',
  a: '🔴',
  holiday: '🎉',
  cancelled: '⚠️',
  leave: '📝',
};

function getStatusEmoji(statusColor, status) {
  const colorKey = (statusColor || '').toLowerCase();
  if (STATUS_EMOJI[colorKey]) return STATUS_EMOJI[colorKey];

  const statusKey = (status || '').toLowerCase();
  if (STATUS_EMOJI[statusKey]) return STATUS_EMOJI[statusKey];

  return '🟢';
}

// Ported/new: day-wise attendance for one specific date, e.g. what "26 aug
// attendance" replies with. `days` is the parsed
// POST .../fullattendance table for that month (parseFullAttendance's
// output); `date` is a JS Date for the day the user asked about.
function formatDayAttendance(days, date) {
  const row = findDayRow(days, date);
  const label = date.toDateString();

  if (!row) {
    return `⚠️ No attendance record found for *${label}*. It may be outside the term, a future date, or the portal simply has no class data for it.`;
  }

  if (!row.periods.length) {
    return `📅 *${row.day}* — No classes scheduled (or a holiday).`;
  }

  const lines = row.periods.map((p, idx) => {
    const emoji = getStatusEmoji(p.statusColor, p.status);
    const subject = p.subjectCode
      ? `${p.subjectCode}${p.topic ? ` - ${p.topic}` : ''}`
      : `Period ${idx + 1}`;
    return `• ${subject} ${emoji}`;
  });

  return `📊 *Attendance for ${row.day}*\n\n${lines.join('\n')}`;
}

module.exports = { formatAttendance, formatDayAttendance };