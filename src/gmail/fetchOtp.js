const { google } = require('googleapis');
const config = require('../config');
const { delay } = require('../utils/delay');

function getGmailClient() {
  const oAuth2Client = new google.auth.OAuth2(config.gmail.clientId, config.gmail.clientSecret);
  oAuth2Client.setCredentials({ refresh_token: config.gmail.refreshToken });
  return google.gmail({ version: 'v1', auth: oAuth2Client });
}

function getHeader(headers, name) {
  const h = (headers || []).find((x) => x.name.toLowerCase() === name.toLowerCase());
  return h ? h.value : '';
}

// Ported from "Get OTP" (Gmail search) + "Parse OTP System_id" (regex extraction),
// wrapped in retry/backoff since the email isn't always there on the first check.
async function fetchOtpFromGmail() {
  const gmail = getGmailClient();

  for (let attempt = 1; attempt <= config.otp.maxAttempts; attempt++) {
    const list = await gmail.users.messages.list({
      userId: 'me',
      q: config.gmail.query,
      maxResults: 1,
    });

    const messages = list.data.messages || [];
    if (messages.length > 0) {
      const msg = await gmail.users.messages.get({
        userId: 'me',
        id: messages[0].id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Subject'],
      });

      const snippet = msg.data.snippet || '';
      const headers = msg.data.payload ? msg.data.payload.headers : [];
      const to = getHeader(headers, 'To');

      const otpMatch = snippet.match(/OTP.*?\b(\d{6})\b/i);
      const systemIdMatch = to.match(/^(\d+)\./);

      if (otpMatch) {
        if (systemIdMatch && systemIdMatch[1] !== String(config.sharda.systemId)) {
          console.warn(
            `OTP email was addressed to system_id ${systemIdMatch[1]}, not the configured ${config.sharda.systemId} — using it anyway.`
          );
        }
        return otpMatch[1];
      }
    }

    if (attempt < config.otp.maxAttempts) {
      await delay(config.otp.pollIntervalMs);
    }
  }

  throw new Error(
    'OTP not found in Gmail after polling. Check GMAIL_OTP_QUERY, that the email actually arrived, and OTP_MAX_ATTEMPTS / OTP_POLL_INTERVAL_MS.'
  );
}

module.exports = { fetchOtpFromGmail };
