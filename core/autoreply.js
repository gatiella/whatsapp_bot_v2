const { getKeywordReply } = require('../db/database');

const MODELS = [
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'deepseek/deepseek-v4-flash:free',
];

async function checkAutoReply(sock, msg, text, jid) {
  const reply = getKeywordReply(text);
  if (reply) {
    await sock.sendMessage(jid, { text: reply });
    return;
  }

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
            { role: 'system', content: 'You are xssrat, a helpful WhatsApp bot assistant. Keep replies short and friendly. Max 3 sentences.' },
            { role: 'user', content: text }
          ],
          max_tokens: 200,
        }),
      });
      const data = await response.json();
      const aiReply = data.choices?.[0]?.message?.content;
      if (aiReply) {
        await sock.sendMessage(jid, { text: aiReply });
        return;
      }
    } catch (_) {}
  }
}

module.exports = { checkAutoReply };
