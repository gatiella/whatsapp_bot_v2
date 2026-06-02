const { getJID } = require('../utils/helpers');
const { getStats } = require('../db/database');
const { safeSend } = require('../utils/send');
const { sendMainMenu } = require('./menu_interactive');
const config = require('../config');

const startTime = Date.now();

async function handleBasic(sock, msg, cmd, args) {
  const jid = getJID(msg);
  const P = config.PREFIX;

  switch (cmd) {
    case 'groupon': {
      if (!jid.endsWith('@g.us')) { await safeSend(sock, jid, { text: '❌ Only works in groups.' }); return; }
      global.enabledGroups = global.enabledGroups || {};
      global.enabledGroups[jid] = true;
      await safeSend(sock, jid, { text: '✅ Bot enabled in this group.' });
      break;
    }

    case 'groupoff': {
      if (!jid.endsWith('@g.us')) { await safeSend(sock, jid, { text: '❌ Only works in groups.' }); return; } 
      global.enabledGroups = global.enabledGroups || {};
      delete global.enabledGroups[jid];
      await safeSend(sock, jid, { text: '🔕 Bot disabled in this group.' });
      break;
    }

    case 'ping': {
      const t = Date.now();
      await safeSend(sock, jid, { text: '🏓 Pong! ⚡ ' + (Date.now() - t) + 'ms' });
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
      await safeSend(sock, jid, { text: '📌 ' + jid });
      break;
    case 'info':
      await safeSend(sock, jid, {
        text: '╔═══════════════════╗\n' +
              '║   🤖 *Gatiella Bot v2.0*   ║\n' +
              '╚═══════════════════╝\n\n' +
              '│ 🔧 Prefix: *' + P + '*\n' +
              '│ 💻 Node.js + Baileys\n' +
              '│ ⚡ Commands: *100+*\n' +
              '│ 🤖 AI: OpenRouter\n' +
              '│ 👑 Owner:* Gatiella\n\n' +
              'Type *' + P + 'menu* for all commands.',
      });
      break;
    case 'help':
    case 'menu': {
      const P = config.PREFIX || '!';
      await safeSend(sock, jid, {
        text:
          '░▒▓█ 🤖 *Gatiella Bot v2.0* █▓▒░\n' +
          '▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n' +

          '🔧 *BASIC*\n' +
          '╰ ' + P + 'ping  ' + P + 'uptime  ' + P + 'info  ' + P + 'id\n' +
          '╰ ' + P + 'groupon  ' + P + 'groupoff  ' + P + 'font\n\n' +

          '👥 *GROUP*\n' +
          '╰ ' + P + 'kick  ' + P + 'add  ' + P + 'promote  ' + P + 'demote\n' +
          '╰ ' + P + 'rename  ' + P + 'warn  ' + P + 'mute  ' + P + 'poll\n' +
          '╰ ' + P + 'tagall  ' + P + 'rules  ' + P + 'vote  ' + P + 'raffle\n' +
          '╰ ' + P + 'welcome  ' + P + 'antispam  ' + P + 'antilink\n' +
          '╰ ' + P + 'leaderboard  ' + P + 'inactive  ' + P + 'ghostlist\n\n' +

          '🤖 *AI*\n' +
          '╰ ' + P + 'ask  ' + P + 'ai  ' + P + 'code  ' + P + 'imagine\n' +
          '╰ ' + P + 'summarize  ' + P + 'translate  ' + P + 'sentiment\n' +
          '╰ ' + P + 'story  ' + P + 'poem  ' + P + 'recipe  ' + P + 'debate\n' +
          '╰ ' + P + 'explain  ' + P + 'compare  ' + P + 'advice\n' +
          '╰ ' + P + 'chat  ' + P + 'persona  ' + P + 'clearchat\n\n' +

          '🎮 *FUN*\n' +
          '╰ ' + P + 'joke  ' + P + 'fact  ' + P + 'riddle  ' + P + 'trivia\n' +
          '╰ ' + P + '8ball  ' + P + 'horoscope  ' + P + 'coinflip\n' +
          '╰ ' + P + 'truth  ' + P + 'dare  ' + P + 'spicydare\n' +
          '╰ ' + P + 'spin  ' + P + 'rps\n\n' +

          '💕 *FLIRT*\n' +
          '╰ ' + P + 'seduce  ' + P + 'pickup  ' + P + 'compliment\n' +
          '╰ ' + P + 'rizz  ' + P + 'roast  ' + P + 'couple  ' + P + 'wyr\n' +
          '╰ ' + P + 'lovemeter  ' + P + 'shipname  ' + P + 'loveadvice\n' +
          '╰ ' + P + 'suggestreply\n\n' +

          '🌍 *INFO & TOOLS*\n' +
          '╰ ' + P + 'weather  ' + P + 'news  ' + P + 'crypto\n' +
          '╰ ' + P + 'stock  ' + P + 'define  ' + P + 'ip\n' +
          '╰ ' + P + 'calc  ' + P + 'convert  ' + P + 'time\n' +
          '╰ ' + P + 'qr  ' + P + 'password\n\n' +

          '✍️ *WRITING*\n' +
          '╰ ' + P + 'grammar  ' + P + 'rewrite  ' + P + 'emoji\n' +
          '╰ ' + P + 'bio  ' + P + 'caption  ' + P + 'name\n' +
          '╰ ' + P + 'summarizelink\n\n' +

          '📝 *PRODUCTIVITY*\n' +
          '╰ ' + P + 'remind  ' + P + 'todo  ' + P + 'note\n' +
          '╰ ' + P + 'schedule  ' + P + 'broadcast  ' + P + 'stats\n' +
          '╰ ' + P + 'autoreply  ' + P + 'daily\n\n' +

          '💼 *PROFESSIONAL*\n' +
          '╰ ' + P + 'meeting  ' + P + 'email  ' + P + 'cv\n' +
          '╰ ' + P + 'invoice  ' + P + 'quiz  ' + P + 'coverlettr\n\n' +

          '🕵️ *SPECIAL*\n' +
          '╰ ' + P + 'stalk  ' + P + 'phoneosint  ' + P + 'expose\n' +
          '╰ ' + P + 'usersearch  ' + P + 'pastebin  ' + P + 'stalkwatch\n' +
          '╰ ' + P + 'whoviewed  ' + P + 'readreceipt  ' + P + 'lasttexted\n' +
          '╰ ' + P + 'ghostmode  ' + P + 'spy  ' + P + 'busy\n' +
          '╰ ' + P + 'fakeonline  ' + P + 'autotyping  ' + P + 'lastseen\n' +
          '╰ ' + P + 'anonymous  ' + P + 'fake  ' + P + 'impersonate\n' +
          '╰ ' + P + 'clone  ' + P + 'stylemode  ' + P + 'chameleon\n' +
          '╰ ' + P + 'disappear  ' + P + 'recallall  ' + P + 'recall\n' +
          '╰ ' + P + 'mimic  ' + P + 'scheduledm  ' + P + 'autodelete\n' +
          '╰ ' + P + 'nightmode  ' + P + 'myonline  ' + P + 'setname\n' +
          '╰ ' + P + 'setabout  ' + P + 'sendfrom\n\n' +

          '🧠 *INTELLIGENCE*\n' +
          '╰ ' + P + 'mood  ' + P + 'pattern  ' + P + 'interest\n' +
          '╰ ' + P + 'liedetect  ' + P + 'manipulate  ' + P + 'influence\n' +
          '╰ ' + P + 'warmup  ' + P + 'conversation  ' + P + 'ghostreply\n' +
          '╰ ' + P + 'decode  ' + P + 'predict  ' + P + 'redalert\n\n' +

          '🧘 *PERSONAL*\n' +
          '╰ ' + P + 'journal  ' + P + 'myjournal  ' + P + 'motivate\n' +
          '╰ ' + P + 'vent  ' + P + 'affirmation  ' + P + 'sentiment\n\n' +

          '🔐 *ADMIN*\n' +
          '╰ ' + P + 'ban  ' + P + 'unban  ' + P + 'setprefix\n' +
          '╰ ' + P + 'addkeyword  ' + P + 'delkeyword  ' + P + 'logs\n\n' +

          '▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n' +
          '👑 *Owner:* xssrat  |  ⚡ *120+ cmds*',
      });
      break;
    }
    case 'menu_text': {
      await safeSend(sock, jid, {
        text:
          '░▒▓█ 🤖 *Gatiella Bot v2.0* █▓▒░\n' +
          '▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n\n' +

          '🔧 *BASIC*\n' +
          '╰ ' + P + 'ping  ' + P + 'uptime  ' + P + 'info  ' + P + 'id\n' +
          '╰ ' + P + 'font\n' +
          '╰ ' + P + 'groupon  ' + P + 'groupoff\n\n' +

          '👥 *GROUP*\n' +
          '╰ ' + P + 'kick  ' + P + 'add  ' + P + 'promote  ' + P + 'demote\n' +
          '╰ ' + P + 'rename  ' + P + 'warn  ' + P + 'mute  ' + P + 'poll\n' +
          '╰ ' + P + 'tagall  ' + P + 'rules  ' + P + 'vote  ' + P + 'raffle\n' +
          '╰ ' + P + 'welcome  ' + P + 'antispam  ' + P + 'antilink\n' +
          '╰ ' + P + 'leaderboard  ' + P + 'inactive\n\n' +

          '🤖 *AI*\n' +
          '╰ ' + P + 'ask  ' + P + 'ai  ' + P + 'code  ' + P + 'imagine\n' +
          '╰ ' + P + 'summarize  ' + P + 'translate  ' + P + 'sentiment\n' +
          '╰ ' + P + 'story  ' + P + 'poem  ' + P + 'recipe  ' + P + 'debate\n' +
          '╰ ' + P + 'explain  ' + P + 'compare  ' + P + 'advice\n' +
          '╰ ' + P + 'chat  ' + P + 'persona  ' + P + 'clearchat\n\n' +

          '🎮 *FUN*\n' +
          '╰ ' + P + 'joke  ' + P + 'fact  ' + P + 'riddle  ' + P + 'trivia\n' +
          '╰ ' + P + '8ball  ' + P + 'horoscope  ' + P + 'coinflip\n' +
          '╰ ' + P + 'truth  ' + P + 'dare  ' + P + 'spicydare\n' +
          '╰ ' + P + 'spin  ' + P + 'rps\n\n' +

          '💕 *FLIRT*\n' +
          '╰ ' + P + 'seduce  ' + P + 'pickup  ' + P + 'compliment\n' +
          '╰ ' + P + 'rizz  ' + P + 'roast  ' + P + 'couple  ' + P + 'wyr\n' +
          '╰ ' + P + 'lovemeter  ' + P + 'shipname  ' + P + 'loveadvice\n' +
          '╰ ' + P + 'suggestreply\n\n' +

          '🌍 *INFO & TOOLS*\n' +
          '╰ ' + P + 'weather  ' + P + 'news  ' + P + 'crypto\n' +
          '╰ ' + P + 'stock  ' + P + 'define  ' + P + 'ip\n' +
          '╰ ' + P + 'calc  ' + P + 'convert  ' + P + 'time\n' +
          '╰ ' + P + 'qr  ' + P + 'password\n\n' +

          '✍️ *WRITING*\n' +
          '╰ ' + P + 'grammar  ' + P + 'rewrite  ' + P + 'emoji\n' +
          '╰ ' + P + 'bio  ' + P + 'caption  ' + P + 'name\n' +
          '╰ ' + P + 'summarizelink\n\n' +

          '📝 *PRODUCTIVITY*\n' +
          '╰ ' + P + 'remind  ' + P + 'todo  ' + P + 'note\n' +
          '╰ ' + P + 'schedule  ' + P + 'broadcast  ' + P + 'stats\n' +
          '╰ ' + P + 'autoreply\n\n' +

          '💼 *PROFESSIONAL*\n' +
          '╰ ' + P + 'meeting  ' + P + 'email  ' + P + 'cv\n' +
          '╰ ' + P + 'invoice  ' + P + 'quiz  ' + P + 'coverlettr\n\n' +

          '🕵️ *SPECIAL*\n' +
          '╰ ' + P + 'nightmode  ' + P + 'ghostmode  ' + P + 'busy\n' +
          '╰ ' + P + 'spy  ' + P + 'stalk  ' + P + 'mood  ' + P + 'rate\n' +
          '╰ ' + P + 'confess  ' + P + 'anonymous  ' + P + 'recall\n' +
          '╰ ' + P + 'scheduledm  ' + P + 'autodelete\n' +
          '╰ ' + P + 'stalkwatch  ' + P + 'myonline\n' +
          '╰ ' + P + 'whoviewed  ' + P + 'readreceipt  ' + P + 'lasttexted\n' +
          '╰ ' + P + 'warmup  ' + P + 'conversation  ' + P + 'ghostreply\n' +
          '╰ ' + P + 'chameleon  ' + P + 'disappear\n' +
          '╰ ' + P + 'pattern  ' + P + 'mood  ' + P + 'interest\n' +
          '╰ ' + P + 'expose  ' + P + 'liedetect  ' + P + 'manipulate\n' +
          '╰ ' + P + 'influence\n' +
          '╰ ' + P + 'phoneosint  ' + P + 'usersearch  ' + P + 'pastebin\n' +
          '╰ ' + P + 'anonymous  ' + P + 'ghostlist  ' + P + 'clone\n' +
          '╰ ' + P + 'autotyping  ' + P + 'fakeonline  ' + P + 'lastseen\n' +
          '╰ ' + P + 'fake  ' + P + 'impersonate  ' + P + 'stylemode\n' +
          '╰ ' + P + 'recallall  ' + P + 'mimic\n\n' +

          '🧠 *PERSONAL*\n' +
          '╰ ' + P + 'journal  ' + P + 'myjournal\n' +
          '╰ ' + P + 'motivate  ' + P + 'vent  ' + P + 'affirmation\n' +
          '╰ ' + P + 'daily\n\n' +

          '🔐 *ADMIN*\n' +
          '╰ ' + P + 'ban  ' + P + 'unban  ' + P + 'setprefix\n' +
          '╰ ' + P + 'addkeyword  ' + P + 'delkeyword  ' + P + 'logs\n\n' +

          '▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰▰\n' +
          '👑 *Owner:* xssrat  |  ⚡ *100+ cmds*',
      });
      break;
    }
  }
}

module.exports = { handleBasic };
