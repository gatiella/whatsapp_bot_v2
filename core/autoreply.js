const { getKeywordReply } = require('../db/database');
const { isNightModeActive } = require('../handlers/special');

const MODELS = [
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'deepseek/deepseek-v4-flash:free',
];

async function getAIReply(text, isNight = false) {
  const system = isNight
    ? 'You are xssrat, a flirty and playful WhatsApp bot. It is late at night so be extra charming, witty and flirty. Keep replies short, fun and seductive. Max 2 sentences.'
    : 'You are xssrat, a helpful WhatsApp bot assistant. Keep replies short and friendly. Max 3 sentences.';

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
  const reply = getKeywordReply(text);
  if (reply) {
    await new Promise(r => setTimeout(r, 1000));
    await sock.sendMessage(jid, { text: reply });
    return;
  }

  const isNight = isNightModeActive(jid);
  const aiReply = await getAIReply(text, isNight);
  if (!aiReply) return;

  for (let i = 0; i < 5; i++) {
    try {
      await new Promise(r => setTimeout(r, 2000 * (i + 1)));
      await sock.sendMessage(jid, { text: aiReply });
      return;
    } catch (_) {}
  }
}

module.exports = { checkAutoReply };
