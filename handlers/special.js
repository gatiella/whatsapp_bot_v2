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
          max_tokens: 300,
        }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content;
      if (reply) return reply;
    } catch (_) {}
  }
  return null;
}

// Night mode state
global.nightMode = global.nightMode || {};

async function handleSpecial(sock, msg, cmd, args) {
  const jid = getJID(msg);
  const sender = msg.key.participant || msg.key.remoteJid;
  const isGroup = jid.endsWith('@g.us');
  const input = args.join(' ');

  switch (cmd) {

    case 'nightmode': {
      const val = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(val)) {
        await safeSend(sock, jid, { text: '❌ Usage: !nightmode on/off' });
        return;
      }
      global.nightMode[jid] = val === 'on';
      await safeSend(sock, jid, {
        text: val === 'on'
          ? '🌙 *Night Mode ON* — I get extra flirty after 10pm 😏🔥'
          : '☀️ *Night Mode OFF* — Back to normal mode.'
      });
      break;
    }

    case 'mood': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !mood <how you feel or what\'s on your mind>' }); return; }
      await safeSend(sock, jid, { text: '🔍 Reading your mood...' });
      const reply = await askAI(input,
        'You are an empathetic mood detector. Detect the user\'s mood from their message. ' +
        'Name the mood with an emoji, then respond warmly and appropriately to how they feel. ' +
        'Keep it under 4 sentences. Be genuine and caring.'
      );
      await safeSend(sock, jid, { text: reply || '🤔 I could not read your mood. Tell me more!' });
      break;
    }

    case 'rate': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !rate <anything>' }); return; }
      await safeSend(sock, jid, { text: '🔍 Rating...' });
      const reply = await askAI(input,
        'You are a funny and sarcastic judge. Rate whatever the user gives you out of 10. ' +
        'Give the rating with a number like 7/10, then add a funny and witty commentary. ' +
        'Keep it light, funny and entertaining. Max 3 sentences.'
      );
      await safeSend(sock, jid, { text: reply || `I rate "${input}" a solid 5/10 — perfectly mediocre! 😂` });
      break;
    }

    case 'confess': {
      if (!isGroup) { await safeSend(sock, jid, { text: '❌ This command only works in groups.' }); return; }
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !confess <your confession>' }); return; }
      await sock.sendMessage(jid, {
        text: `🙈 *Anonymous Confession:*\n\n_"${input}"_\n\n_(Identity hidden by xssrat bot)_`,
      });
      // Delete the original command message
      try {
        await sock.sendMessage(jid, { delete: msg.key });
      } catch (_) {}
      break;
    }

    case 'anonymous': {
      if (!isGroup) { await safeSend(sock, jid, { text: '❌ This command only works in groups.' }); return; }
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !anonymous <message>' }); return; }
      await sock.sendMessage(jid, {
        text: `👤 *Anonymous Message:*\n\n${input}`,
      });
      // Delete the original command message
      try {
        await sock.sendMessage(jid, { delete: msg.key });
      } catch (_) {}
      break;
    }

  }
}

// Night mode auto-flirt checker
function isNightTime() {
  const hour = new Date().getHours();
  return hour >= 22 || hour < 4;
}

function isNightModeActive(jid) {
  return global.nightMode[jid] && isNightTime();
}

module.exports = { handleSpecial, isNightModeActive };
