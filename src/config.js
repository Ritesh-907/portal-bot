require('dotenv').config();

function required(name) {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(
      `Missing required env var: ${name}. Copy .env.example to .env and fill it in.`
    );
  }
  return value;
}

module.exports = {
  telegramBotToken: required('TELEGRAM_BOT_TOKEN'),

  sharda: {
    baseUrl: process.env.SHARDA_BASE_URL || 'https://student.sharda.ac.in',
    systemId: required('SHARDA_SYSTEM_ID'),
    mode: process.env.SHARDA_MODE || '1',
  },

  gmail: {
    clientId: required('GMAIL_CLIENT_ID'),
    clientSecret: required('GMAIL_CLIENT_SECRET'),
    refreshToken: required('GMAIL_REFRESH_TOKEN'),
    query: process.env.GMAIL_OTP_QUERY || 'from:ezone@shardauniversity.com newer_than:15m',
  },

  otp: {
    initialWaitMs: Number(process.env.OTP_INITIAL_WAIT_MS || 15000),
    pollIntervalMs: Number(process.env.OTP_POLL_INTERVAL_MS || 10000),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 6),
  },

  store: {
    type: process.env.SNAPSHOT_STORE || 'json',
    jsonPath: process.env.SNAPSHOT_JSON_PATH || './data/snapshot.json',
    sheetId: process.env.GOOGLE_SHEETS_ID,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Sheet1',
  },
};
