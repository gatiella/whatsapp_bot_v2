const { getMessageText, getJID, react } = require('../utils/helpers');
const { handleBasic } = require('./basic');
const { handleGroup } = require('./group');
const { handleMedia } = require('./media');
const { handleAI } = require('./ai');
const { handleFun } = require('./fun');
const { handleInfo } = require('./info');
const { handleProductivity } = require('./productivity');
const { handleAdmin } = require('./admin');
const { checkAutoReply } = require('../core/autoreply');
const { checkAntiSpam } = require('../core/antispam');
const { logMessage, isBanned } = require('../db/database');
const logger = require('../utils/logger');
const config = require('../config');

const PREFIX = config.PREFIX || '!';

async function dispatchCommand(sock, msg, store) {
  const jid = getJID(msg);
  const text = getMessageText(msg);
  const isGroup = jid.endsWith('@g.us');
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderNumber = sender.replace(/[^0-9]/g, '');

  if (!text) return;
  console.log("[DEBUG] msg from:", sender, "jid:", jid, "text:", text);

  // Log message to DB
  await logMessage(jid, sender, text);

  // Block banned users
  if (isBanned(senderNumber)) return;

  // Anti-spam check for groups
  if (isGroup) {
    const spammed = await checkAntiSpam(sock, msg, text, jid);
    if (spammed) return;
  }

  // Check auto-reply keywords (non-command messages)
  if (!text.startsWith(PREFIX)) {
    await checkAutoReply(sock, msg, text, jid);
    return;
  }

  const [rawCmd, ...args] = text.slice(PREFIX.length).trim().split(/\s+/);
  const cmd = rawCmd.toLowerCase();

  await react(sock, msg, '⏳');

  try {
    // Basic commands
    if (['ping', 'help', 'info', 'uptime', 'echo', 'id'].includes(cmd)) {
      await handleBasic(sock, msg, cmd, args);

    // Group management
    } else if (['kick', 'add', 'promote', 'demote', 'rename', 'members',
                'welcome', 'antispam', 'antilink', 'poll', 'warn', 'mute'].includes(cmd)) {
      await handleGroup(sock, msg, cmd, args);

    // Media tools
    } else if (['sticker', 'toimg', 'ytdl', 'igdl', 'ttdl', 'compress',
                'ocr', 'meme', 'gif', 'audio'].includes(cmd)) {
      await handleMedia(sock, msg, cmd, args);

    // AI features
    } else if (['ask', 'ai', 'summarize', 'translate', 'code',
                'imagine', 'sentiment'].includes(cmd)) {
      await handleAI(sock, msg, cmd, args);

    // Fun & games
    } else if (['joke', 'fact', 'trivia', 'riddle', '8ball', 'horoscope',
                'truth', 'dare', 'spin', 'rps', 'coinflip'].includes(cmd)) {
      await handleFun(sock, msg, cmd, args);

    // Info & utilities
    } else if (['weather', 'news', 'crypto', 'stock', 'define', 'ip',
                'whois', 'calc', 'convert', 'qr', 'password', 'time'].includes(cmd)) {
      await handleInfo(sock, msg, cmd, args);

    // Productivity
    } else if (['remind', 'todo', 'note', 'notes', 'broadcast',
                'schedule', 'stats', 'autoreply'].includes(cmd)) {
      await handleProductivity(sock, msg, cmd, args);

    // Admin only
    } else if (['setprefix', 'setlang', 'setautoreply', 'ban', 'unban',
                'addkeyword', 'delkeyword', 'keywords', 'logs'].includes(cmd)) {
      await handleAdmin(sock, msg, cmd, args);

    } else {
      await sock.sendMessage(jid, {
        text: `❓ Unknown command: *${cmd}*\nType *${PREFIX}help* to see all commands.`,
      });
      await react(sock, msg, '❓');
      return;
    }

    await react(sock, msg, '✅');
  } catch (err) {
    logger.error(`Command error [${cmd}]:`, err);
    await sock.sendMessage(jid, { text: `❌ Error running *${cmd}*. Try again.` });
    await react(sock, msg, '❌');
  }
}

module.exports = { dispatchCommand };
// Already loaded, just patch lock alias
