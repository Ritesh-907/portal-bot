const { Telegraf } = require('telegraf');
const config = require('../config');
const { registerCommands } = require('./commands');

function createBot() {
  const bot = new Telegraf(config.telegramBotToken);
  registerCommands(bot);

  bot.catch((err, ctx) => {
    console.error(`Unhandled bot error for update ${ctx.updateType}:`, err);
  });

  return bot;
}

module.exports = { createBot };
