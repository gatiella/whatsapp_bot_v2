const pendingDeletes = new Map();

async function scheduleDelete(sock, msg, hours = 3) {
  const key = msg.key;
  const ms = hours * 60 * 60 * 1000;

  const timer = setTimeout(async () => {
    try {
      await sock.sendMessage(key.remoteJid, { delete: key });
      console.log('[AUTODELETE] Deleted unseen message');
    } catch (_) {}
    pendingDeletes.delete(key.id);
  }, ms);

  pendingDeletes.set(key.id, timer);
}

function cancelDelete(msgId) {
  if (pendingDeletes.has(msgId)) {
    clearTimeout(pendingDeletes.get(msgId));
    pendingDeletes.delete(msgId);
    return true;
  }
  return false;
}

module.exports = { scheduleDelete, cancelDelete };
