const { getJID } = require('../utils/helpers');

global.menuSession = global.menuSession || {};

const MAIN_MENU = `🤖 *xssrat Bot v2.0*


Reply with a number:

*1* 🕵️ OSINT & Stalk
*2* 🧠 Psychology
*3* 🎭 Social Engineering
*4* 👻 Stealth & Identity
*5* 👁️ Surveillance
*6* 🎮 Fun & Games
*7* 💕 Flirt
*8* 🤖 AI
*9* 👥 Group Management
*10* 🌍 Info & Tools
*11* 📝 Productivity
*12* 🔐 Admin


Type *0* anytime to return here`;

const SUB_MENUS = {
  '1': {
    title: '🕵️ *OSINT & Stalk*',
    items: [
      { n: '1', cmd: 'stalk', label: '🔍 Stalk — full phone report', needsNumber: true },
      { n: '2', cmd: 'expose', label: '🗂️ Expose — mega profile', needsNumber: true },
      { n: '3', cmd: 'usersearch', label: '👤 User Search — find username', needsText: true, prompt: 'Enter username:' },
      { n: '4', cmd: 'pastebin', label: '📋 Pastebin — search paste sites', needsText: true, prompt: 'Enter email/number/username:' },
      { n: '5', cmd: 'stalkwatch', label: '👁️ Stalk Watch — monitor online', needsNumber: true },
      { n: '6', cmd: 'phoneosint', label: '📡 Phone OSINT — platform checks', needsNumber: true },
    ]
  },
  '2': {
    title: '🧠 *Psychology*',
    items: [
      { n: '1', cmd: 'mood', label: '😊 Mood — read emotional state', needsNumber: true },
      { n: '2', cmd: 'pattern', label: '📊 Pattern — texting analysis', needsNumber: true },
      { n: '3', cmd: 'interest', label: '🎯 Interest — discover interests', needsNumber: true },
      { n: '4', cmd: 'liedetect', label: '🔎 Lie Detect — deception check', needsNumber: true },
      { n: '5', cmd: 'manipulate', label: '🎭 Manipulate — psych tactics', needsNumber: true, needsTextAfter: true, prompt2: 'Enter your goal (e.g. get them to meet up):' },
      { n: '6', cmd: 'influence', label: '💡 Influence — persuasion profile', needsNumber: true },
    ]
  },
  '3': {
    title: '🎭 *Social Engineering*',
    items: [
      { n: '1', cmd: 'warmup', label: '🔥 Warmup — natural msg sequence', needsNumber: true, needsTextAfter: true, prompt2: 'Enter topic (or send skip):' },
      { n: '2', cmd: 'conversation', label: '💬 Conversation — AI auto-chat', needsNumber: true, needsTextAfter: true, prompt2: 'Enter topic (or send skip):' },
      { n: '3', cmd: 'ghostreply', label: '👻 Ghost Reply — re-engage ghoster', needsNumber: true },
      { n: '4', cmd: 'mimic', label: '🎭 Mimic — reply in their style', needsNumber: true, needsTextAfter: true, prompt2: 'Enter message to reply to:' },
      { n: '5', cmd: 'anonymous', label: '🕶️ Anonymous — send anon msg', needsNumber: true, needsTextAfter: true, prompt2: 'Enter message to send:' },
      { n: '6', cmd: 'impersonate', label: '🎪 Impersonate — styled message', needsNumber: true, needsTextAfter: true, prompt2: 'Enter message:' },
    ]
  },
  '4': {
    title: '👻 *Stealth & Identity*',
    items: [
      { n: '1', cmd: 'ghostmode on', label: '👻 Ghost Mode ON', direct: true },
      { n: '2', cmd: 'ghostmode off', label: '👻 Ghost Mode OFF', direct: true },
      { n: '3', cmd: 'fakeonline on', label: '🟢 Fake Online ON', direct: true },
      { n: '4', cmd: 'fakeonline off', label: '🔴 Fake Online OFF', direct: true },
      { n: '5', cmd: 'autotyping on', label: '⌨️ Auto Typing — this chat', direct: true },
      { n: '6', cmd: 'autotyping off', label: '⌨️ Auto Typing OFF', direct: true },
      { n: '7', cmd: 'chameleon on', label: '🦎 Chameleon ON', direct: true },
      { n: '8', cmd: 'chameleon off', label: '🦎 Chameleon OFF', direct: true },
      { n: '9', cmd: 'clone', label: '🔄 Clone — copy profile', needsNumber: true },
      { n: '10', cmd: 'disappear', label: '💨 Disappear', needsText: true, prompt: 'Enter minutes (e.g. 30):' },
      { n: '11', cmd: 'stylemode on', label: '🎭 Style Mode ON', needsNumber: true },
      { n: '12', cmd: 'stylemode off', label: '🎭 Style Mode OFF', direct: true },
      { n: '13', cmd: 'setabout', label: '📝 Set About', needsText: true, prompt: 'Enter new about text:' },
      { n: '14', cmd: 'setname', label: '👤 Set Name', needsText: true, prompt: 'Enter new display name:' },
      { n: '15', cmd: 'clone', label: '🔄 Clone Profile', needsNumber: true },
    ]
  },
  '5': {
    title: '👁️ *Surveillance*',
    items: [
      { n: '1', cmd: 'whoviewed', label: '👁️ Who Viewed — status viewers', direct: true },
      { n: '2', cmd: 'readreceipt', label: '📬 Read Receipt — all contacts', direct: true },
      { n: '3', cmd: 'readreceipt', label: '📬 Read Receipt — specific number', needsNumber: true },
      { n: '4', cmd: 'lasttexted', label: '📋 Last Texted — contact ranking', direct: true },
      { n: '5', cmd: 'myonline', label: '📡 My Online — track self', direct: true },
      { n: '6', cmd: 'myonline report', label: '📊 My Online Report', direct: true },
      { n: '7', cmd: 'stalkwatch', label: '👁️ Watch number online/offline', needsNumber: true },
    ]
  },
  '6': {
    title: '🎮 *Fun & Games*',
    items: [
      { n: '1', cmd: 'joke', label: '😂 Joke', direct: true },
      { n: '2', cmd: 'fact', label: '💡 Fact', direct: true },
      { n: '3', cmd: 'trivia', label: '🎯 Trivia', direct: true },
      { n: '4', cmd: 'riddle', label: '🧩 Riddle', direct: true },
      { n: '5', cmd: '8ball', label: '🎱 8Ball', needsText: true, prompt: 'Enter your question:' },
      { n: '6', cmd: 'coinflip', label: '🪙 Coin Flip', direct: true },
      { n: '7', cmd: 'truth', label: '😳 Truth', direct: true },
      { n: '8', cmd: 'dare', label: '😈 Dare', direct: true },
      { n: '9', cmd: 'spicydare', label: '🔥 Spicy Dare', direct: true },
      { n: '10', cmd: 'horoscope', label: '⭐ Horoscope', needsText: true, prompt: 'Enter zodiac sign:' },
    ]
  },
  '7': {
    title: '💕 *Flirt*',
    items: [
      { n: '1', cmd: 'rizz', label: '😏 Rizz', needsText: true, prompt: 'Enter their message to rizz back:' },
      { n: '2', cmd: 'seduce', label: '🔥 Seduce', direct: true },
      { n: '3', cmd: 'pickup', label: '💘 Pickup Line', direct: true },
      { n: '4', cmd: 'compliment', label: '💝 Compliment', direct: true },
      { n: '5', cmd: 'lovemeter', label: '💞 Love Meter', needsText: true, prompt: 'Enter two names (e.g. John Jane):' },
      { n: '6', cmd: 'shipname', label: '⚓ Ship Name', needsText: true, prompt: 'Enter two names:' },
      { n: '7', cmd: 'couple', label: '👫 Couple', direct: true },
      { n: '8', cmd: 'loveadvice', label: '💌 Love Advice', needsText: true, prompt: 'Describe your situation:' },
    ]
  },
  '8': {
    title: '🤖 *AI*',
    items: [
      { n: '1', cmd: 'ask', label: '🤖 Ask AI', needsText: true, prompt: 'What do you want to ask?' },
      { n: '2', cmd: 'summarize', label: '📝 Summarize', needsText: true, prompt: 'Paste text to summarize:' },
      { n: '3', cmd: 'translate', label: '🌐 Translate', needsText: true, prompt: 'Text + language (e.g. Hello to Spanish):' },
      { n: '4', cmd: 'code', label: '💻 Code', needsText: true, prompt: 'Describe code you need:' },
      { n: '5', cmd: 'story', label: '📖 Story', needsText: true, prompt: 'Enter story theme:' },
      { n: '6', cmd: 'poem', label: '🎭 Poem', needsText: true, prompt: 'Enter poem topic:' },
      { n: '7', cmd: 'roastai', label: '🔥 Roast AI', needsText: true, prompt: 'Who to roast?' },
      { n: '8', cmd: 'debate', label: '⚖️ Debate', needsText: true, prompt: 'Enter debate topic:' },
      { n: '9', cmd: 'explain', label: '🧠 Explain', needsText: true, prompt: 'What to explain?' },
      { n: '10', cmd: 'compare', label: '⚖️ Compare', needsText: true, prompt: 'Enter: thing1 vs thing2' },
    ]
  },
  '9': {
    title: '👥 *Group Management*',
    items: [
      { n: '1', cmd: 'groupon', label: '✅ Enable bot in this group', direct: true },
      { n: '2', cmd: 'groupoff', label: '🔕 Disable bot in this group', direct: true },
      { n: '3', cmd: 'tagall', label: '📢 Tag All members', direct: true },
      { n: '4', cmd: 'ghostlist', label: '👻 Ghost List — inactive members', direct: true },
      { n: '5', cmd: 'poll', label: '📊 Create Poll', needsText: true, prompt: 'Question | Option1 | Option2 | Option3:' },
      { n: '6', cmd: 'rules', label: '📋 Show Rules', direct: true },
      { n: '7', cmd: 'leaderboard', label: '🏆 Leaderboard', direct: true },
      { n: '8', cmd: 'spy on', label: '🕵️ Spy Mode ON', direct: true },
      { n: '9', cmd: 'spy off', label: '🕵️ Spy Mode OFF', direct: true },
    ]
  },
  '10': {
    title: '🌍 *Info & Tools*',
    items: [
      { n: '1', cmd: 'weather', label: '🌤️ Weather', needsText: true, prompt: 'Enter city:' },
      { n: '2', cmd: 'crypto', label: '💰 Crypto Price', needsText: true, prompt: 'Enter coin (e.g. bitcoin):' },
      { n: '3', cmd: 'news', label: '📰 News', direct: true },
      { n: '4', cmd: 'calc', label: '🧮 Calculator', needsText: true, prompt: 'Enter expression:' },
      { n: '5', cmd: 'define', label: '📖 Define Word', needsText: true, prompt: 'Enter word:' },
      { n: '6', cmd: 'time', label: '🕐 Current Time', direct: true },
      { n: '7', cmd: 'ip', label: '🌐 IP Lookup', needsText: true, prompt: 'Enter IP address:' },
      { n: '8', cmd: 'qr', label: '📱 Generate QR', needsText: true, prompt: 'Enter text/URL:' },
      { n: '9', cmd: 'password', label: '🔑 Generate Password', direct: true },
      { n: '10', cmd: 'convert', label: '🔄 Convert Units', needsText: true, prompt: 'e.g. 100 usd to kes:' },
    ]
  },
  '11': {
    title: '📝 *Productivity*',
    items: [
      { n: '1', cmd: 'remind', label: '⏰ Set Reminder', needsText: true, prompt: 'e.g. call John in 2h:' },
      { n: '2', cmd: 'todo', label: '✅ Add Todo', needsText: true, prompt: 'Enter todo item:' },
      { n: '3', cmd: 'note', label: '📝 Save Note', needsText: true, prompt: 'Enter note:' },
      { n: '4', cmd: 'notes', label: '📋 View Notes', direct: true },
      { n: '5', cmd: 'schedule', label: '📅 Schedule Message', needsText: true, prompt: 'number time message:' },
      { n: '6', cmd: 'broadcast', label: '📢 Broadcast', needsText: true, prompt: 'Enter broadcast message:' },
      { n: '7', cmd: 'stats', label: '📊 Bot Stats', direct: true },
    ]
  },
  '12': {
    title: '🔐 *Admin*',
    items: [
      { n: '1', cmd: 'ban', label: '🚫 Ban User', needsNumber: true },
      { n: '2', cmd: 'unban', label: '✅ Unban User', needsNumber: true },
      { n: '3', cmd: 'logs', label: '📋 View Logs', direct: true },
      { n: '4', cmd: 'setprefix', label: '⚙️ Set Prefix', needsText: true, prompt: 'Enter new prefix:' },
      { n: '5', cmd: 'addkeyword', label: '➕ Add Keyword', needsText: true, prompt: 'keyword | response:' },
      { n: '6', cmd: 'keywords', label: '📋 View Keywords', direct: true },
      { n: '7', cmd: 'recallall', label: '🗑️ Recall All Bot Msgs', direct: true },
    ]
  },
};

