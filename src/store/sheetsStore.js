const { google } = require('googleapis');
const config = require('../config');

// Reuses the Gmail OAuth2 client — that refresh token must also carry the
// spreadsheets scope (request both scopes together when you generate it).
function getSheetsClient() {
  const oAuth2Client = new google.auth.OAuth2(config.gmail.clientId, config.gmail.clientSecret);
  oAuth2Client.setCredentials({ refresh_token: config.gmail.refreshToken });
  return google.sheets({ version: 'v4', auth: oAuth2Client });
}

// Mirrors n8n's "Save Snapshot" (appendOrUpdate matching on row_id="latest"):
// a single row, always overwritten, at A2:C2. Row 1 is left free for your
// own header row (row_id | date | snapshot).
async function saveLatest(snapshot) {
  const sheets = getSheetsClient();
  const date = new Date().toISOString().split('T')[0];

  await sheets.spreadsheets.values.update({
    spreadsheetId: config.store.sheetId,
    range: `${config.store.sheetName}!A2:C2`,
    valueInputOption: 'RAW',
    requestBody: {
      values: [['latest', date, JSON.stringify(snapshot)]],
    },
  });
}

async function getLatest() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.store.sheetId,
    range: `${config.store.sheetName}!A2:C2`,
  });

  const row = res.data.values && res.data.values[0];
  if (!row || !row[2]) return null;
  return JSON.parse(row[2]);
}

module.exports = { saveLatest, getLatest };
