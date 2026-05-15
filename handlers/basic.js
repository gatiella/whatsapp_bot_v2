const { getJID } = require('../utils/helpers');
const { getStats } = require('../db/database');
const config = require('../config');

const startTime = Date.now();

async function handleBasic(sock, msg, cmd, args) {
  const jid = getJID(msg);
  const PREFIX = config.PREFIX;

  switch (cmd) {
    case 'ping': {
      const t = Date.now();
      await sock.sendMessage(jid, { text: '🏓 Pong!' });
      await sock.sendMessage(jid, { text: `⚡ Latency: *${Date.now() - t}ms*` });
      break;
    }
    case 'uptime': {
      const ms = Date.now() - startTime;
      const h = Math.floor(ms / 3600000);
      const m = Math.floor(ms / 60000) % 60;
      const s = Math.floor(ms / 1000) % 60;
      await sock.sendMessage(jid, { text: `⏱️ Uptime: *${h}h ${m}m ${s}s*` });
      break;
    }
    case 'echo':
      if (!args.length) { await sock.sendMessage(jid, { text: '❌ Usage: !echo <text>' }); return; }
      await sock.sendMessage(jid, { text: args.join(' ') });
      break;
    case 'id':
      await sock.sendMessage(jid, { text: `📌 Chat ID:\n\`${jid}\`` });
      break;
    case 'info':
      await sock.sendMessage(jid, {
        text: `🤖 *xssrat Bot v2.0*\n\n` +
          `• Prefix: *${PREFIX}*\n• Platform: Node.js + Baileys\n• Features: 80+ commands\n\n` +
          `Type *${PREFIX}help* for all commands.`,
      });
      break;
    case 'help':
      await sock.sendMessage(jid, {
        text: `📋 *xssrat Bot — Commands*\n\n` +
          `*🔧 Basic*\n${PREFIX}ping, ${PREFIX}uptime, ${PREFIX}info, ${PREFIX}echo, ${PREFIX}id\n\n` +
          `*👥 Group (Admin)*\n${PREFIX}kick, ${PREFIX}add, ${PREFIX}promote, ${PREFIX}demote\n` +
          `${PREFIX}rename, ${PREFIX}members, ${PREFIX}welcome on/off\n` +
          `${PREFIX}antispam on/off, ${PREFIX}antilink on/off\n` +
          `${PREFIX}poll <q>|opt1|opt2, ${PREFIX}warn @user, ${PREFIX}mute\n\n` +
          `*🎬 Media*\n${PREFIX}sticker, ${PREFIX}toimg, ${PREFIX}ytdl <url>\n` +
          `${PREFIX}igdl <url>, ${PREFIX}ttdl <url>, ${PREFIX}ocr\n` +
          `${PREFIX}compress, ${PREFIX}meme, ${PREFIX}audio\n\n` +
          `*🤖 AI*\n${PREFIX}ask <q>, ${PREFIX}summarize <text>\n` +
          `${PREFIX}translate <lang> <text>, ${PREFIX}code <q>\n` +
          `${PREFIX}sentiment <text>, ${PREFIX}imagine <prompt>\n\n` +
          `*🎮 Fun*\n${PREFIX}joke, ${PREFIX}fact, ${PREFIX}trivia, ${PREFIX}riddle\n` +
          `${PREFIX}8ball <q>, ${PREFIX}horoscope <sign>\n` +
          `${PREFIX}truth, ${PREFIX}dare, ${PREFIX}spin, ${PREFIX}rps, ${PREFIX}coinflip\n\n` +
          `*🌍 Info & Utils*\n${PREFIX}weather <city>, ${PREFIX}news <topic>\n` +
          `${PREFIX}crypto <coin>, ${PREFIX}stock <sym>\n` +
          `${PREFIX}define <word>, ${PREFIX}ip <ip>\n` +
          `${PREFIX}calc <expr>, ${PREFIX}convert <val> <from> <to>\n` +
          `${PREFIX}qr <text>, ${PREFIX}password <len>, ${PREFIX}time <city>\n\n` +
          `*📝 Productivity*\n${PREFIX}remind <time> <msg>, ${PREFIX}todo add/list/done\n` +
          `${PREFIX}note save/get/list, ${PREFIX}broadcast <msg>\n` +
          `${PREFIX}schedule <cron> <msg>, ${PREFIX}stats\n\n` +
          `*🔐 Admin*\n${PREFIX}setprefix, ${PREFIX}ban, ${PREFIX}unban\n` +
          `${PREFIX}addkeyword, ${PREFIX}delkeyword, ${PREFIX}keywords, ${PREFIX}logs`,
      });
      break;
  }
}

module.exports = { handleBasic };
