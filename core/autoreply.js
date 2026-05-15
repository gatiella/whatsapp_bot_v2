const { getKeywordReply } = require('../db/database');

async function checkAutoReply(sock, msg, text, jid) {
  const reply = getKeywordReply(text);
  if (reply) {
    await sock.sendMessage(jid, { text: reply });
  }
}

module.exports = { checkAutoReply };
