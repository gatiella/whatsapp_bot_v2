const { getGroupSetting, isBanned } = require('../db/database');

const linkRegex = /(https?:\/\/|wa\.me|chat\.whatsapp\.com)/i;
const phoneRegex = /(\+?\d[\d\s\-]{8,}\d)/;

async function checkAntiSpam(sock, msg, text, jid) {
  const sender = msg.key.participant || msg.key.remoteJid;
  const number = sender.replace('@s.whatsapp.net', '');

  // Check if banned
  if (isBanned(number)) {
    await sock.sendMessage(jid, { text: `@${number} you are banned from using this bot.`, mentions: [sender] });
    return true;
  }

  const antilink = await getGroupSetting(jid, 'antilink');
  const antispam = await getGroupSetting(jid, 'antispam');

  if (antilink === 'on' && linkRegex.test(text)) {
    try {
      await sock.sendMessage(jid, {
        delete: msg.key,
      });
      await sock.sendMessage(jid, {
        text: `⚠️ @${number} links are not allowed in this group.`,
        mentions: [sender],
      });
    } catch (_) {}
    return true;
  }

  if (antispam === 'on' && phoneRegex.test(text)) {
    try {
      await sock.sendMessage(jid, { delete: msg.key });
      await sock.sendMessage(jid, {
        text: `⚠️ @${number} sharing phone numbers is not allowed here.`,
        mentions: [sender],
      });
    } catch (_) {}
    return true;
  }

  return false;
}

module.exports = { checkAntiSpam };
