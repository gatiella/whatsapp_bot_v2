function getJID(msg) {
  const jid = msg.key.remoteJid;
  if (jid && jid.endsWith('@lid')) {
    return jid.replace('@lid', '@s.whatsapp.net');
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

function getMentioned(msg) {
  return msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

async function react(sock, msg, emoji) {
  try {
    await sock.sendMessage(msg.key.remoteJid, {
      react: { text: emoji, key: msg.key },
    });
  } catch (_) {}
}

function sleep(ms) {
  return new Promise(res => setTimeout(res, ms));
}

module.exports = { getJID, getMessageText, getMentioned, react, sleep };
