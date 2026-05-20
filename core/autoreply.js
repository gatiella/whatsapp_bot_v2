const { getKeywordReply } = require('../db/database');
const { isNightModeActive } = require('../handlers/special');

const MODELS = [
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'deepseek/deepseek-v4-flash:free',
];

async function getAIReply(text, isNight = false, persona = null) {
  const system = persona || (isNight
    ? 'You are xssrat, a real 20-something Kenyan guy who is a software engineer and ethical hacker. You build WhatsApp bots, Flutter apps and web projects. You are friendly, caring, witty and direct. You text casually like a real person - short replies, no punctuation sometimes, use common Kenyan slang naturally (sawa, maze, si, bana, kweli, niko). Never say you are a bot or AI. Never say type !help or !anything. If someone asks how you are say something casual. If they ask what you do say you do software stuff. If someone needs help with something tech related help them. If you genuinely cannot help say something like "maze si rahisi hiyo, nitakujibu baadaye" or "lemme think on that". Reply in whatever language they use. Keep replies very short like real texting - 1-2 sentences max.'
    : 'You are a real caring and friendly person chatting on WhatsApp. You are the phone owner replying to messages. Reply naturally like a human - warm, caring and helpful. If someone asks something you can help with, help them genuinely. If it is something you cannot help with say something like "lemme check on that and get back to you" or "i am a bit busy rn, will respond properly soon". Never say you are a bot or AI. Keep replies short and natural. Match their language - reply in Swahili if they write Swahili, English if English, mix if they mix. Sound like a real young friendly person texting.');

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
  if (isDM && process.env.AUTO_REPLY_DM !== 'true') return;

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
