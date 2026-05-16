const { getKeywordReply } = require('../db/database');

async function checkAutoReply(sock, msg, text, jid) {
  // First check keywords
  const reply = getKeywordReply(text);
  if (reply) {
    await sock.sendMessage(jid, { text: reply });
    return;
  }

  // Fall back to AI
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + process.env.ANTHROPIC_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free',
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
    }
  } catch (err) {
    // Silently fail if AI is unavailable
  }
}

module.exports = { checkAutoReply };
