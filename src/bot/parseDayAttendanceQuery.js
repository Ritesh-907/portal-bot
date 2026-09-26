const MONTH_ALIASES = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

// Longest names first so "september" matches before "sep" inside the regex.
const MONTH_PATTERN = Object.keys(MONTH_ALIASES)
  .sort((a, b) => b.length - a.length)
  .join('|');

// Recognizes a day+month (+ optional year) inside an already-lowercased,
// already-trimmed message, in either order:
//   "26 aug", "26th august", "26 aug 2026", "aug 26", "aug 26 2026"
// Returns { day, monthIndex0, year } (year is null if not given) or null if
// the text doesn't contain a day + a recognizable month. Doesn't care what
// else is in the message (e.g. "attendance"/"timetable") — that's up to the
// caller.
function parseDateComponents(text) {
  const dayThenMonth = new RegExp(
    `\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${MONTH_PATTERN})\\b(?:\\s+(\\d{4}))?`,
    'i'
  );
  const monthThenDay = new RegExp(
    `\\b(${MONTH_PATTERN})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\b(?:\\s+(\\d{4}))?`,
    'i'
  );

  let day;
  let monthKey;
  let year;

  const m1 = text.match(dayThenMonth);
  if (m1) {
    day = parseInt(m1[1], 10);
    monthKey = m1[2].toLowerCase();
    year = m1[3] ? parseInt(m1[3], 10) : null;
  } else {
    const m2 = text.match(monthThenDay);
    if (!m2) return null;
    monthKey = m2[1].toLowerCase();
    day = parseInt(m2[2], 10);
    year = m2[3] ? parseInt(m2[3], 10) : null;
  }

  if (!(day >= 1 && day <= 31)) return null;
  const monthIndex0 = MONTH_ALIASES[monthKey];
  if (monthIndex0 === undefined) return null;

  return { day, monthIndex0, year };
}

// Attendance is always about a date that's already happened. If no year was
// given and the resulting date would be more than a week in the future,
// assume the same date *last* year instead (e.g. asking in Jan 2027 about
// "26 aug" attendance clearly means Aug 2026, not a still-to-come Aug 2027).
function parseDayAttendanceQuery(text) {
  const parsed = parseDateComponents(text);
  if (!parsed) return null;

  let { year } = parsed;
  if (!year) {
    const now = new Date();
    year = now.getFullYear();
    const candidate = new Date(year, parsed.monthIndex0, parsed.day);
    const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
    if (candidate.getTime() - now.getTime() > oneWeekMs) {
      year -= 1;
    }
  }

  return { day: parsed.day, monthIndex0: parsed.monthIndex0, year };
}

// Timetable is naturally about upcoming (or today's) classes, so — unlike
// attendance — a date with no year given just defaults to this year, future
// or not: "6 oct timetable" asked on 26 Sep 2026 means the upcoming Oct 6,
// not Oct 6 of last year.
function parseTimetableDateQuery(text) {
  const parsed = parseDateComponents(text);
  if (!parsed) return null;

  return {
    day: parsed.day,
    monthIndex0: parsed.monthIndex0,
    year: parsed.year || new Date().getFullYear(),
  };
}

module.exports = { parseDayAttendanceQuery, parseTimetableDateQuery, parseDateComponents };