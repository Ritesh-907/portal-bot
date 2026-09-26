// This project's day labels (from parseTimetable / parseFullAttendance) look
// like "Mon, 26 Aug 2026" — a leading weekday name, then a date JS's Date
// constructor can parse on its own.
function parseLabelDate(label) {
  return new Date(String(label).replace(/^[A-Za-z]+,\s*/, ''));
}

function sameCalendarDate(dayLabel, date) {
  return parseLabelDate(dayLabel).toDateString() === date.toDateString();
}

module.exports = { parseLabelDate, sameCalendarDate };