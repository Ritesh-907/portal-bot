// Ported from "Format Attendance".
function formatAttendance(snapshot) {
  const home = snapshot.home || {};

  let text = `📊 *Attendance Summary*\n\nOverall: ${home.present}/${home.totalClasses} (${home.percentage}%)\n\n`;

  if (Array.isArray(snapshot.courses) && snapshot.courses.length) {
    text += snapshot.courses
      .map((c) => `${String(c.percentage).padStart(4)} — ${c.courseName} [${c.courseCode}]`)
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
  present: '✅',
  absent: '❌',
  holiday: '🎉',
  cancelled: '⚠️',
  leave: '📝',
};

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
    const emoji = STATUS_EMOJI[(p.statusColor || '').toLowerCase()] || '•';
    const subject = p.subjectCode
      ? `${p.subjectCode}${p.topic ? ` - ${p.topic}` : ''}`
      : `Period ${idx + 1}`;
    return `${emoji} ${subject} — ${p.statusColor || p.status}`;
  });

  return `📊 *Attendance for ${row.day}*\n\n${lines.join('\n')}`;
}

module.exports = { formatAttendance, formatDayAttendance };