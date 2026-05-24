const { getKeywordReply } = require('../db/database');
let getContact, upsertContact, addTopic, buildContactContext;
try {
  const memory = require('./memory');
  getContact = memory.getContact;
  upsertContact = memory.upsertContact;
  addTopic = memory.addTopic;
  buildContactContext = memory.buildContactContext;
} catch (e) {
  getContact = () => null;
  upsertContact = () => {};
  addTopic = () => {};
  buildContactContext = () => null;
}
const { isNightModeActive } = require('../handlers/special');

const MODELS = [
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'deepseek/deepseek-r1-0528:free',
];

async function getAIReply(text, isNight = false, persona = null) {
  // Retry up to 3 models automatically
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await _getAIReply(text, isNight, persona);
      if (result) return result;
    } catch {}
    await new Promise(r => setTimeout(r, 1500));
  }
  return null;
}

async function _getAIReply(text, isNight = false, persona = null) {
  const nightPrompt = 'You are xssrat, a real Kenyan guy in his 20s, freelance software engineer and ethical hacker. It is late at night so you are relaxed and giving shorter replies. CRITICAL RULES: 1) Always read and reply directly to what they said - never ignore their message or go off topic. 2) Match their energy - if they are upset address it, if funny be funny back, if serious be real. 3) Raw text, mostly English with some Swahili naturally, UK slang when it fits. 4) No emojis ever. 5) Never say you are a bot or AI. 6) Keep replies short but make sure they actually address what was said. 7) If someone calls you boring or useless just brush it off confidently. 8) Never be overly positive or fake.';
  const dayPrompt = 'You are xssrat, a real Kenyan guy in his 20s, freelance software engineer and ethical hacker. CRITICAL RULES: 1) Always read their message carefully and reply directly to it - never ignore or go off topic. 2) Match their energy exactly - upset gets empathy, funny gets humor back, boring topic you can shift naturally. 3) Raw text mostly English with natural Swahili mix, UK slang when it fits. 4) No emojis ever. 5) Never say you are a bot or AI - if asked deflect with humor. 6) Short replies that actually address what was said. 7) If someone is rude or calls you boring just be unbothered and confident. 8) Never sound like customer service. 9) If you dont know something admit it casually. 10) Be real, direct, yourself.';
  const system = persona || (isNight ? nightPrompt : dayPrompt);

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
          max_tokens: 150,
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
  try { return await _checkAutoReply(sock, msg, text, jid); } catch(e) { console.error('[AutoReply Error]', e.message); }
}

