const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// The portal's month-picker for full attendance submits the 1st of the
// selected month as its value, e.g. "1-August, 2026" for August 2026 (this
// is what the site sends regardless of which day the picker actually shows
// — it always represents "the month", not a specific date).
//
// monthIndex0 is 0-based (0 = January ... 11 = December), matching
// Date.prototype.getMonth().
function buildMonthParam(monthIndex0, year) {
  const name = MONTH_NAMES[monthIndex0];
  if (!name) {
    throw new Error(`buildMonthParam: invalid month index ${monthIndex0}`);
  }
  return `1-${name}, ${year}`;
}

module.exports = { buildMonthParam, MONTH_NAMES };