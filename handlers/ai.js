const { getJID } = require('../utils/helpers');
const { safeSend } = require('../utils/send');

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const MODEL = 'google/gemma-4-31b-it:free';

async function askAI(prompt, system = 'You are a helpful assistant. Be concise.') {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + OPENROUTER_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt }
      ],
      max_tokens: 500,
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content || null;
}

async function handleAI(sock, msg, cmd, args) {
  const jid = getJID(msg);

  if (!OPENROUTER_KEY) {
    await safeSend(sock, jid, { text: '❌ Set OPENROUTER_API_KEY in .env to use AI commands.' });
    return;
  }

  const input = args.join(' ');

  if (!input) {
    await safeSend(sock, jid, { text: `❌ Usage: !${cmd} <your question>` });
    return;
  }

  await safeSend(sock, jid, { text: '🤖 Thinking...' });

  try {
    let reply;

    switch (cmd) {
      case 'ask':
      case 'ai':
        reply = await askAI(input);
        break;
      case 'summarize':
        reply = await askAI(input, 'Summarize the following text in 3-5 bullet points.');
        break;
      case 'translate':
        const [lang, ...rest] = args;
        reply = await askAI(rest.join(' '), `Translate the following text to ${lang}. Only return the translation.`);
        break;
      case 'code':
        reply = await askAI(input, 'You are a coding assistant. Provide clean, working code with brief explanation.');
        break;
      case 'sentiment':
        reply = await askAI(input, 'Analyze the sentiment of this text. Say if it is Positive, Negative, or Neutral and explain briefly.');
        break;
      case 'imagine':
        reply = await askAI(input, 'Describe in vivid detail what this image would look like. Be creative and descriptive in 3-4 sentences.');
        break;
      default:
        reply = await askAI(input);
    }

    if (reply) {
      await safeSend(sock, jid, { text: reply });
    } else {
      await safeSend(sock, jid, { text: '❌ AI did not respond. Try again.' });
    }
  } catch (err) {
    await safeSend(sock, jid, { text: '❌ AI error: ' + err.message });
  }
}

module.exports = { handleAI };