async function sendMainMenu(sock, jid) {
  await sock.sendMessage(jid, { text: MAIN_MENU });
}

async function sendSubMenu(sock, jid, catNum) {
  const cat = SUB_MENUS[catNum];
  if (!cat) return;
  const lines = cat.items.map(i => `*${i.n}* ${i.label}`).join('\n');
  await sock.sendMessage(jid, {
    text: `${cat.title}\n━━━━━━━━━━━━━━━━━━━\n\n${lines}\n\n━━━━━━━━━━━━━━━━━━━\nType *0* for main menu`
  });
}

async function handleMenuSession(sock, msg, text) {
  const jid = msg.key.remoteJid;
  const session = global.menuSession?.[jid];

  // Main menu — number 0-12
  if (!session) {
    if (text === '0') {
      await sendMainMenu(sock, jid);
      return true;
    }
    if (SUB_MENUS[text]) {
      global.menuSession[jid] = { step: 'subcat', cat: text };
      await sendSubMenu(sock, jid, text);
      return true;
    }
    return false;
  }

  // Cancel
  if (text.toLowerCase() === 'cancel' || text === '0') {
    global.menuSession[jid] = null;
    await sendMainMenu(sock, jid);
    return true;
  }

  // Sub-category selection
  if (session.step === 'subcat') {
    const cat = SUB_MENUS[session.cat];
    const item = cat?.items.find(i => i.n === text);
    if (!item) {
      await sock.sendMessage(jid, { text: '❌ Invalid option. Try again or type *0* for main menu.' });
      return true;
    }

    if (item.direct) {
      global.menuSession[jid] = null;
      const parts = item.cmd.split(' ');
      return { cmd: parts[0], args: parts.slice(1) };
    }

    if (item.needsNumber) {
      global.menuSession[jid] = { step: 'number', item };
      await sock.sendMessage(jid, { text: `📱 *Enter phone number*\n\nWith country code, no +\nExample: 254712345678\n\nType *cancel* to go back` });
      return true;
    }

    if (item.needsText) {
      global.menuSession[jid] = { step: 'text', item };
      await sock.sendMessage(jid, { text: `💬 ${item.prompt}\n\nType *cancel* to go back` });
      return true;
    }
  }

  // Number input
  if (session.step === 'number') {
    const number = text.replace(/[^0-9]/g, '');
    if (!number || number.length < 9) {
      await sock.sendMessage(jid, { text: '❌ Invalid number. Try again or type *cancel*' });
      return true;
    }
    const item = session.item;
    if (item.needsTextAfter) {
      global.menuSession[jid] = { step: 'text_after', item, number };
      await sock.sendMessage(jid, { text: `💬 ${item.prompt2}\n\nType *cancel* to go back` });
      return true;
    }
    global.menuSession[jid] = null;
    const parts = item.cmd.split(' ');
    return { cmd: parts[0], args: [number, ...parts.slice(1)] };
  }

  // Text after number
  if (session.step === 'text_after') {
    const input = text === 'skip' ? '' : text;
    global.menuSession[jid] = null;
    const parts = session.item.cmd.split(' ');
    return { cmd: parts[0], args: [session.number, ...input.split(' ')].filter(Boolean) };
  }

  // Text input
  if (session.step === 'text') {
    global.menuSession[jid] = null;
    const parts = session.item.cmd.split(' ');
    return { cmd: parts[0], args: [...parts.slice(1), ...text.split(' ')] };
  }

  return false;
}

async function handleMenuSelection() { return false; }

module.exports = { sendMainMenu, sendSubMenu, handleMenuSelection, handleMenuSession };