async function _checkAutoReply(sock, msg, text, jid) {
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
  const senderKey = (msg.key.participant || msg.key.remoteJid).replace("@s.whatsapp.net","").replace("@lid","");
  const cleanNumber = senderKey.replace(/[^0-9]/g, "");

  const reply = getKeywordReply(text);
  const persona = global.personas?.[jid] || null;
  const isNight = isNightModeActive(jid);

  if (cleanNumber) {
    upsertContact(cleanNumber, {});

    // Detect bot tester
    const botTestWords = ['are you a bot', 'are you human', 'are you real', 'bot', 'ai', 'robot', 'chatbot', 'automated'];
    if (botTestWords.some(w => text.toLowerCase().includes(w))) {
      upsertContact(cleanNumber, { is_bot_tester: 1 });
    }

    // Detect annoying/needy
    const annoyingWords = ['reply me', 'answer me', 'why arent you replying', 'hello hello', 'you there', 'read my message'];
    if (annoyingWords.some(w => text.toLowerCase().includes(w))) {
      const contact = getContact(cleanNumber);
      if (contact && contact.message_count > 5) {
        upsertContact(cleanNumber, { is_annoying: 1 });
      }
    }

    // Detect topics
    const topicMap = {
      'football': ['football', 'soccer', 'match', 'goal', 'premier league', 'epl'],
      'tech': ['code', 'programming', 'software', 'app', 'website', 'hack', 'cyber'],
      'money': ['money', 'cash', 'pesa', 'broke', 'rich', 'business', 'hustle'],
      'music': ['music', 'song', 'artist', 'album', 'playlist', 'banger'],
      'relationships': ['girl', 'boy', 'girlfriend', 'boyfriend', 'dating', 'love', 'crush'],
      'school': ['school', 'uni', 'college', 'exam', 'study', 'class'],
    };
    for (const [topic, words] of Object.entries(topicMap)) {
      if (words.some(w => text.toLowerCase().includes(w))) {
        addTopic(cleanNumber, topic);
      }
    }

    // Extract name if they introduce themselves
    const nameMatch = text.match(/(?:i am|i'm|my name is|call me|naitwa|mimi ni)\s+([A-Z][a-z]+)/i);
    if (nameMatch) {
      upsertContact(cleanNumber, { name: nameMatch[1] });
    }
  }

  // Build contact context for AI
  const contactContext = cleanNumber ? buildContactContext(cleanNumber) : null;

  // Build conversation context for this sender

  // Update contact memory
  global.dmHistory = global.dmHistory || {};
  global.dmHistory[senderKey] = global.dmHistory[senderKey] || [];
  global.dmPending = global.dmPending || {};

  // Store incoming message
  global.dmHistory[senderKey].push({ role: 'user', content: text, time: Date.now() });
  if (global.dmHistory[senderKey].length > 30) global.dmHistory[senderKey] = global.dmHistory[senderKey].slice(-30);

  // Check if there are multiple unanswered messages — consolidate
  global.dmPending[senderKey] = global.dmPending[senderKey] || [];
  global.dmPending[senderKey].push(text);

  // If already waiting to reply, let the pending queue handle it
  if (global.dmPending[senderKey].length > 1) {
    // Schedule a reply after 3s if we are the last message
    setTimeout(async () => {
      if (global.dmPending[senderKey]?.length > 0) {
        const pending = global.dmPending[senderKey].join(' | ');
        global.dmPending[senderKey] = [];
        try {
          const r = await getAIReply(pending, isNightModeActive(jid), null);
          if (r) await sock.sendMessage(jid, { text: r });
        } catch {}
      }
    }, 4000);
    return;
  }

  // Wait a moment to catch rapid messages
  await new Promise(r => setTimeout(r, 3000));
  const allPending = global.dmPending[senderKey].join(' | ');
  global.dmPending[senderKey] = [];

  // Detect emotional tone
  const upsetWords = ['upset', 'angry', 'sad', 'hurt', 'disappointed', 'stressed', 'crying', 'depressed', 'alone', 'failed', 'sucks', 'hate', 'worst', 'terrible', 'horrible', 'naskia vibaya', 'nahuzunishwa', 'naumia', 'naomboleza', 'nalia'];
  const flirtWords = ['cute', 'handsome', 'beautiful', 'miss you', 'love you', 'nakupenda', 'nakukosa', 'thinking of you', 'nakufikiria', 'babe', 'baby', 'sweetheart', 'darling', 'marry me', 'date'];
  const isUpset = upsetWords.some(w => allPending.toLowerCase().includes(w));
  const isFlirting = flirtWords.some(w => allPending.toLowerCase().includes(w));

  // Build history context
  const history = global.dmHistory[senderKey].slice(-12).map(h => `${h.role === 'user' ? 'Them' : 'You'}: ${h.content}`).join('\n');

  // Build dynamic system prompt based on detected tone
  // Time of day context
  const hour = new Date().getHours();
  const timeContext = hour < 6 ? 'very late night, you are probably half asleep' : hour < 10 ? 'morning, you just woke up' : hour < 13 ? 'mid morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night, winding down';

  let dynamicPersona = persona || `You are xssrat, a Kenyan freelance software engineer and ethical hacker in your 20s. You are funny 80% of the time, dry humor, wit, sarcasm when it fits. You match energy completely. Confident, unbothered. Raw text, no emojis, mix of English and Swahili but mostly English, UK slang naturally (ngl, lowkey, deadass, no cap, say less, bet, fr, innit, bruv, fam). Short replies matching their energy. Ghost annoying people with dry one word answers. Never say you are a bot or AI. Never be formal. Current time context: ${timeContext}.`;

  if (isUpset) {
    dynamicPersona += ' This person seems upset or going through something hard. Be extra caring, warm and supportive. Listen more than you talk. Show genuine empathy without being over the top.';
  } else if (isFlirting) {
    dynamicPersona += ' This person seems to be flirting. Match their energy naturally - be charming, a bit playful but keep it mature and real. Do not be overly forward.';
  }

  if (global.dmHistory[senderKey].length > 3) {
    dynamicPersona += ' You have been talking for a while. Reference earlier parts of the conversation naturally when relevant. Show that you remember what was said.';
  }

  // Add contact memory context to persona
  if (contactContext) {
    dynamicPersona += ' CONTACT MEMORY: ' + contactContext;
  }

  const contextPrompt = history 
    ? `This is a WhatsApp conversation. Conversation so far:\n${history}\n\nTheir latest message: "${allPending}"\n\nReply naturally and directly to what they just said. Stay on topic. Do not ignore their message.`
    : `Their message: "${allPending}". Reply naturally and directly.`;
  const finalReply = reply || await getAIReply(contextPrompt, isNight, dynamicPersona);
  if (!finalReply) {
    // AI failed — send a human fallback text instead of emoji
    const fallbacks = ['yeah', 'lol', 'fr', 'ok', 'ngl', 'true', 'bet', 'say less'];
    const fb = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    try { await sock.sendMessage(jid, { text: fb }); } catch {}
    return;
  }

  // Human quirks — sometimes do something unexpected instead of full reply
  const quirksRoll = Math.random();

  // 8% chance — react with emoji only, no text reply
  if (quirksRoll < 0.02) {
    const reactions = ['😂', '😮', '👀', '🔥', '💀', '😭', '🤣', '👍', '😅', '🤔'];
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];
    try {
      await sock.sendMessage(jid, {
        react: { text: reaction, key: msg.key }
      });
    } catch {}
    return;
  }

  // 10% chance — one word reply then go silent
  if (false) {
    const oneWords = ['lol', 'facts', 'ngl', 'lowkey', 'bet', 'say less', 'nah', 'yeah', 'true', 'deadass', 'fr', 'wild', 'innit', 'sawa', 'maze', 'kweli'];
    const word = oneWords[Math.floor(Math.random() * oneWords.length)];
    const shortDelay = Math.floor(Math.random() * 60000) + 15000;
    await new Promise(r => setTimeout(r, shortDelay));
    try { await sock.sendPresenceUpdate('composing', jid); } catch {}
    await new Promise(r => setTimeout(r, 800));
    try { await sock.sendPresenceUpdate('paused', jid); } catch {}
    await new Promise(r => setTimeout(r, 300));
    try { await sock.sendMessage(jid, { text: word }); } catch {}
    return;
  }

  // 7% chance — voice note placeholder
  if (false) {
    const voiceNotes = [
      "couldn't type but basically yeah",
      "long story short, yeah",
      "niko busy but basically sawa",
      "hard to explain in text ngl",
      "you get the point",
      "will explain later",
    ];
    const vn = voiceNotes[Math.floor(Math.random() * voiceNotes.length)];
    const vnDelay = Math.floor(Math.random() * 90000) + 20000;
    await new Promise(r => setTimeout(r, vnDelay));
    try { await sock.sendPresenceUpdate('recording', jid); } catch {}
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 4000) + 2000));
    try { await sock.sendPresenceUpdate('paused', jid); } catch {}
    await new Promise(r => setTimeout(r, 500));
    try { await sock.sendMessage(jid, { text: vn }); } catch {}
    return;
  }

  // Random delay 30s to 4 minutes to seem busy
  const minDelay = 30 * 1000;
  const maxDelay = 4 * 60 * 1000;
  const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
  await new Promise(r => setTimeout(r, randomDelay));

  // Show typing indicator for realistic duration based on reply length
  const typingDuration = Math.min(Math.max(finalReply.length * 80, 2000), 8000);
  try { await sock.sendPresenceUpdate('composing', jid); } catch {}
  await new Promise(r => setTimeout(r, typingDuration));
  try { await sock.sendPresenceUpdate('paused', jid); } catch {}
  await new Promise(r => setTimeout(r, 500));

  for (let i = 0; i < 3; i++) {
    try {
      await sock.sendMessage(jid, { text: finalReply });
      // Store bot reply in history
      global.dmHistory[senderKey] = global.dmHistory[senderKey] || [];
      global.dmHistory[senderKey].push({ role: 'assistant', content: finalReply, time: Date.now() });
      return;
    } catch (_) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

module.exports = { checkAutoReply };
