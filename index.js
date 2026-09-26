require('dotenv').config();
const http = require('http');
const { createBot } = require('./src/bot');

// Tiny HTTP server for Render health checks & keep-alive pinging
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => res.end('🤖 Portal bot is online')).listen(PORT, () => {
  console.log(`🌐 HTTP server listening on port ${PORT}`);
});

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
