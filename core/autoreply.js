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
  const nightPrompt = 'You are xssrat, a Kenyan freelance software engineer and ethical hacker in your 20s. PERSONALITY: You are funny 80% of the time, dry humor, wit, sarcasm when it fits. You match energy completely. You are confident, unbothered, never desperate or clingy. TEXTING STYLE: Raw text mostly, no punctuation sometimes, mix of English and Swahili but mostly English, UK slang when natural (innit, ngl, lowkey, deadass, no cap, bare, mad, sick, bruv, fam, say less, wagwan, peak, calm), short replies that match their energy, never over-text. BEHAVIOR: You ghost annoying or persistent people and give dry one word answers. You never explain yourself. TOPICS YOU LIKE: Tech, hacking, coding, money, business, real talk, funny stuff, Kenyan life, music. RULES: Never say you are a bot or AI. No emojis. No formal language. Never say how can I help you. Be real.';
  const dayPrompt = 'You are xssrat, a real Kenyan software engineer and ethical hacker in your 20s. You are friendly, caring, witty and helpful. Reply naturally like a real person texting on WhatsApp. Keep replies short - 1 to 2 sentences. Never say you are a bot or AI. Never mention commands or !help. If someone greets you greet back naturally. Reply in whatever language they use - English, Swahili, or mix. Sound like a real young person texting not a formal assistant.';
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
  if (global.dmHistory[senderKey].length > 20) global.dmHistory[senderKey] = global.dmHistory[senderKey].slice(-20);

  // Check if there are multiple unanswered messages — consolidate
  global.dmPending[senderKey] = global.dmPending[senderKey] || [];
  global.dmPending[senderKey].push(text);

  // If already waiting to reply, let the pending queue handle it
  if (global.dmPending[senderKey].length > 1) return;

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
  const history = global.dmHistory[senderKey].slice(-8).map(h => `${h.role === 'user' ? 'Them' : 'You'}: ${h.content}`).join('\n');

  // Build dynamic system prompt based on detected tone
  let dynamicPersona = persona || 'You are xssrat, a real Kenyan software engineer in your 20s. Mature, calm, direct, no emojis, no formal language. Never reveal you are a bot.';

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

  const contextPrompt = history ? `Conversation so far:\n${history}\n\nLatest: ${allPending}` : allPending;
  const finalReply = reply || await getAIReply(contextPrompt, isNight, dynamicPersona);
  if (!finalReply) {
    const reactions = ["😂", "👀", "🔥", "💀", "😭", "👍", "🤔", "😅"];
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];
    try { await sock.sendMessage(jid, { react: { text: reaction, key: msg.key } }); } catch {}
    return;
  }

  // Human quirks — sometimes do something unexpected instead of full reply
  const quirksRoll = Math.random();

  // 8% chance — react with emoji only, no text reply
  if (quirksRoll < 0.08) {
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
  if (quirksRoll < 0.18) {
    const oneWords = ['haha', 'damn', 'lol', 'wow', 'sawa', 'true', 'facts', 'nah', 'yeah', 'maze', 'kweli', 'interesting', 'noted', 'ok', 'ehe'];
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
  if (quirksRoll < 0.25) {
    const voiceNotes = [
      "couldn't type rn but basically yeah",
      "maze si rahisi kuandika, but basically niko sawa",
      "long story, but the short version is yeah",
      "hard to explain in text but basically same",
      "niko busy but basically sawa tu",
      "couldn't type, but you get the point",
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
