const { runPortalAutomation, getAttendanceForMonthCached, monthKey } = require('../automation/runPortalAutomation');
const store = require('../store');
const { formatTimetable } = require('../formatters/timetable');
const { formatAttendance, formatDayAttendance } = require('../formatters/attendance');
const { parseDayAttendanceQuery, parseTimetableDateQuery } = require('./parseDayAttendanceQuery');
const { helpText } = require('../formatters/help');

// Ported from "Parse Command" + "Switch": one text handler that normalizes
// the message the same way, then branches in the same priority order
// (/start -> timetable -> attendance -> help fallback).
function registerCommands(bot) {
  bot.on('text', async (ctx) => {
    const text = (ctx.message.text || '').trim().toLowerCase();

    try {
      if (text === '/start') {
        await ctx.reply('⏳ Logging in and fetching your latest data... (~20-30 sec)', {
          parse_mode: 'Markdown',
        });
        await runPortalAutomation();
        await ctx.reply("✅ Done! Send *timetable* or *attendance* anytime.", {
          parse_mode: 'Markdown',
        });
        return;
      }

      if (text.includes('timetable') || (!text.includes('attendance') && parseTimetableDateQuery(text))) {
        const snapshot = await store.getLatest();
        if (!snapshot) {
          await ctx.reply('⚠️ No data yet — send /start first.');
          return;
        }
        await ctx.reply(formatTimetable(snapshot, text), { parse_mode: 'Markdown' });
        return;
      }

      // A specific date, e.g. "26 aug attendance" or "aug 26 2026
      // attendance" — current + previous month are already cached in the
      // snapshot from /start, so this only logs in fresh for an older
      // month that isn't cached yet (and then caches it for next time).
      if (text.includes('attendance')) {
        const dateQuery = parseDayAttendanceQuery(text);
        if (dateQuery) {
          const key = monthKey(dateQuery.monthIndex0, dateQuery.year);
          const existing = await store.getLatest();
          const isCached = !!(existing && existing.monthlyAttendance && existing.monthlyAttendance[key]);

          if (!isCached) {
            await ctx.reply("⏳ Logging in and fetching that month's attendance... (~20-30 sec)", {
              parse_mode: 'Markdown',
            });
          }

          const { days } = await getAttendanceForMonthCached(dateQuery.monthIndex0, dateQuery.year);
          const targetDate = new Date(dateQuery.year, dateQuery.monthIndex0, dateQuery.day);
          await ctx.reply(formatDayAttendance(days, targetDate), { parse_mode: 'Markdown' });
          return;
        }
      }

      if (text.includes('attendance')) {
        const snapshot = await store.getLatest();
        if (!snapshot) {
          await ctx.reply('⚠️ No data yet — send /start first.');
          return;
        }
        await ctx.reply(formatAttendance(snapshot), { parse_mode: 'Markdown' });
        return;
      }

      await ctx.reply(helpText(), { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Command error:', err);
      await ctx.reply(`❌ Something went wrong: ${err.message}`);
    }
  });
}

module.exports = { registerCommands };