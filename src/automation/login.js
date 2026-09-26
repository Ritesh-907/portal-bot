const FormData = require('form-data');
const qs = require('querystring');
const config = require('../config');

const BASE = config.sharda.baseUrl;

// Ported from n8n's "Send OTP" node: multipart/form-data POST that triggers
// the portal to email a one-time code, and sets a pre-login session cookie.
async function sendOtp(client) {
  const form = new FormData();
  form.append('send_otp', '1');
  form.append('system_id', config.sharda.systemId);
  form.append('mode', config.sharda.mode);

  const res = await client.post(`${BASE}/studentlogin/sendotp`, form, {
    headers: form.getHeaders(),
  });

  if (res.status >= 400) {
    throw new Error(`sendOtp failed with status ${res.status}`);
  }
  return res;
}

// Ported from n8n's "Login" node.
async function login(client, otp) {
  const body = qs.stringify({
    category: 'student',
    system_id: config.sharda.systemId,
    otp,
  });

  const res = await client.post(`${BASE}/admin/studentlogin`, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });

  if (res.status >= 400) {
    throw new Error(`login failed with status ${res.status} — check the OTP and system_id.`);
  }
  return res;
}

module.exports = { sendOtp, login };
