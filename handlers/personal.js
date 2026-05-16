const { getJID } = require('../utils/helpers');
const { safeSend } = require('../utils/send');

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const MODELS = [
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'deepseek/deepseek-v4-flash:free',
];

async function askAI(prompt, system) {
  for (const model of MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + OPENROUTER_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt }
          ],
          max_tokens: 400,
        }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content;
      if (reply) return reply;
    } catch (_) {}
  }
  return null;
}

global.journals = global.journals || {};

const affirmations = [
  "You are enough. You have always been enough. 💫",
  "Today is full of possibilities. Go get them! 🚀",
  "You are stronger than you think and braver than you feel. 💪",
  "Everything you need is already inside you. ✨",
  "You are worthy of love, success and happiness. 💝",
  "Your potential is limitless. Never stop growing. 🌱",
  "You are making progress even when you can't see it. 👣",
  "Today I choose joy, peace and abundance. 🌈",
  "I am capable of amazing things. Watch me. 🔥",
  "Every day is a fresh start. Make it count. ☀️",
];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function handlePersonal(sock, msg, cmd, args) {
  const jid = getJID(msg);
  const sender = msg.key.participant || msg.key.remoteJid;
  const input = args.join(' ');

  switch (cmd) {

    case 'journal': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !journal <your entry>' }); return; }
      global.journals[sender] = global.journals[sender] || [];
      const entry = { text: input, date: new Date().toLocaleString() };
      global.journals[sender].push(entry);
      await safeSend(sock, jid, { text: `📔 *Journal Entry Saved*\n\n_"${input}"_\n\n🕐 ${entry.date}` });
      break;
    }

    case 'myjournal': {
      const entries = global.journals[sender];
      if (!entries?.length) { await safeSend(sock, jid, { text: '📔 No journal entries yet. Use !journal <text> to add one.' }); return; }
      const last5 = entries.slice(-5).reverse();
      const lines = last5.map((e, i) => `${i + 1}. [${e.date}]\n_"${e.text}"_`);
      await safeSend(sock, jid, { text: `📔 *Your Journal (Last 5 entries):*\n\n${lines.join('\n\n')}` });
      break;
    }

    case 'motivate': {
      await safeSend(sock, jid, { text: '💭 Getting your motivation...' });
      const topic = input || 'life and success';
      const reply = await askAI(topic,
        'You are an energetic and passionate life coach. Give powerful, motivating advice that makes people feel unstoppable. ' +
        'Be direct, inspiring and emotional. Max 4 sentences. Use emojis.'
      );
      await safeSend(sock, jid, { text: reply || '🔥 You are unstoppable! Keep going, the world needs what you have! 💪' });
      break;
    }

    case 'vent': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !vent <whats on your mind>' }); return; }
      await safeSend(sock, jid, { text: '🫂 I am here for you...' });
      const reply = await askAI(input,
        'You are a compassionate and empathetic listener. The user needs to vent. ' +
        'Listen with full empathy, validate their feelings, and offer gentle comfort. ' +
        'Do not give unsolicited advice unless they ask. Be warm, kind and understanding. Max 4 sentences.'
      );
      await safeSend(sock, jid, { text: reply || '🫂 I hear you. Your feelings are completely valid. You are not alone in this. 💕' });
      break;
    }

    case 'affirmation':
      await safeSend(sock, jid, { text: `✨ *Daily Affirmation:*\n\n${rand(affirmations)}` });
      break;

    case 'grammar': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !grammar <text>' }); return; }
      await safeSend(sock, jid, { text: '✏️ Fixing grammar...' });
      const reply = await askAI(input,
        'Fix the grammar and spelling of this text. Only return the corrected text, nothing else. Keep the same meaning and tone.'
      );
      await safeSend(sock, jid, { text: reply ? `✅ *Corrected:*\n\n${reply}` : '❌ Could not fix grammar.' });
      break;
    }

    case 'rewrite': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !rewrite <text>' }); return; }
      const style = args[0]?.toLowerCase();
      const textToRewrite = args.slice(1).join(' ') || input;
      await safeSend(sock, jid, { text: '✏️ Rewriting...' });
      const reply = await askAI(textToRewrite,
        `Rewrite this text to sound more ${style === 'casual' ? 'casual and friendly' : 'professional and polished'}. Only return the rewritten text.`
      );
      await safeSend(sock, jid, { text: reply ? `✅ *Rewritten:*\n\n${reply}` : '❌ Could not rewrite.' });
      break;
    }

    case 'emoji': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !emoji <text>' }); return; }
      const reply = await askAI(input,
        'Add relevant and fun emojis to this text to make it more expressive. Only return the text with emojis added, nothing else.'
      );
      await safeSend(sock, jid, { text: reply || input });
      break;
    }

    case 'summarizelink': {
      const url = args[0];
      if (!url) { await safeSend(sock, jid, { text: '❌ Usage: !summarizelink <url>' }); return; }
      await safeSend(sock, jid, { text: '🔍 Fetching and summarizing...' });
      try {
        const res = await fetch(url);
        const html = await res.text();
        const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 3000);
        const reply = await askAI(text, 'Summarize this webpage content in 5 bullet points. Be concise and clear.');
        await safeSend(sock, jid, { text: reply ? `📄 *Summary:*\n\n${reply}` : '❌ Could not summarize.' });
      } catch {
        await safeSend(sock, jid, { text: '❌ Could not fetch the URL.' });
      }
      break;
    }

  }
}

module.exports = { handlePersonal };
