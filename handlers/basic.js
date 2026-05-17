const { getJID } = require('../utils/helpers');
const { getStats } = require('../db/database');
const { safeSend } = require('../utils/send');
const config = require('../config');

const startTime = Date.now();

async function handleBasic(sock, msg, cmd, args) {
  const jid = getJID(msg);
  const isGroup = jid.endsWith('@g.us');
  if (!isGroup) await new Promise(r => setTimeout(r, 3000));
  const PREFIX = config.PREFIX;

  switch (cmd) {
    case 'ping': {
      const t = Date.now();
      await safeSend(sock, jid, { text: '🏓 Pong!' });
      await safeSend(sock, jid, { text: `⚡ Latency: *${Date.now() - t}ms*` });
      break;
    }
    case 'uptime': {
      const ms = Date.now() - startTime;
      const h = Math.floor(ms / 3600000);
      const m = Math.floor(ms / 60000) % 60;
      const s = Math.floor(ms / 1000) % 60;
      await safeSend(sock, jid, { text: `⏱️ Uptime: *${h}h ${m}m ${s}s*` });
      break;
    }
    case 'echo':
      if (!args.length) { await safeSend(sock, jid, { text: '❌ Usage: !echo <text>' }); return; }
      await safeSend(sock, jid, { text: args.join(' ') });
      break;
    case 'id':
      await safeSend(sock, jid, { text: `📌 Chat ID:\n\`${jid}\`` });
      break;
    case 'info':
      await safeSend(sock, jid, {
        text: `╔═══════════════════╗\n` +
              `║   🤖 *xssrat Bot v2.0*   ║\n` +
              `╚═══════════════════╝\n\n` +
              `┌─────────────────────\n` +
              `│ 🔧 Prefix: *${PREFIX}*\n` +
              `│ 💻 Platform: Node.js + Baileys\n` +
              `│ ⚡ Commands: *100+*\n` +
              `│ 🤖 AI: OpenRouter powered\n` +
              `│ 👑 Owner: xssrat\n` +
              `└─────────────────────\n\n` +
              `Type *${PREFIX}help* to see all commands.`,
      });
      break;
    case 'help':
      await safeSend(sock, jid, {
        text: `╔═══════════════════╗\n` +
              `║  📋 *xssrat Bot Commands*  ║\n` +
              `╚═══════════════════╝\n\n` +
              `*[1/6] 🔧 BASIC & GROUP*\n` +
              `━━━━━━━━━━━━━━━━━━━\n` +
              `• ${PREFIX}ping — Check bot speed\n` +
              `• ${PREFIX}uptime — Bot online time\n` +
              `• ${PREFIX}info — Bot information\n` +
              `• ${PREFIX}id — Get chat ID\n` +
              `• ${PREFIX}echo <text> — Repeat text\n\n` +
              `*👥 Group Management*\n` +
              `• ${PREFIX}kick/add/promote/demote\n` +
              `• ${PREFIX}rename/members/warn\n` +
              `• ${PREFIX}welcome/antispam/antilink on/off\n` +
              `• ${PREFIX}mute/poll/tagall\n` +
              `• ${PREFIX}rules/setrules/vote\n` +
              `• ${PREFIX}leaderboard/raffle\n` +
              `• ${PREFIX}inactive <days>`,
      });
      await new Promise(r => setTimeout(r, 800));
      await safeSend(sock, jid, {
        text: `*[2/6] 🤖 AI COMMANDS*\n` +
              `━━━━━━━━━━━━━━━━━━━\n` +
              `• ${PREFIX}ask <question> — Ask anything\n` +
              `• ${PREFIX}ai <question> — AI assistant\n` +
              `• ${PREFIX}summarize <text> — Summarize\n` +
              `• ${PREFIX}translate <lang> <text>\n` +
              `• ${PREFIX}code <question> — Code help\n` +
              `• ${PREFIX}sentiment <text> — Mood check\n` +
              `• ${PREFIX}imagine <prompt> — Visualize\n` +
              `• ${PREFIX}advice <topic> — Life advice\n` +
              `• ${PREFIX}story <topic> — Short story\n` +
              `• ${PREFIX}poem <topic> — Write poem\n` +
              `• ${PREFIX}recipe <dish> — Get recipe\n` +
              `• ${PREFIX}debate <topic> — Both sides\n` +
              `• ${PREFIX}explain <topic> — Simplify\n` +
              `• ${PREFIX}compare <x> vs <y>\n` +
              `• ${PREFIX}chat <message> — AI memory chat\n` +
              `• ${PREFIX}persona <type> — Set AI style\n` +
              `• ${PREFIX}clearchat — Reset AI memory`,
      });
      await new Promise(r => setTimeout(r, 800));
      await safeSend(sock, jid, {
        text: `*[3/6] 🎮 FUN & RELATIONSHIPS*\n` +
              `━━━━━━━━━━━━━━━━━━━\n` +
              `• ${PREFIX}joke/fact/riddle/trivia\n` +
              `• ${PREFIX}8ball <question>\n` +
              `• ${PREFIX}horoscope <sign>\n` +
              `• ${PREFIX}truth/dare/spicydare\n` +
              `• ${PREFIX}spin/rps/coinflip\n\n` +
              `*💕 Couples & Flirt*\n` +
              `• ${PREFIX}seduce — Flirt line\n` +
              `• ${PREFIX}pickup — Pickup line\n` +
              `• ${PREFIX}compliment — Sweet compliment\n` +
              `• ${PREFIX}couple — Couple challenge\n` +
              `• ${PREFIX}wyr — Would you rather\n` +
              `• ${PREFIX}lovemeter <n1> <n2>\n` +
              `• ${PREFIX}shipname <n1> <n2>\n` +
              `• ${PREFIX}loveadvice — Relationship tips\n` +
              `• ${PREFIX}roast <name> — Funny roast\n` +
              `• ${PREFIX}rizz <their msg> — Best rizz\n` +
              `• ${PREFIX}suggestreply <msg>`,
      });
      await new Promise(r => setTimeout(r, 800));
      await safeSend(sock, jid, {
        text: `*[4/6] 🌍 INFO & UTILITIES*\n` +
              `━━━━━━━━━━━━━━━━━━━\n` +
              `• ${PREFIX}weather <city>\n` +
              `• ${PREFIX}news <topic>\n` +
              `• ${PREFIX}crypto <coin>\n` +
              `• ${PREFIX}stock <symbol>\n` +
              `• ${PREFIX}define <word>\n` +
              `• ${PREFIX}calc <expression>\n` +
              `• ${PREFIX}convert <val> <from> to <to>\n` +
              `• ${PREFIX}qr <text> — Generate QR\n` +
              `• ${PREFIX}password <length>\n` +
              `• ${PREFIX}time <city/timezone>\n` +
              `• ${PREFIX}ip <address>\n\n` +
              `*✍️ Writing Tools*\n` +
              `• ${PREFIX}grammar <text>\n` +
              `• ${PREFIX}rewrite <text>\n` +
              `• ${PREFIX}emoji <text>\n` +
              `• ${PREFIX}summarizelink <url>\n` +
              `• ${PREFIX}bio <your details>\n` +
              `• ${PREFIX}caption <description>\n` +
              `• ${PREFIX}name <theme>`,
      });
      await new Promise(r => setTimeout(r, 800));
      await safeSend(sock, jid, {
        text: `*[5/6] 📝 PRODUCTIVITY*\n` +
              `━━━━━━━━━━━━━━━━━━━\n` +
              `• ${PREFIX}remind <time> <msg>\n` +
              `• ${PREFIX}todo add/list/done\n` +
              `• ${PREFIX}note save/get/list\n` +
              `• ${PREFIX}habit add/done/list\n` +
              `• ${PREFIX}goal add/list/done\n` +
              `• ${PREFIX}expense add/list/clear\n` +
              `• ${PREFIX}budget — Expense summary\n` +
              `• ${PREFIX}countdown add/list\n` +
              `• ${PREFIX}pomodoro <minutes>\n` +
              `• ${PREFIX}checklist add/list/done\n` +
              `• ${PREFIX}schedule add/list/delete\n` +
              `• ${PREFIX}broadcast all/list/groups\n` +
              `• ${PREFIX}stats — Bot statistics\n\n` +
              `*💼 Professional*\n` +
              `• ${PREFIX}meeting <topic>\n` +
              `• ${PREFIX}email <topic>\n` +
              `• ${PREFIX}cv <your details>\n` +
              `• ${PREFIX}invoice <details>
              `• ${PREFIX}quiz <topic> — AI quiz\n` +
              `• ${PREFIX}coverlettr <job/details>
      });
      await new Promise(r => setTimeout(r, 800));
      await safeSend(sock, jid, {
        text: `*[6/6] ✨ SPECIAL & ADMIN*\n` +
              `━━━━━━━━━━━━━━━━━━━\n` +
              `*🕵️ Special Modes*\n` +
              `• ${PREFIX}nightmode on/off — Flirty after 10pm\n` +
              `• ${PREFIX}ghostmode on/off — Read silently\n` +
              `• ${PREFIX}busy <message>/off\n` +
              `• ${PREFIX}spy on/off — Forward group msgs\n` +
              `• ${PREFIX}stalk <number>\n` +
              `• ${PREFIX}mood <text> — Detect mood\n` +
              `• ${PREFIX}rate <anything>\n` +
              `• ${PREFIX}confess <msg> — Anonymous\n` +
              `• ${PREFIX}anonymous <msg>\n` +
              `• ${PREFIX}scheduledm <num> <time> <msg>\n` +
              `• ${PREFIX}recall — Delete last message\n` +
              `• ${PREFIX}autodelete <hours>\n\n` +
              `*🧠 Personal*\n` +
              `• ${PREFIX}journal/myjournal\n` +
              `• ${PREFIX}motivate/vent/affirmation\n\n` +
              `*🔐 Admin Only*\n` +
              `• ${PREFIX}ban/unban <number>\n` +
              `• ${PREFIX}setprefix <symbol>\n` +
              `• ${PREFIX}addkeyword/delkeyword\n` +
              `• ${PREFIX}keywords/logs\n\n` +
              `━━━━━━━━━━━━━━━━━━━\n` +
              `💡 *Tips:* Bot auto-replies with AI\n` +
              `🌙 Try *${PREFIX}nightmode on* after 10pm\n` +
              `🤖 *${PREFIX}chat* for memory conversations`,
      });
      break;
  }
}

module.exports = { handleBasic };
