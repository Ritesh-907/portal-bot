const fs = require('fs/promises');
const path = require('path');
const config = require('../config');

async function ensureDir() {
  const dir = path.dirname(config.store.jsonPath);
  await fs.mkdir(dir, { recursive: true });
}

async function saveLatest(snapshot) {
  await ensureDir();
  const payload = {
    row_id: 'latest',
    date: new Date().toISOString().split('T')[0],
    snapshot,
  };
  await fs.writeFile(config.store.jsonPath, JSON.stringify(payload, null, 2));
}

async function getLatest() {
  try {
    const raw = await fs.readFile(config.store.jsonPath, 'utf8');
    return JSON.parse(raw).snapshot;
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

module.exports = { saveLatest, getLatest };
