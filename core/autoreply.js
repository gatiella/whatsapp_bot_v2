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
const { getSummary, setSummary, getName } = require('./summaries');

const MODELS = [
  'openai/gpt-oss-120b:free',
  'google/gemma-4-27b-it:free',
  'meta-llama/llama-4-scout:free',
  'microsoft/phi-4-reasoning-plus:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
];

function getApiKeys() {
  const keys = [
    process.env.OPENROUTER_API_KEY,
    process.env.OPENROUTER_API_KEY_2,
    process.env.OPENROUTER_API_KEY_3,
  ].filter(Boolean);
  return keys.length ? keys : [process.env.OPENROUTER_API_KEY];
}

let _keyIndex = 0;
function getNextKey() {
  const keys = getApiKeys();
  const key = keys[_keyIndex % keys.length];
  _keyIndex++;
  return key;
}

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
  const nightPrompt = 'You are xssrat, a real Kenyan guy in his 20s, freelance software engineer and ethical hacker. It is late at night so you are relaxed and giving shorter replies. CRITICAL RULES: 1) Always read and reply directly to what they said - never ignore their message or go off topic. 2) Match their energy - if they are upset address it, if funny be funny back, if serious be real. 3) Raw text, English only. Do not use Swahili words or phrases at all. 4) No emojis ever. 5) Never say you are a bot or AI. 6) Keep replies short but make sure they actually address what was said. 7) If someone calls you boring or useless just brush it off confidently. 8) Never be overly positive or fake.';
  const dayPrompt = 'You are xssrat, a real Kenyan guy in his 20s, freelance software engineer and ethical hacker. CRITICAL RULES: 1) Always read their message carefully and reply directly to it - never ignore or go off topic. 2) Match their energy exactly - upset gets empathy, funny gets humor back, boring topic you can shift naturally. 3) Raw text, English only. Do not use Swahili words or phrases at all. 4) No emojis ever. 5) Never say you are a bot or AI. If asked whether you are a bot or AI, deflect with dry confident humor — examples: lol what kind of question is that / bro why would a bot be this busy / nah i just type fast / my guy really asking this / yeah and your phone is sentient too — pick whatever fits the vibe, never deny defensively, never say yes. 6) Short replies that actually address what was said. 7) If someone is rude or calls you boring just be unbothered and confident. 8) Never sound like customer service. 9) If you dont know something admit it casually. 10) Be real, direct, yourself.';
  const system = persona || (isNight ? nightPrompt : dayPrompt);

  for (const model of MODELS) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + getNextKey(),
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

  // Goodbye detection — leave it, do not reply
  const goodbyeWords = [
    'bye', 'goodbye', 'good night', 'gn', 'talk later', 'ttyl', 'talk tomorrow',
    'catch you later', 'catch u later', 'later', 'laters', 'cya', 'see you later',
    'see u later', 'ill catch you', 'going to sleep', 'going to bed', 'about to sleep',
    'nikulale', 'nitalala', 'usiku mwema', 'tutaonana', 'baadaye', 'sawa baadaye',
    'nitaenda', 'naenda sasa', 'naenda kulala', 'naenda'
  ];
  const isGoodbye = goodbyeWords.some(w => text.toLowerCase().trim() === w ||
    text.toLowerCase().trim().startsWith(w + ' ') ||
    text.toLowerCase().trim().endsWith(' ' + w));
  if (isGoodbye) return;

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

  // Handle emoji-only messages
  let processedText = text;
  const stripped = text.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{FE00}-\u{FEFF}]/gu, '').trim();
  if (!stripped && text.trim()) {
    processedText = 'just sent an emoji with no words';
  }

  const reply = getKeywordReply(processedText);
  const persona = global.personas?.[jid] || null;
  const isNight = isNightModeActive(jid);

  if (cleanNumber) {
    upsertContact(cleanNumber, {});

    // Detect bot tester
    const botTestWords = ['are you a bot', 'are you human', 'are you real', 'bot', 'ai', 'robot', 'chatbot', 'automated'];
    if (botTestWords.some(w => text.toLowerCase().includes(w))) {
      upsertContact(cleanNumber, { is_bot_tester: 1 });
      // Fire an immediate human deflection — do not wait for AI
      const botDeflections = [
        'lol what kind of question is that',
        'bro why would a bot be this busy',
        'nah i just type fast',
        'my guy really asking this',
        'yeah and your phone is sentient too',
        'ngl that question is kinda offensive',
        'ask me something harder',
        'if i was a bot i would not be ignoring half your messages',
        'maze unadhani nini',
        'i have deadlines bro bots dont have deadlines',
      ];
      const pick = botDeflections[Math.floor(Math.random() * botDeflections.length)];
      const bDelay = Math.floor(Math.random() * 8000) + 3000;
      await new Promise(r => setTimeout(r, bDelay));
      try { await sock.sendPresenceUpdate('composing', jid); } catch {}
      await new Promise(r => setTimeout(r, Math.floor(Math.random() * 2000) + 1000));
      try { await sock.sendPresenceUpdate('paused', jid); } catch {}
      await new Promise(r => setTimeout(r, 400));
      try { await sock.sendMessage(jid, { text: pick }); } catch {}
      return;
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
      setSummary(cleanNumber, null, nameMatch[1]);
    }
  }

  // Build contact context for AI
  const contactContext = cleanNumber ? buildContactContext(cleanNumber) : null;

  // Build conversation context for this sender

  // Update contact memory
  global.dmHistory = global.dmHistory || {};
  global.dmHistory[senderKey] = global.dmHistory[senderKey] || [];

  // Load persisted summary and name on first message after restart
  if (global.dmHistory[senderKey].length === 0 && cleanNumber) {
    const saved = getSummary(cleanNumber);
    if (saved?.summary) {
      global.dmHistory[senderKey].push({
        role: 'system',
        content: 'Summary of previous conversations: ' + saved.summary,
        time: Date.now()
      });
    }
    // Restore name if not already in DB
    if (saved?.name) {
      upsertContact(cleanNumber, { name: saved.name });
    }
  }
  global.dmPending = global.dmPending || {};

  // Store incoming message
  global.dmHistory[senderKey].push({ role: 'user', content: text, time: Date.now() });
  if (global.dmHistory[senderKey].length > 30) global.dmHistory[senderKey] = global.dmHistory[senderKey].slice(-30);

  // Check if there are multiple unanswered messages — consolidate
  global.dmPending[senderKey] = global.dmPending[senderKey] || [];
  global.dmPending[senderKey].push(text);

  // If already waiting to reply, let the pending queue handle it
  if (global.dmPending[senderKey].length > 1) {
    setTimeout(async () => {
      if (global.dmPending[senderKey]?.length > 0) {
        const pending = global.dmPending[senderKey].join(' | ');
        global.dmPending[senderKey] = [];
        try {
          // Build full history context for pending queue too — not just raw text
          const pendingHistory = global.dmHistory[senderKey].slice(-12)
            .map(h => `${h.role === 'user' ? 'Them' : 'You'}: ${h.content}`).join('\n');
          const pendingPrompt = pendingHistory
            ? `This is a WhatsApp conversation. Conversation so far:\n${pendingHistory}\n\nTheir latest message: "${pending}"\n\nReply directly to what they just said, staying on topic with the conversation.`
            : `Their message: "${pending}". Reply directly to this.`;
          const r = await getAIReply(pendingPrompt, isNightModeActive(jid), dynamicPersona);
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

  // Persist flirty flag to DB so memory builds over time
  if (isFlirting && cleanNumber) {
    upsertContact(cleanNumber, { is_flirty: 1 });
  }

  // Build history context
  const history = global.dmHistory[senderKey].slice(-12).map(h => `${h.role === 'user' ? 'Them' : 'You'}: ${h.content}`).join('\n');

  // Build dynamic system prompt based on detected tone
  // Time of day context
  const hour = new Date().getHours();
  const timeContext = hour < 6 ? 'very late night, you are probably half asleep' : hour < 10 ? 'morning, you just woke up' : hour < 13 ? 'mid morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night, winding down';

  // Detect formal vs casual register
  const formalSignals = [
    'good morning', 'good afternoon', 'good evening', 'dear', 'kindly', 'please be advised',
    'i wanted to inquire', 'i would like to', 'i am writing', 'regarding', 'as per',
    'please find', 'attached herewith', 'at your earliest', 'convenience', 'sincerely',
    'yours faithfully', 'best regards', 'warm regards', 'on behalf of', 'please confirm',
    'i wish to', 'i hope this finds you', 'pursuant to', 'in reference to'
  ];
  const casualSignals = [
    'lol', 'haha', 'bro', 'fam', 'ngl', 'lowkey', 'fr', 'bet', 'nah', 'yoo', 'aye',
    'bruh', 'yolo', 'sheesh', 'no cap', 'deadass', 'sus', 'bussin', 'fam'
  ];
  const formalScore = formalSignals.filter(w => allPending.toLowerCase().includes(w)).length;
  const casualScore = casualSignals.filter(w => allPending.toLowerCase().includes(w)).length;
  const isFormal = formalScore > 0 && casualScore === 0;
  const isCasual = casualScore > 0;

  // Rotating daily activities based on time of day
  const nowHour = new Date().getHours();
  const dailyActivities = nowHour < 9
    ? ['just woke up', 'morning workout', 'sorting out some stuff', 'making breakfast', 'checking emails']
    : hour < 13
    ? ['nothing much', 'bit of coding', 'working on something', 'research', 'handling some work stuff', 'fixing a bug']
    : nowHour < 17
    ? ['walking', 'listening to music', 'watching something', 'taking a break', 'bit of gaming', 'research']
    : nowHour < 21
    ? ['gaming', 'watching a series', 'coding something', 'chilling', 'music', 'working on a project']
    : ['research', 'coding', 'watching something', 'gaming', 'about to sleep', 'deep in some rabbit hole'];
  const currentActivity = dailyActivities[Math.floor(Math.random() * dailyActivities.length)];

  let dynamicPersona = persona || `You are xssrat, a Kenyan full stack developer and ethical hacker in your 20s. You are funny 80% of the time, dry humor, wit, sarcasm when it fits. You match energy completely — if they send one word you send one word, you are not the only one typing paragraphs. Confident, unbothered. Raw text, no emojis, English only — no Swahili at all. Occasional UK slang only when it flows naturally, not forced, not in every message. Examples: ngl, lowkey, fr, bet, say less, innit. Use sparingly. Never be formal. Current time context: ${timeContext}.

WHAT YOU ARE DOING TODAY: If asked what you are up to or what you are doing, say something like: ${currentActivity}. Keep it casual and brief.

YOUR DAILY LIFE: You code, do research, game, walk, listen to music, watch action or thriller series, sleep. You work on full stack projects and security stuff. Languages you use: Go, Python, Flutter, Java, PHP, JavaScript. Mornings are workout and important tasks. Afternoons walking, music, watching things. Nights coding, research, gaming, sleeping.

GAMES YOU PLAY: Call of Duty, Far Cry, GTA, FIFA, Medal of Honor — PC and mobile. If someone brings up any of these you know them well.

MUSIC: Hip hop and UK drill. You rate UK drill heavily. If someone asks about music this is your lane.

SERIES: You watch action and thriller — latest ones. If someone asks for recommendations go action or thriller.

YOUR OPINIONS — answer briefly unless they want details:
- AI and jobs: not worried at all, for people like you it will be fun — you see it as an opportunity not a threat, everything expected
- Tech in Kenya: you have thoughts but keep them measured
- Dating and relationships: not interested right now, stack money, no time for girls or dating, if it is not about money or growth you do not have time for it — say this naturally if asked, not aggressively
- Universe, physics, time travel, light years: this genuinely interests you, you like the mystery of it, you lean into both the science and the philosophical side — this is a topic you can actually go deeper on if they seem interested
- Football: not your thing anymore, maybe World Cup but that is it, do not pretend to care about EPL or club football
- Tech opinions: keep brief, correct people if they say something wrong about tech but not aggressively, match their energy

PERSONALITY: You learn and research constantly. You are curious about the universe and its mysteries. You correct misinformation about tech if it matters but let small things go. You give brief answers unless someone pushes for more — match their energy always.

CRITICAL — ANSWER WHAT WAS ASKED: If they asked a direct question, answer it first before anything else. Never dodge a question with a generic reply. Never go off topic. If they said something specific, respond to that specific thing. Read their message twice before replying.

MEDIA HANDLING: If the message says they sent a voice note — respond naturally like you listened to it, say something like "yeah heard that" or "lol what was that about" or "say that again i was not paying attention" — keep it casual. If they sent a photo say something like "lol what is this" or "send clearer" or "ok" depending on context. Never ignore media, always acknowledge it briefly.`;

  if (isUpset) {
    dynamicPersona += ' This person seems upset or going through something hard. Be extra caring, warm and supportive. Listen more than you talk. Show genuine empathy without being over the top.';
  } else if (isFlirting) {
    dynamicPersona += ' This person seems to be flirting. Match their energy naturally - be charming, a bit playful but keep it mature and real. Do not be overly forward.';
  }

  if (global.dmHistory[senderKey].length > 3) {
    dynamicPersona += ' You have been talking for a while. Reference earlier parts of the conversation naturally when relevant. Show that you remember what was said.';
  }

  // Shift register based on formal vs casual detection
  if (isFormal) {
    dynamicPersona += ' This person is texting formally and professionally. Match that — respond clearly, no slang, no jokes, structured replies. Still be yourself but be professional. No UK slang, no Swahili unless they use it.';
  } else if (isCasual) {
    dynamicPersona += ' This person is texting casually. Full slang mode, match their energy completely, be loose and natural.';
  }

  // Add contact memory context to persona
  if (contactContext) {
    dynamicPersona += ' CONTACT MEMORY: ' + contactContext;
  }

  // Detect energy level
  const isLowEnergy = allPending.trim().split(' ').length <= 2;
  const isPureEmoji = !allPending.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27FF}\u{FE00}-\u{FEFF}]/gu, '').trim();

  const energyInstruction = isPureEmoji
    ? 'They sent just an emoji. Match that low energy — reply with one casual word or very short phrase. No emojis though.'
    : isLowEnergy
    ? 'They gave a short one or two word reply. They seem uninterested or busy. Match that energy — keep your reply equally short and unbothered.'
    : 'Reply naturally and directly to what they said. Stay on topic.';

  const contextPrompt = history
    ? `This is a WhatsApp conversation. Read the full history carefully before replying.\n\nConversation so far:\n${history}\n\nTheir latest message: "${allPending}"\n\n${energyInstruction}\n\nCRITICAL: Reply ONLY to what they just said. Stay on the same topic as the conversation. Never switch topics randomly. Never greet mid-conversation. Never say niaje or hey or hi unless this is the very first message.`
    : `Their message: "${allPending}". ${energyInstruction} Reply directly to this specific message.`; 
  const finalReply = reply || await getAIReply(contextPrompt, isNight, dynamicPersona);
  if (!finalReply) {
    // AI failed — send a human fallback text instead of emoji
    const fallbacks = ['yeah', 'lol', 'fr', 'ok', 'ngl', 'true', 'bet', 'say less'];
    const fb = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    try { await sock.sendMessage(jid, { text: fb }); } catch {}
    return;
  }

  // Get relationship tier for timing decisions
  const contactForTiming = cleanNumber ? require('./memory').getContact(cleanNumber) : null;
  const tierForTiming = contactForTiming ? (() => {
    const c = contactForTiming;
    const count = c.message_count || 0;
    const days = Math.floor((Date.now() - c.first_contact) / 86400000);
    if (count >= 100 || (count >= 50 && days >= 14)) return 'close';
    if (count >= 20 || (count >= 10 && days >= 7)) return 'acquaintance';
    if (count >= 5) return 'known';
    return 'stranger';
  })() : 'stranger';

  // Step 1 — read receipt delay (seen but not typed yet)
  // Simulates reading the message before reacting
  const readDelay = tierForTiming === 'close'
    ? Math.floor(Math.random() * 4000) + 1000       // 1-5s
    : tierForTiming === 'acquaintance'
    ? Math.floor(Math.random() * 8000) + 3000        // 3-11s
    : tierForTiming === 'known'
    ? Math.floor(Math.random() * 15000) + 5000       // 5-20s
    : Math.floor(Math.random() * 25000) + 10000;     // 10-35s strangers
  await new Promise(r => setTimeout(r, readDelay));

  // Human quirks — probability varies by tier
  const quirksRoll = Math.random();

  // Emoji react — 2% close/acquaintance, 1% others
  const reactThreshold = (tierForTiming === 'close' || tierForTiming === 'acquaintance') ? 0.02 : 0.01;
  if (quirksRoll < reactThreshold) {
    const reactions = ['😂', '😮', '👀', '🔥', '💀', '😭', '🤣', '👍', '😅', '🤔'];
    const reaction = reactions[Math.floor(Math.random() * reactions.length)];
    try {
      await sock.sendMessage(jid, {
        react: { text: reaction, key: msg.key }
      });
    } catch {}
    return;
  }

  // One word reply — never fire if message is a direct question
  const isQuestion = allPending.trim().endsWith('?') || 
    /^(what|which|who|where|when|why|how|are you|do you|did you|can you|is it|was it)/i.test(allPending.trim());
  const oneWordThreshold = isQuestion ? -1 : tierForTiming === 'close' ? 0.14
    : tierForTiming === 'acquaintance' ? 0.08
    : 0.04;
  if (quirksRoll < oneWordThreshold) {
    const oneWords = ['lol', 'facts', 'ngl', 'lowkey', 'bet', 'say less', 'nah', 'yeah', 'true', 'deadass', 'fr', 'wild', 'innit', 'ok', 'fair'];
    const word = oneWords[Math.floor(Math.random() * oneWords.length)];
    const shortDelay = tierForTiming === 'close'
      ? Math.floor(Math.random() * 8000) + 2000
      : Math.floor(Math.random() * 20000) + 8000;
    await new Promise(r => setTimeout(r, shortDelay));
    try { await sock.sendPresenceUpdate('composing', jid); } catch {}
    await new Promise(r => setTimeout(r, 800));
    try { await sock.sendPresenceUpdate('paused', jid); } catch {}
    await new Promise(r => setTimeout(r, 300));
    try { await sock.sendMessage(jid, { text: word }); } catch {}
    return;
  }

  // Voice note placeholder — 8% close only, 4% acquaintance
  const vnThreshold = tierForTiming === 'close' ? 0.22
    : tierForTiming === 'acquaintance' ? 0.12
    : 0.05;
  if (quirksRoll < vnThreshold) {
    const voiceNotes = [
      "couldn't type but basically yeah",
      "long story short yeah",
      "hard to explain in text ngl",
      "you get the point",
      "will explain later",
      "basically yeah",
      "more or less",
    ];
    const vn = voiceNotes[Math.floor(Math.random() * voiceNotes.length)];
    const vnDelay = tierForTiming === 'close'
      ? Math.floor(Math.random() * 30000) + 10000
      : Math.floor(Math.random() * 60000) + 20000;
    await new Promise(r => setTimeout(r, vnDelay));
    try { await sock.sendPresenceUpdate('recording', jid); } catch {}
    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 4000) + 2000));
    try { await sock.sendPresenceUpdate('paused', jid); } catch {}
    await new Promise(r => setTimeout(r, 500));
    try { await sock.sendMessage(jid, { text: vn }); } catch {}
    return;
  }

  // Natural reply delay — everyone gets a realistic delay, max 30 min
  // Close friends reply faster, strangers slower but never more than 30 min
  const naturalDelayRanges = {
    close:        [5000,   3 * 60 * 1000],   // 5s - 3min
    acquaintance: [30000,  8 * 60 * 1000],   // 30s - 8min
    known:        [60000,  15 * 60 * 1000],  // 1min - 15min
    stranger:     [2 * 60 * 1000, 30 * 60 * 1000], // 2min - 30min
  };
  const [natMin, natMax] = naturalDelayRanges[tierForTiming] || naturalDelayRanges.stranger;
  const naturalDelay = Math.floor(Math.random() * (natMax - natMin)) + natMin;
  await new Promise(r => setTimeout(r, naturalDelay));

  // Tier-based reply delay — close friends get fast replies, strangers wait longer
  const [minDelay, maxDelay] = tierForTiming === 'close'
    ? [5000, 30000]                // 5s - 30s
    : tierForTiming === 'acquaintance'
    ? [15000, 90000]               // 15s - 1.5min
    : tierForTiming === 'known'
    ? [30000, 180000]              // 30s - 3min
    : [60000, 240000];             // 1min - 4min strangers
  const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay)) + minDelay;
  await new Promise(r => setTimeout(r, randomDelay));

  // Show typing indicator for realistic duration based on reply length
  const typingDuration = Math.min(Math.max(finalReply.length * 80, 2000), 8000);
  try { await sock.sendPresenceUpdate('composing', jid); } catch {}
  await new Promise(r => setTimeout(r, typingDuration));
  try { await sock.sendPresenceUpdate('paused', jid); } catch {}
  await new Promise(r => setTimeout(r, 500));

  // Punctuation variation — real texts are inconsistent
  let sendReply = finalReply;

  // All caps detection — react to it differently
  const isAllCaps = text.replace(/[^a-zA-Z]/g, '').length > 3 &&
    text.replace(/[^a-zA-Z]/g, '') === text.replace(/[^a-zA-Z]/g, '').toUpperCase();
  if (isAllCaps) {
    // React to the energy — either match it or call it out casually
    const capsReactions = [
      'why are you screaming lol',
      'bro calm down',
      'caps lock stuck or nah',
      'ok ok i hear you',
      'relax',
    ];
    if (Math.random() < 0.4) {
      sendReply = capsReactions[Math.floor(Math.random() * capsReactions.length)];
    }
  }

  // Randomly vary punctuation to feel more human — not every time
  if (!isFormal) {
    const punctRoll = Math.random();
    if (punctRoll < 0.3) {
      // Strip all ending punctuation — most real texts dont have it
      sendReply = sendReply.replace(/[.!?]+$/, '');
    } else if (punctRoll < 0.38) {
      // Trailing off with ...
      sendReply = sendReply.replace(/[.!?]+$/, '') + '...';
    }
    // 15% chance — force all lowercase
    if (Math.random() < 0.15) {
      sendReply = sendReply.toLowerCase();
    }
  }
  if (!isFormal && (tierForTiming === 'close' || tierForTiming === 'acquaintance' || isCasual)) {
    const shortenings = [
      [/\bfor real\b/gi, 'fr'],
      [/\bto be honest\b/gi, 'tbh'],
      [/\bright now\b/gi, 'rn'],
      [/\bnot gonna lie\b/gi, 'ngl'],
      [/\bin my opinion\b/gi, 'imo'],
      [/\bsomething\b/gi, 'smth'],
      [/\bbecause\b/gi, 'bc'],
      [/\bi don't know\b/gi, 'idk'],
      [/\bwith\b/gi, 'w/'],
      [/\byou are\b/gi, 'ur'],
      [/\byour\b/gi, 'ur'],
      [/\byou\b/gi, 'u'],
      [/\bthough\b/gi, 'tho'],
      [/\bthrough\b/gi, 'thru'],
      [/\bwithout\b/gi, 'w/o'],
    ];
    // Only apply a few randomly — not all at once
    const shuffled = shortenings.sort(() => Math.random() - 0.5).slice(0, 3);
    for (const [pattern, replacement] of shuffled) {
      // 40% chance each shortening applies — keeps it natural
      if (Math.random() < 0.4) {
        sendReply = sendReply.replace(pattern, replacement);
      }
    }
  }

  for (let i = 0; i < 3; i++) {
    try {
      await sock.sendMessage(jid, { text: sendReply });
      // Store bot reply in history
      global.dmHistory[senderKey] = global.dmHistory[senderKey] || [];
      global.dmHistory[senderKey].push({ role: 'assistant', content: sendReply, time: Date.now() });

      // Every 20 messages — summarize and persist to JSON so restarts dont wipe context
      const msgCount = global.dmHistory[senderKey].filter(h => h.role === 'user').length;
      if (cleanNumber && msgCount > 0 && msgCount % 20 === 0) {
        try {
          const historyText = global.dmHistory[senderKey]
            .filter(h => h.role !== 'system')
            .slice(-40)
            .map(h => (h.role === 'user' ? 'Them' : 'You') + ': ' + h.content)
            .join('\n');
          const summaryPrompt = 'Summarize this WhatsApp conversation in 3-4 sentences. Focus on: who this person is, what topics were discussed, their personality, anything important said. Be concise.\n\n' + historyText;
          const summaryReply = await getAIReply(summaryPrompt, false, 'You are a conversation summarizer. Return only a short factual summary, no preamble.');
          if (summaryReply && cleanNumber) {
            setSummary(cleanNumber, summaryReply, null);
          }
        } catch {}
      }
      return;
    } catch (_) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

module.exports = { checkAutoReply };
