const { getJID } = require('../utils/helpers');
const { getStats } = require('../db/database');
const { safeSend } = require('../utils/send');
const config = require('../config');

const startTime = Date.now();

async function handleBasic(sock, msg, cmd, args) {
  const jid = getJID(msg);
  const isGroup = jid.endsWith('@g.us');
  if (!isGroup) await new Promise(r => setTimeout(r, 3000));
  const P = config.PREFIX;

  switch (cmd) {
    case 'ping': {
      const t = Date.now();
      await safeSend(sock, jid, { text: '🏓 Pong!' });
      await safeSend(sock, jid, { text: '⚡ Latency: *' + (Date.now() - t) + 'ms*' });
      break;
    }
    case 'uptime': {
      const ms = Date.now() - startTime;
      const h = Math.floor(ms / 3600000);
      const m = Math.floor(ms / 60000) % 60;
      const s = Math.floor(ms / 1000) % 60;
      await safeSend(sock, jid, { text: '⏱️ Uptime: *' + h + 'h ' + m + 'm ' + s + 's*' });
      break;
    }
    case 'echo':
      if (!args.length) { await safeSend(sock, jid, { text: 'Usage: ' + P + 'echo <text>' }); return; }
      await safeSend(sock, jid, { text: args.join(' ') });
      break;
    case 'id':
      await safeSend(sock, jid, { text: '📌 Chat ID:\n' + jid });
      break;
    case 'info':
      await safeSend(sock, jid, {
        text: '╔═══════════════════╗\n' +
              '║   🤖 *xssrat Bot v2.0*   ║\n' +
              '╚═══════════════════╝\n\n' +
              '│ 🔧 Prefix: *' + P + '*\n' +
              '│ 💻 Node.js + Baileys\n' +
              '│ ⚡ Commands: *100+*\n' +
              '│ 🤖 AI: OpenRouter\n' +
              '│ 👑 Owner: xssrat\n\n' +
              'Type *' + P + 'help* for all commands.',
      });
      break;
    case 'help':
      await safeSend(sock, jid, {
        text: '╔═══════════════════╗\n' +
              '║  📋 *xssrat Bot — Help*  ║\n' +
              '╚═══════════════════╝\n\n' +
              '*[1/6] 🔧 BASIC & GROUP*\n' +
              '━━━━━━━━━━━━━━━━━━━\n' +
              P + 'ping, ' + P + 'uptime, ' + P + 'info, ' + P + 'id, ' + P + 'echo\n\n' +
              '*👥 Group*\n' +
              P + 'kick, ' + P + 'add, ' + P + 'promote, ' + P + 'demote\n' +
              P + 'rename, ' + P + 'members, ' + P + 'warn, ' + P + 'mute\n' +
              P + 'welcome, ' + P + 'antispam, ' + P + 'antilink\n' +
              P + 'poll, ' + P + 'tagall, ' + P + 'rules, ' + P + 'setrules\n' +
              P + 'vote, ' + P + 'leaderboard, ' + P + 'raffle, ' + P + 'inactive',
      });
      await new Promise(r => setTimeout(r, 800));
      await safeSend(sock, jid, {
        text: '*[2/6] 🤖 AI COMMANDS*\n' +
              '━━━━━━━━━━━━━━━━━━━\n' +
              P + 'ask, ' + P + 'ai, ' + P + 'summarize\n' +
              P + 'translate <lang> <text>\n' +
              P + 'code, ' + P + 'sentiment, ' + P + 'imagine\n' +
              P + 'advice, ' + P + 'story, ' + P + 'poem\n' +
              P + 'recipe, ' + P + 'debate, ' + P + 'explain\n' +
              P + 'compare <x> vs <y>\n' +
              P + 'chat — AI with memory\n' +
              P + 'persona <sassy/funny/wise/flirty/serious>\n' +
              P + 'clearchat — Reset AI memory',
      });
      await new Promise(r => setTimeout(r, 800));
      await safeSend(sock, jid, {
        text: '*[3/6] 🎮 FUN & FLIRT*\n' +
              '━━━━━━━━━━━━━━━━━━━\n' +
              P + 'joke, ' + P + 'fact, ' + P + 'riddle, ' + P + 'trivia\n' +
              P + '8ball <question>\n' +
              P + 'horoscope <sign>\n' +
              P + 'truth, ' + P + 'dare, ' + P + 'spicydare\n' +
              P + 'spin, ' + P + 'rps, ' + P + 'coinflip\n\n' +
              '*💕 Couples & Flirt*\n' +
              P + 'seduce, ' + P + 'pickup, ' + P + 'compliment\n' +
              P + 'couple, ' + P + 'wyr, ' + P + 'loveadvice\n' +
              P + 'lovemeter <n1> <n2>\n' +
              P + 'shipname <n1> <n2>\n' +
              P + 'roast <name>\n' +
              P + 'rizz <their msg>\n' +
              P + 'suggestreply <msg>',
      });
      await new Promise(r => setTimeout(r, 800));
      await safeSend(sock, jid, {
        text: '*[4/6] 🌍 INFO & UTILITIES*\n' +
              '━━━━━━━━━━━━━━━━━━━\n' +
              P + 'weather <city>\n' +
              P + 'news <topic>\n' +
              P + 'crypto <coin>\n' +
              P + 'stock <symbol>\n' +
              P + 'define <word>\n' +
              P + 'calc <expression>\n' +
              P + 'convert <val> <from> to <to>\n' +
              P + 'qr <text>\n' +
              P + 'password <length>\n' +
              P + 'time <timezone>\n' +
              P + 'ip <address>\n\n' +
              '*✍️ Writing Tools*\n' +
              P + 'grammar <text>\n' +
              P + 'rewrite <text>\n' +
              P + 'emoji <text>\n' +
              P + 'summarizelink <url>\n' +
              P + 'bio <details>\n' +
              P + 'caption <description>\n' +
              P + 'name <theme>',
      });
      await new Promise(r => setTimeout(r, 800));
      await safeSend(sock, jid, {
        text: '*[5/6] 📝 PRODUCTIVITY*\n' +
              '━━━━━━━━━━━━━━━━━━━\n' +
              P + 'remind <time> <msg>\n' +
              P + 'todo add/list/done\n' +
              P + 'note save/get/list\n' +
              P + 'schedule add/list/delete\n' +
              P + 'broadcast all/list/groups\n' +
              P + 'autoreply add/list/delete\n' +
              P + 'stats\n\n' +
              '*💼 Professional*\n' +
              P + 'meeting <topic>\n' +
              P + 'email <topic>\n' +
              P + 'cv <details>\n' +
              P + 'invoice <details>\n' +
              P + 'quiz <topic>\n' +
              P + 'coverlettr <job/details>',
      });
      await new Promise(r => setTimeout(r, 800));
      await safeSend(sock, jid, {
        text: '*[6/6] ✨ SPECIAL & ADMIN*\n' +
              '━━━━━━━━━━━━━━━━━━━\n' +
              '*🕵️ Special*\n' +
              P + 'nightmode on/off\n' +
              P + 'ghostmode on/off\n' +
              P + 'busy <msg>/off\n' +
              P + 'spy on/off\n' +
              P + 'stalk <number>\n' +
              P + 'mood <text>\n' +
              P + 'rate <anything>\n' +
              P + 'confess <msg>\n' +
              P + 'anonymous <msg>\n' +
              P + 'scheduledm <num> <time> <msg>\n' +
              P + 'recall\n' +
              P + 'autodelete <hours>\n\n' +
              '*🧠 Personal*\n' +
              P + 'journal <entry>\n' +
              P + 'myjournal\n' +
              P + 'motivate, ' + P + 'vent, ' + P + 'affirmation\n\n' +
              '*🔐 Admin*\n' +
              P + 'ban/unban <number>\n' +
              P + 'setprefix <symbol>\n' +
              P + 'addkeyword/delkeyword\n' +
              P + 'keywords, ' + P + 'logs\n\n' +
              '━━━━━━━━━━━━━━━━━━━\n' +
              '💡 Try ' + P + 'nightmode on after 10pm\n' +
              '🤖 ' + P + 'chat for memory conversations',
      });
      break;
  }
}

module.exports = { handleBasic };
