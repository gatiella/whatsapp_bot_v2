async function safeSend(sock, jid, content, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const sent = await sock.sendMessage(jid, content);
      if (sent?.key) {
        global.botMessages = global.botMessages || {};
        global.botMessages[jid] = global.botMessages[jid] || [];
        global.botMessages[jid].push(sent.key);
        // keep only last 200 per chat
        if (global.botMessages[jid].length > 200) global.botMessages[jid].shift();
      }
      return sent;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

module.exports = { safeSend };
