function getJID(msg) {
  const jid = msg.key.remoteJid;
  const alt = msg.key.remoteJidAlt;
  // For DMs, prefer the @s.whatsapp.net version
  if (!jid.endsWith('@g.us')) {
    return alt || jid;
  }
  return jid;
}

function getMessageText(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    ''
  );
}

function getMessageType(msg) {
  if (!msg.message) return null;
  if (msg.message.conversation || msg.message.extendedTextMessage) return 'text';
  if (msg.message.imageMessage) return 'image';
  if (msg.message.videoMessage) return 'video';
  if (msg.message.audioMessage) return msg.message.audioMessage.ptt ? 'voice' : 'audio';
  if (msg.message.stickerMessage) return 'sticker';
  if (msg.message.documentMessage) return 'document';
  return null;
}

function getMentioned(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

async function react(sock, msg, emoji) {
  try {
    const jid = msg.key.remoteJidAlt || msg.key.remoteJid;
    await sock.sendMessage(jid, {
      react: { text: emoji, key: msg.key },
    });
  } catch (_) {}
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

module.exports = { getJID, getMessageText, getMessageType, getMentioned, react, sleep };
