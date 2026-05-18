const cron = require('node-cron');
const logger = require('../utils/logger');

async function sendDailyBriefing(sock) {
  try {
    const ownerJid = process.env.OWNER_NUMBER + '@s.whatsapp.net';
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let briefing = `🌅 *𝗗𝗮𝗶𝗹𝘆 𝗕𝗿𝗶𝗲𝗳𝗶𝗻𝗴*\n`;
    briefing += `📅 ${dateStr}\n`;
    briefing += `🕐 ${timeStr}\n`;
    briefing += `━━━━━━━━━━━━━━━━━━━\n\n`;

    // Weather
    try {
      const weatherKey = process.env.OPENWEATHER_KEY;
      if (weatherKey) {
        const wRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Nairobi&appid=${weatherKey}&units=metric`);
        const wData = await wRes.json();
        if (wData?.main) {
          briefing += `🌤️ *Weather*\n`;
          briefing += `📍 ${wData.name}: ${Math.round(wData.main.temp)}°C\n`;
          briefing += `💧 Humidity: ${wData.main.humidity}%\n`;
          briefing += `🌬️ ${wData.weather[0]?.description}\n\n`;
        }
      }
    } catch {}

    // Crypto prices
    try {
      const cRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true');
      const cData = await cRes.json();
      if (cData?.bitcoin) {
        briefing += `💰 *Crypto*\n`;
        briefing += `₿ BTC: $${cData.bitcoin.usd.toLocaleString()} (${cData.bitcoin.usd_24h_change?.toFixed(2)}%)\n`;
        briefing += `Ξ ETH: $${cData.ethereum.usd.toLocaleString()} (${cData.ethereum.usd_24h_change?.toFixed(2)}%)\n\n`;
      }
    } catch {}

    // News headlines
    try {
      const newsKey = process.env.NEWSAPI_KEY;
      if (newsKey) {
        const nRes = await fetch(`https://newsapi.org/v2/top-headlines?country=us&pageSize=3&apiKey=${newsKey}`);
        const nData = await nRes.json();
        if (nData?.articles?.length) {
          briefing += `📰 *Top News*\n`;
          nData.articles.slice(0, 3).forEach((a, i) => {
            briefing += `${i+1}. ${a.title}\n`;
          });
          briefing += `\n`;
        }
      }
    } catch {}

    // Pending reminders
    try {
      const { getPendingReminders } = require('../db/database');
      const reminders = getPendingReminders?.() || [];
      if (reminders.length) {
        briefing += `⏰ *Pending Reminders (${reminders.length})*\n`;
        reminders.slice(0, 3).forEach(r => {
          briefing += `• ${r.message || r.text}\n`;
        });
        briefing += `\n`;
      }
    } catch {}

    // AI motivation
    try {
      const { askAI } = require('../handlers/unique');
      const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const day = days[now.getDay()];
      const motivation = await askAI(
        `Today is ${day}`,
        'Write one powerful motivational sentence for the day. Make it energetic and inspiring. Max 20 words. No quotes.'
      );
      if (motivation) briefing += `💪 *${motivation.trim()}*\n\n`;
    } catch {}

    // Bot stats
    briefing += `🤖 *Bot Status*\n`;
    briefing += `✅ Online and running\n`;
    briefing += `👥 Groups active: ${Object.keys(global.enabledGroups || {}).length}\n`;
    briefing += `💬 Messages cached: ${Object.keys(global.messageCache || {}).length}\n`;
    briefing += `━━━━━━━━━━━━━━━━━━━\n`;
    briefing += `_Have a great day! 🚀_`;

    await sock.sendMessage(ownerJid, { text: briefing });
    logger.info('📅 Daily briefing sent');
  } catch (err) {
    logger.error('Daily briefing error:', err.message);
  }
}

function runScheduler(sock) {
  // Daily briefing at 8am every day
  cron.schedule('0 8 * * *', () => sendDailyBriefing(sock));

  logger.info('⏰ Scheduler running');
}

module.exports = { runScheduler, sendDailyBriefing };
