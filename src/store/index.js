const config = require('../config');
const jsonStore = require('./jsonStore');
const sheetsStore = require('./sheetsStore');

const impl = config.store.type === 'sheets' ? sheetsStore : jsonStore;

module.exports = {
  saveLatest: impl.saveLatest,
  getLatest: impl.getLatest,
};
