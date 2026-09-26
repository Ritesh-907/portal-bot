require('dotenv').config();
const { createBot } = require('./src/bot');

const bot = createBot();

bot
  .launch()
  .then(() => console.log('🤖 Portal bot is running (long polling)...'))
  .catch((err) => {
    console.error('Failed to launch bot:', err);
    process.exit(1);
  });

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
