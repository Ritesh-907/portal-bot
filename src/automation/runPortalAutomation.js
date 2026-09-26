const { createClient } = require('./httpClient');
const { sendOtp, login } = require('./login');
const { getHome, getCourses, getFullAttendance, getTimetable } = require('./scrape');
const { parseHome, parseCourses, parseFullAttendance, parseTimetable } = require('./parsers');
const { getISOWeek } = require('./isoWeek');
const { buildMonthParam } = require('./monthParam');
const { fetchOtpFromGmail } = require('../gmail/fetchOtp');
const { delay } = require('../utils/delay');
const config = require('../config');
const store = require('../store');

// Steps 1-3 of the "Portal Automation" n8n workflow: trigger the OTP email,
// poll Gmail for it, then log in. Returns an authenticated client that any
// scrape.js call can use. Pulled out on its own so an on-demand lookup (e.g.
// one month's day-wise attendance) can log in fresh without also having to
// re-scrape and rebuild the whole snapshot.
async function loginToPortal() {
  const client = createClient();

  // 1. Trigger the OTP email. The pre-login session cookie the portal sets
  //    here is stored in the jar automatically (n8n did this by hand in
  //    "extract Cokkie").
  await sendOtp(client);

  // 2. Give the email a moment to arrive, then poll Gmail for it
  //    (n8n's "Wait" -> "Get OTP" -> "Parse OTP System_id").
  await delay(config.otp.initialWaitMs);
  const otp = await fetchOtpFromGmail();

  // 3. Log in. The jar sends the pre-login cookie automatically and stores
  //    the new authenticated session cookie from the response
  //    (n8n's "Login" -> "Extract Cookie").
  await login(client, otp);

  return client;
}

// Key used to store a given month's day-wise attendance inside
// snapshot.monthlyAttendance, e.g. monthKey(7, 2026) -> "2026-08".
function monthKey(monthIndex0, year) {
  return `${year}-${String(monthIndex0 + 1).padStart(2, '0')}`;
}

// Reproduces the whole "Portal Automation" n8n workflow, start to finish —
// plus, on top of the original workflow, also fetches *last* month's
// day-wise attendance (via the POST the month-picker uses) so that
// "<day> <last month> attendance" can be answered from the snapshot too,
// without a fresh login.
async function runPortalAutomation() {
  const client = await loginToPortal();

  // 4. Fan out to Home / Courses / Full attendance (current + previous
  //    month) / this week's timetable / next week's timetable, same as the
  //    parallel branches in n8n (previous month's attendance is the one
  //    addition beyond the original workflow).
  const now = new Date();
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeek = getISOWeek(nextWeekDate);

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthParam = buildMonthParam(prevMonthDate.getMonth(), prevMonthDate.getFullYear());

  const [homeHtml, coursesHtml, attendanceHtml, prevMonthHtml, thisWeekHtml, nextWeekHtml] =
    await Promise.all([
      getHome(client),
      getCourses(client),
      getFullAttendance(client), // current month, plain GET
      getFullAttendance(client, prevMonthParam), // previous month, POST
      getTimetable(client),
      getTimetable(client, nextWeek),
    ]);

  const currentMonthDays = parseFullAttendance(attendanceHtml);
  const currentKey = monthKey(now.getMonth(), now.getFullYear());
  const prevKey = monthKey(prevMonthDate.getMonth(), prevMonthDate.getFullYear());

  // 5. Parse + merge, same shape as n8n's "Merge" -> "Build Snapshot".
  const snapshot = {
    home: parseHome(homeHtml),
    courses: parseCourses(coursesHtml),
    dayWiseAttendance: currentMonthDays, // kept for backward compat with formatAttendance/etc.
    monthlyAttendance: {
      [currentKey]: currentMonthDays,
      [prevKey]: parseFullAttendance(prevMonthHtml),
    },
    weeklyTimetable: [...parseTimetable(thisWeekHtml), ...parseTimetable(nextWeekHtml)],
  };

  // 6. Save as the single "latest" snapshot, same as "Save Snapshot".
  await store.saveLatest(snapshot);

  return snapshot;
}

// On-demand lookup for a single month's day-wise attendance, e.g. when the
// user asks for "26 aug attendance". Logs in fresh (same as above — there's
// no long-lived session to reuse between Telegram messages), then does the
// POST .../fullattendance the portal's month picker does
// (month=1-August%2C+2026 for August 2026), and returns it parsed into the
// same { day, periods } shape as snapshot.dayWiseAttendance.
async function getAttendanceForMonth(monthIndex0, year) {
  const client = await loginToPortal();
  const monthParam = buildMonthParam(monthIndex0, year);
  const html = await getFullAttendance(client, monthParam);
  return parseFullAttendance(html);
}

// Cached wrapper around getAttendanceForMonth: current + previous month are
// already sitting in the snapshot's monthlyAttendance after /start, so most
// "<day> <month> attendance" queries can be answered straight from there —
// no login needed. Only an older month (not in the snapshot yet) triggers a
// fresh login, and the result is then cached into the snapshot for next
// time. Returns { days, fromCache }.
async function getAttendanceForMonthCached(monthIndex0, year) {
  const key = monthKey(monthIndex0, year);
  const snapshot = await store.getLatest();
  const cached = snapshot && snapshot.monthlyAttendance && snapshot.monthlyAttendance[key];

  if (cached) {
    return { days: cached, fromCache: true };
  }

  const days = await getAttendanceForMonth(monthIndex0, year);

  // Merge into whatever snapshot already exists rather than overwriting
  // home/courses/timetable with a partial object.
  await store.saveLatest({
    ...(snapshot || {}),
    monthlyAttendance: { ...((snapshot && snapshot.monthlyAttendance) || {}), [key]: days },
  });

  return { days, fromCache: false };
}

module.exports = {
  runPortalAutomation,
  loginToPortal,
  getAttendanceForMonth,
  getAttendanceForMonthCached,
  monthKey,
};