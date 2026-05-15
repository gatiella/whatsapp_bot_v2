const { getJID } = require('../utils/helpers');
const { setGlobalSetting, getGlobalSetting, addKeyword, deleteKeyword, listKeywords, getRecentLogs, banUser, unbanUser } = require('../db/database');
const config = require('../config');

async function handleAdmin(sock, msg, cmd, args) {
  const jid = getJID(msg);
  const sender = (msg.key.participant || msg.key.remoteJid).replace('@s.whatsapp.net', '');

  if (sender !== process.env.OWNER_NUMBER) {
    await sock.sendMessage(jid, { text: '❌ Admin commands are owner-only.' });
    return;
  }

  switch (cmd) {
    case 'setprefix': {
      const prefix = args[0];
      if (!prefix) { await sock.sendMessage(jid, { text: '❌ Usage: !setprefix <symbol>' }); return; }
      await setGlobalSetting('prefix', prefix);
      config.PREFIX = prefix;
      await sock.sendMessage(jid, { text: `✅ Prefix changed to *${prefix}*` });
      break;
    }
    case 'ban': {
      const number = args[0]?.replace(/[^0-9]/g, '');
      if (!number) { await sock.sendMessage(jid, { text: '❌ Usage: !ban <number>' }); return; }
      await banUser(number);
      await sock.sendMessage(jid, { text: `✅ Banned: ${number}` });
      break;
    }
    case 'unban': {
      const number = args[0]?.replace(/[^0-9]/g, '');
      if (!number) { await sock.sendMessage(jid, { text: '❌ Usage: !unban <number>' }); return; }
      await unbanUser(number);
      await sock.sendMessage(jid, { text: `✅ Unbanned: ${number}` });
      break;
    }
    case 'addkeyword': {
      const keyword = args[0];
      const reply = args.slice(1).join(' ');
      if (!keyword || !reply) { await sock.sendMessage(jid, { text: '❌ Usage: !addkeyword <word> <reply>' }); return; }
      await addKeyword(keyword.toLowerCase(), reply);
      await sock.sendMessage(jid, { text: `✅ Keyword added: *${keyword}* → ${reply}` });
      break;
    }
    case 'delkeyword': {
      const keyword = args[0];
      if (!keyword) { await sock.sendMessage(jid, { text: '❌ Usage: !delkeyword <word>' }); return; }
      await deleteKeyword(keyword.toLowerCase());
      await sock.sendMessage(jid, { text: `✅ Keyword removed: *${keyword}*` });
      break;
    }
    case 'keywords': {
      const keywords = await listKeywords();
      if (!keywords.length) { await sock.sendMessage(jid, { text: '📋 No keywords set.' }); return; }
      const lines = keywords.map(k => `• *${k.keyword}* → ${k.reply}`);
      await sock.sendMessage(jid, { text: `📋 *Auto-reply Keywords:*\n\n${lines.join('\n')}` });
      break;
    }
    case 'logs': {
      const logs = await getRecentLogs(10);
      if (!logs.length) { await sock.sendMessage(jid, { text: '📋 No logs yet.' }); return; }
      const lines = logs.map(l => `[${l.time}] ${l.jid.split('@')[0]}: ${l.text.slice(0, 40)}`);
      await sock.sendMessage(jid, { text: `📋 *Recent Logs:*\n\n${lines.join('\n')}` });
      break;
    }
  }
}

module.exports = { handleAdmin };
