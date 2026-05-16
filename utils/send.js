async function safeSend(sock, jid, content, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await sock.sendMessage(jid, content);
      return;
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

module.exports = { safeSend };
