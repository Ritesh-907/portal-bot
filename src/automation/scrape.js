const qs = require('querystring');
const config = require('../config');

const BASE = config.sharda.baseUrl;

async function getHome(client) {
  const res = await client.get(`${BASE}/admin/home`);
  return res.data;
}

async function getCourses(client) {
  const res = await client.get(`${BASE}/admin/courses`);
  return res.data;
}

// month omitted -> current month's day-wise attendance (simple GET, same as
// before).
// month provided -> a specific month's day-wise attendance. The portal's
// month picker submits the 1st of the selected month as the value, e.g.
// "1-August, 2026" for August 2026 — see buildMonthParam() in ./monthParam.
async function getFullAttendance(client, month) {
  if (month === undefined) {
    const res = await client.get(`${BASE}/admin/courses/fullattendance`);
    return res.data;
  }

  // Built by hand (not qs.stringify) so spaces come out as "+" — matching
  // what the portal's own month picker sends, e.g.
  // "month=1-August%2C+2026" for August 2026 — instead of qs's "%20".
  // Both decode to the same value server-side, but this keeps the request
  // byte-for-byte identical to the real one.
  const body = `month=${encodeURIComponent(month).replace(/%20/g, '+')}`;
  const res = await client.post(`${BASE}/admin/courses/fullattendance`, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data;
}

// week omitted -> current week's timetable (simple GET, same as n8n's "Get Timetable").
// week provided -> a specific ISO week's timetable.
//
// NOTE: the original n8n "HTTP Request" node for next week's timetable put
// `week={{...}}` AND `Cookie: ={{...}}` into the body *parameter names*
// instead of a body value + header — that request was not actually
// authenticating. Fixed here: week goes in the body, auth is handled by the
// shared cookie jar.
async function getTimetable(client, week) {
  if (week === undefined) {
    const res = await client.get(`${BASE}/admin/timetable`);
    return res.data;
  }

  const body = qs.stringify({ week });
  const res = await client.post(`${BASE}/admin/timetable`, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data;
}

module.exports = { getHome, getCourses, getFullAttendance, getTimetable };