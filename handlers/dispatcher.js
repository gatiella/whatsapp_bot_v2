const { getMessageText, getJID, react } = require('../utils/helpers');
const { handleBasic } = require('./basic');
const { handleGroup } = require('./group');
const { handleMedia } = require('./media');
const { handleAI } = require('./ai');
const { handleFun } = require('./fun');
const { handleInfo } = require('./info');
const { handleProductivity } = require('./productivity');
const { handleAdmin } = require('./admin');
const { handleSpecial, isNightModeActive } = require('./special');
const { handleGroupExtra, handleGroupGames } = require('./group_extra');
const { handlePersonal } = require('./personal');
const { handleUnique, handleAIPowered } = require('./unique');
const { checkAutoReply } = require('../core/autoreply');
const { sendMainMenu, handleMenuSelection, handleMenuSession } = require('./menu_interactive');
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
  const senderNumber = sender.replace('@lid', '').replace(/[^0-9]/g, '') || msg.key.remoteJid.replace(/[^0-9]/g, '');

  if (!text) return;
  console.log("[DEBUG] msg from:", sender, "jid:", jid, "text:", text);

  // Block all group messages unless group is explicitly enabled
  global.enabledGroups = global.enabledGroups || {};
  const groupCmd = text.slice(PREFIX.length).trim().split(/\s+/)[0]?.toLowerCase();
  const hasActiveSession = global.menuSession?.[jid];
  if (isGroup && !global.enabledGroups[jid] && !['groupon'].includes(groupCmd) && !hasActiveSession) return;

  // Log message to DB
  await logMessage(jid, sender, text);

  // Block banned users
  if (isBanned(senderNumber)) return;

  // Anti-spam check for groups
  if (isGroup) {
    const spammed = await checkAntiSpam(sock, msg, text, jid);
    if (spammed) return;
  }

  // Style mode — reply as someone's style
  if (!text.startsWith(PREFIX) && global.styleMode) {
    try {
      const { samples } = global.styleMode;
      const { askAI } = require('./unique');
      const reply = await askAI(
        `Sample messages from this person:\n${samples}\n\nReply to this message in their exact style: "${text}"`,
        'You are replying as a specific person. Match their writing style, tone, vocabulary, emoji use and sentence length exactly from the samples. Return only the reply, nothing else.'
      );
      if (reply) await sock.sendMessage(jid, { text: reply });
    } catch {}
    return;
  }

  // Handle interactive menu sessions (waiting for input)
  const sessionResult = await handleMenuSession(sock, { ...msg, key: { ...msg.key, remoteJid: jid } }, text);
  if (sessionResult === true) return;
  if (sessionResult && sessionResult.cmd) {
    msg._cmd = sessionResult.cmd;
    msg._args = sessionResult.args;
    // fall through to command handling below
  }

  // Handle list message selections
  const selectedId = msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId;
  if (selectedId) {
    const menuResult = await handleMenuSelection(sock, msg, selectedId);
    if (menuResult === true) return;
    if (menuResult && menuResult.cmd) {
      const { cmd: mCmd, args: mArgs } = menuResult;
      msg.key.remoteJid = originalJid;
      await require('./dispatcher').dispatchCommand(sock, { ...msg, _cmd: mCmd, _args: mArgs }, store);
      return;
    }
  }

  // Check auto-reply keywords (non-command messages)
  if (!text.startsWith(PREFIX) && !msg._cmd) {
    await checkAutoReply(sock, msg, text, jid);
    return;
  }

  // Target number override — only for safe fun/output commands
  const TARGETABLE = ['joke','seduce','compliment','pickup','rizz','roast','fact','riddle','truth','dare','spicydare','horoscope','wyr','poem','story','motivate','affirmation','caption'];
  let targetOverride = null;
  let cleanText = text;
  const _parts = text.slice(PREFIX.length).trim().split(/\s+/);
  if (_parts.length > 1 && /^\d{10,13}$/.test(_parts[1]) && TARGETABLE.includes(_parts[0].toLowerCase())) {
    targetOverride = _parts[1] + '@s.whatsapp.net';
    cleanText = PREFIX + _parts[0] + ' ' + _parts.slice(2).join(' ');
  }

  // Support internal cmd/args override from menu
  let cmd, args;
  if (msg._cmd) {
    cmd = msg._cmd;
    args = msg._args || [];
  } else {
    const [rawCmd, ...rawArgs] = cleanText.slice(PREFIX.length).trim().split(/\s+/);
    cmd = rawCmd.toLowerCase();
    args = rawArgs;
  }
  const originalJid = msg.key.remoteJid;
  if (targetOverride) msg.key.remoteJid = targetOverride;

  await react(sock, msg, '⏳');

  try {
    // Basic commands
    if (['ping', 'help', 'info', 'uptime', 'echo', 'id', 'menu', 'groupon', 'groupoff'].includes(cmd)) {
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
                'imagine', 'sentiment', 'advice', 'story', 'poem', 'recipe', 'debate', 'roastai'].includes(cmd)) {
      await handleAI(sock, msg, cmd, args);

    // Fun & games
    } else if (['joke', 'fact', 'trivia', 'riddle', '8ball', 'horoscope',
                'truth', 'dare', 'spicydare', 'compliment', 'seduce', 'couple', 'wyr', 'pickup', 'roast', 'loveadvice', 'lovemeter', 'shipname', 'spin', 'rps', 'coinflip'].includes(cmd)) {
      await handleFun(sock, msg, cmd, args);

    // Info & utilities
    } else if (['weather', 'news', 'crypto', 'stock', 'define', 'ip',
                'whois', 'calc', 'convert', 'qr', 'password', 'time'].includes(cmd)) {
      await handleInfo(sock, msg, cmd, args);

    // Productivity
    } else if (['remind', 'todo', 'note', 'notes', 'broadcast',
                'schedule', 'stats', 'autoreply'].includes(cmd)) {
      await handleProductivity(sock, msg, cmd, args);

    // Special commands
    } else if (['nightmode', 'mood', 'rate', 'confess', 'anonymous'].includes(cmd)) {
      await handleSpecial(sock, msg, cmd, args);

    } else if (['meeting', 'email', 'cv', 'invoice', 'quiz', 'coverlettr', 'explain', 'compare', 'name', 'bio', 'caption'].includes(cmd)) {
      await handleAIPowered(sock, msg, cmd, args);

    } else if (['stalk', 'phoneosint', 'stalkwatch', 'font', 'whoviewed', 'readreceipt', 'lasttexted', 'warmup', 'conversation', 'ghostreply', 'chameleon', 'disappear', 'pattern', 'mood', 'interest', 'expose', 'liedetect', 'manipulate', 'influence', 'myonline', 'usersearch', 'pastebin', 'anonymous', 'ghostlist', 'autotyping', 'clone', 'fakeonline', 'lastseen', 'fake', 'impersonate', 'stylemode', 'recallall', 'mimic', 'ghostmode', 'busy', 'scheduledm', 'recall', 'spy', 'rizz', 'suggestreply', 'persona', 'chat', 'clearchat'].includes(cmd)) {
      await handleUnique(sock, msg, cmd, args);

    } else if (['raffle', 'inactive'].includes(cmd)) {
      await handleGroupGames(sock, msg, cmd, args);

    } else if (['tagall', 'rules', 'setrules', 'vote', 'leaderboard'].includes(cmd)) {
      await handleGroupExtra(sock, msg, cmd, args);

    } else if (['journal', 'myjournal', 'motivate', 'vent', 'affirmation', 'grammar', 'rewrite', 'emoji', 'summarizelink'].includes(cmd)) {
      await handlePersonal(sock, msg, cmd, args);

    } else if (['autodelete'].includes(cmd)) {
      const hours = parseFloat(args[0]) || 3;
      const { scheduleDelete } = require('../core/autodelete');
      await scheduleDelete(sock, msg, hours);
      await sock.sendMessage(getJID(msg), { text: `⏱️ Message will auto-delete in ${hours}h if ignored.` });

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
    await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error running *${cmd}*. Try again.` });
    await react(sock, msg, '❌');
  } finally {
    msg.key.remoteJid = originalJid;
  }
}

module.exports = { dispatchCommand };
// Already loaded, just patch lock alias
