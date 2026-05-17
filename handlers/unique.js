const { getJID, getMessageText } = require('../utils/helpers');
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

// Global state
global.ghostMode = global.ghostMode || {};
global.busyMode = global.busyMode || {};
global.spyMode = global.spyMode || {};
global.personas = global.personas || {};
global.chatHistory = global.chatHistory || {};
global.scheduledDMs = global.scheduledDMs || [];
global.lastBotMessage = global.lastBotMessage || {};

async function handleUnique(sock, msg, cmd, args) {
  const jid = getJID(msg);
  const sender = msg.key.participant || msg.key.remoteJid;
  const input = args.join(' ');
  const isGroup = jid.endsWith('@g.us');
  const ownerNumber = process.env.OWNER_NUMBER || '';

  switch (cmd) {

    case 'stalk': {
      const number = args[0]?.replace(/[^0-9]/g, '');
      if (!number) { await safeSend(sock, jid, { text: '❌ Usage: !stalk <number>\nExample: !stalk 254712345678' }); return; }
      await safeSend(sock, jid, { text: '🔍 Stalking...' });
      try {
        const jidToCheck = number + '@s.whatsapp.net';
        const [result] = await sock.onWhatsApp(jidToCheck);
        if (!result?.exists) {
          await safeSend(sock, jid, { text: `❌ *+${number}* is not on WhatsApp.` });
          return;
        }
        try {
          const profile = await sock.fetchStatus(jidToCheck);
          const ppUrl = await sock.profilePictureUrl(jidToCheck, 'image').catch(() => null);
          let text = `🕵️ *Stalk Report*\n\n📱 Number: *+${number}*\n✅ On WhatsApp: Yes`;
          if (profile?.status) text += `\n📝 Status: _${profile.status}_`;
          if (profile?.setAt) text += `\n🕐 Last updated: ${new Date(profile.setAt).toLocaleDateString()}`;
          if (ppUrl) {
            await sock.sendMessage(jid, { image: { url: ppUrl }, caption: text });
          } else {
            text += '\n🖼️ Profile picture: Hidden';
            await safeSend(sock, jid, { text });
          }
        } catch {
          await safeSend(sock, jid, { text: `🕵️ *+${number}* is on WhatsApp but their profile is private.` });
        }
      } catch (err) {
        await safeSend(sock, jid, { text: '❌ Stalk failed: ' + err.message });
      }
      break;
    }

    case 'ghostmode': {
      const val = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(val)) { await safeSend(sock, jid, { text: '❌ Usage: !ghostmode on/off' }); return; }
      global.ghostMode[jid] = val === 'on';
      await safeSend(sock, jid, {
        text: val === 'on'
          ? '👻 *Ghost Mode ON* — I will read all messages but never reply.'
          : '👻 *Ghost Mode OFF* — Back to normal, I will reply again.'
      });
      break;
    }

    case 'busy': {
      const val = args[0]?.toLowerCase();
      if (val === 'off') {
        delete global.busyMode[ownerNumber];
        await safeSend(sock, jid, { text: '✅ Busy mode OFF — replying normally now.' });
        return;
      }
      const busyMessage = input || 'I am busy right now. I will get back to you soon!';
      global.busyMode[ownerNumber] = busyMessage;
      await safeSend(sock, jid, { text: `✅ *Busy Mode ON*\n\nAuto-reply: _"${busyMessage}"_\n\nTurn off with !busy off` });
      break;
    }

    case 'scheduledm': {
      // !scheduledm +254712345678 2h Hello there!
      const number = args[0]?.replace(/[^0-9]/g, '');
      const timeStr = args[1];
      const message = args.slice(2).join(' ');
      if (!number || !timeStr || !message) {
        await safeSend(sock, jid, { text: '❌ Usage: !scheduledm <number> <time> <message>\nExample: !scheduledm 254712345678 2h Hey there!' });
        return;
      }
      let ms = 0;
      if (/^\d+s$/.test(timeStr)) ms = parseInt(timeStr) * 1000;
      else if (/^\d+m$/.test(timeStr)) ms = parseInt(timeStr) * 60000;
      else if (/^\d+h$/.test(timeStr)) ms = parseInt(timeStr) * 3600000;
      if (!ms) { await safeSend(sock, jid, { text: '❌ Invalid time. Use 30m, 2h, etc.' }); return; }
      const targetJid = number + '@s.whatsapp.net';
      setTimeout(async () => {
        try {
          await sock.sendMessage(targetJid, { text: message });
          console.log('[SCHEDULEDM] Sent to', number);
        } catch (e) {
          console.log('[SCHEDULEDM] Failed:', e.message);
        }
      }, ms);
      const whenStr = ms < 3600000 ? Math.round(ms/60000) + ' minutes' : Math.round(ms/3600000) + ' hours';
      await safeSend(sock, jid, { text: `✅ Message scheduled to *+${number}* in *${whenStr}*\n\n_"${message}"_` });
      break;
    }

    case 'recall': {
      const lastMsg = global.lastBotMessage[jid];
      if (!lastMsg) { await safeSend(sock, jid, { text: '❌ No recent message to recall.' }); return; }
      try {
        await sock.sendMessage(jid, { delete: lastMsg });
        await safeSend(sock, jid, { text: '🗑️ Last message deleted.' });
        delete global.lastBotMessage[jid];
      } catch {
        await safeSend(sock, jid, { text: '❌ Could not recall message.' });
      }
      break;
    }

    case 'spy': {
      if (!isGroup) { await safeSend(sock, jid, { text: '❌ Spy mode only works in groups.' }); return; }
      const val = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(val)) { await safeSend(sock, jid, { text: '❌ Usage: !spy on/off' }); return; }
      global.spyMode[jid] = val === 'on' ? ownerNumber : null;
      await safeSend(sock, jid, {
        text: val === 'on'
          ? '🕵️ *Spy Mode ON* — All group messages will be forwarded to your DM.'
          : '🕵️ *Spy Mode OFF* — Stopped forwarding messages.'
      });
      break;
    }

    case 'rizz': {
      const theirMessage = input || 'hey';
      await safeSend(sock, jid, { text: '😏 Generating rizz...' });
      const reply = await askAI(theirMessage,
        'You are the ultimate rizz master. Generate a smooth, charming and witty reply to this message. ' +
        'Make it flirty but not creepy. Confident but not arrogant. Max 2 sentences.'
      );
      await safeSend(sock, jid, { text: reply ? `😏 *Rizz Reply:*\n\n"${reply}"` : '😏 "You must be a star, because I can\'t stop looking at you." ⭐' });
      break;
    }

    case 'suggestreply': {
      const theirMessage = input;
      if (!theirMessage) { await safeSend(sock, jid, { text: '❌ Usage: !suggestreply <their message>' }); return; }
      await safeSend(sock, jid, { text: '💭 Thinking of best reply...' });
      const reply = await askAI(theirMessage,
        'Suggest 3 different reply options to this message. Number them 1, 2, 3. ' +
        'Give one casual, one formal and one funny option. Keep each under 2 sentences.'
      );
      await safeSend(sock, jid, { text: reply ? `💬 *Suggested Replies:*\n\n${reply}` : '❌ Could not generate replies.' });
      break;
    }

    case 'persona': {
      const personaName = args[0]?.toLowerCase();
      const personas = {
        sassy: 'You are sassy, witty and a little dramatic. You use attitude and sass in every response. Keep it fun.',
        serious: 'You are professional, formal and serious. Give concise factual responses with no humor.',
        funny: 'You are hilarious and always make jokes. Add humor to everything you say.',
        flirty: 'You are charming and flirty. Compliment and tease in every response.',
        wise: 'You are a wise old sage. Give deep philosophical responses full of wisdom.',
        default: null,
      };
      if (!personaName || !personas[personaName]) {
        await safeSend(sock, jid, { text: `❌ Usage: !persona <type>\nOptions: ${Object.keys(personas).join(', ')}` });
        return;
      }
      global.personas[jid] = personas[personaName];
      await safeSend(sock, jid, {
        text: personaName === 'default'
          ? '✅ Persona reset to default.'
          : `✅ *Persona set to: ${personaName}* — Bot will now respond with that personality.`
      });
      break;
    }

    case 'chat': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !chat <message>\nStart a conversation with AI that remembers context.' }); return; }
      global.chatHistory[jid] = global.chatHistory[jid] || [];
      global.chatHistory[jid].push({ role: 'user', content: input });
      if (global.chatHistory[jid].length > 10) global.chatHistory[jid] = global.chatHistory[jid].slice(-10);
      const persona = global.personas[jid] || 'You are xssrat, a helpful and friendly WhatsApp bot assistant.';
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
                { role: 'system', content: persona },
                ...global.chatHistory[jid],
              ],
              max_tokens: 400,
            }),
          });
          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            global.chatHistory[jid].push({ role: 'assistant', content: reply });
            await safeSend(sock, jid, { text: `🤖 ${reply}` });
            return;
          }
        } catch (_) {}
      }
      await safeSend(sock, jid, { text: '❌ AI did not respond. Try again.' });
      break;
    }

    case 'clearchat': {
      delete global.chatHistory[jid];
      await safeSend(sock, jid, { text: '🗑️ Chat history cleared. Starting fresh!' });
      break;
    }

  }
}

module.exports = { handleUnique };
