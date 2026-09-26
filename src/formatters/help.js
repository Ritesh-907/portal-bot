// Ported from "Help Reply".
function helpText() {
  return (
    "Hi! Send:\n" +
    "• */start* — refresh your data (login + scrape)\n" +
    "• *timetable* — today's classes\n" +
    "• *attendance* — your attendance %\n" +
    "• *26 aug attendance* — day-wise attendance for that date"
  );
}

module.exports = { helpText };
