const { getKeywordReply } = require('../db/database');
const { isNightModeActive } = require('../handlers/special');

const MODELS = [
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'deepseek/deepseek-v4-flash:free',
];

async function getAIReply(text, isNight = false, persona = null) {
  const system = persona || (isNight
    ? 'You are xssrat, a flirty and playful WhatsApp bot. It is late at night so be extra charming, witty and flirty. Keep replies short, fun and seductive. Max 2 sentences.'
    : 'You are xssrat, a helpful WhatsApp bot assistant. Keep replies short and friendly. Max 3 sentences.');

  for (const model of MODELS) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + process.env.OPENROUTER_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: text }
          ],
          max_tokens: 200,
        }),
      });
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content;
      if (reply) return reply;
    } catch (_) {}
  }
  return null;
}

async function checkAutoReply(sock, msg, text, jid) {
  // Ghost mode — read but never reply
  if (global.ghostMode?.[jid]) return;

  // Busy mode — auto reply with busy message
  const ownerNumber = process.env.OWNER_NUMBER || '';
  const busyMessage = global.busyMode?.[ownerNumber];
  if (busyMessage && !jid.endsWith('@g.us')) {
    for (let i = 0; i < 3; i++) {
      try {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        await sock.sendMessage(jid, { text: `🔴 *Auto-reply:*\n\n${busyMessage}` });
        return;
      } catch (_) {}
    }
    return;
  }

  // Spy mode — forward to owner DM
  if (global.spyMode?.[jid]) {
    const ownerJid = ownerNumber + '@s.whatsapp.net';
    const sender = msg.key.participant || msg.key.remoteJid;
    try {
      await sock.sendMessage(ownerJid, {
        text: `🕵️ *Spy Report*\n👤 From: @${sender.replace('@s.whatsapp.net', '')}\n💬 Message: ${text}`
      });
    } catch (_) {}
  }

  const reply = getKeywordReply(text);
  const persona = global.personas?.[jid] || null;
  const isNight = isNightModeActive(jid);
  const finalReply = reply || await getAIReply(text, isNight, persona);
  if (!finalReply) return;

  for (let i = 0; i < 5; i++) {
    try {
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
      await sock.sendMessage(jid, { text: finalReply });
      return;
    } catch (_) {}
  }
}

module.exports = { checkAutoReply };
