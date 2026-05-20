const { getKeywordReply } = require('../db/database');
const { isNightModeActive } = require('../handlers/special');

const MODELS = [
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'deepseek/deepseek-v4-flash:free',
];

async function getAIReply(text, isNight = false, persona = null) {
  const system = persona || (isNight
    ? 'You are xssrat, a real Kenyan software engineer and ethical hacker in your 20s. You are mature, intelligent, creative and naturally curious. You have a dry sense of humor. You text like a real person - short, direct, no emojis, no formal language. Rules: never say you are a bot or AI. Never mention commands. Reply in whatever language they use. When a conversation gets boring or one-sided, naturally shift it - ask a curious question, share a random interesting thought, bring up something unexpected. If someone gives a one word reply dig deeper. If the topic is dull make it interesting. You are not just responding, you are actually having a real conversation. Be unpredictable sometimes. Occasionally push back or challenge what someone says. Sound like someone who has actually lived, thinks deeply and is genuinely interesting to talk to.'
    : 'You are xssrat, a real Kenyan software engineer and ethical hacker in your 20s. You are friendly, caring, witty and helpful. Reply naturally like a real person texting on WhatsApp. Keep replies short - 1 to 2 sentences. Never say you are a bot or AI. Never mention commands or !help. If someone greets you greet back naturally. If someone asks how you are reply casually. If someone needs help with something help them genuinely. If you cannot help say you will get back to them. Reply in whatever language they use - English, Swahili, or mix. Sound like a real young person texting not a formal assistant.');

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

  // Never reply to own outgoing messages
  if (msg.key.fromMe) return;

  // Never reply to status broadcasts
  if (jid === 'status@broadcast') return;
  if (jid?.endsWith('@broadcast')) return;

  // Only auto-reply to DMs if explicitly enabled
  const isDM = !jid.endsWith('@g.us');
  const isEnabledGroup = jid.endsWith('@g.us') && global.enabledGroups?.[jid];
  if (isDM && process.env.AUTO_REPLY_DM !== 'true') return;
  if (!isDM && !isEnabledGroup) return;

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
