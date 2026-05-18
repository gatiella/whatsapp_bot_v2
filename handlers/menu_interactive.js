const { getJID } = require('../utils/helpers');

const PREFIX = process.env.PREFIX || '!';

// Session state for multi-step commands
global.menuSession = global.menuSession || {};

async function sendMainMenu(sock, jid) {
  try {
    await sock.sendMessage(jid, {
      listMessage: {
        title: '🤖 *xssrat Bot v2.0*',
        description: 'Select a category below',
        buttonText: '📋 Open Menu',
        listType: 1,
        sections: [
          {
            title: '🔧 Core',
            rows: [
              { id: 'cat_osint', title: '🕵️ OSINT & Stalk', description: 'Phone intel, user search, expose' },
              { id: 'cat_psych', title: '🧠 Psychology', description: 'Mood, patterns, influence, liedetect' },
              { id: 'cat_social', title: '🎭 Social Eng', description: 'Warmup, conversation, ghostreply' },
            ]
          },
          {
            title: '🎮 Entertainment',
            rows: [
              { id: 'cat_fun', title: '🎮 Fun & Games', description: 'Jokes, trivia, 8ball, coinflip' },
              { id: 'cat_flirt', title: '💕 Flirt', description: 'Rizz, seduce, pickup, lovemeter' },
              { id: 'cat_ai', title: '🤖 AI', description: 'Ask AI, stories, poems, debate' },
            ]
          },
          {
            title: '⚙️ Control',
            rows: [
              { id: 'cat_stealth', title: '👻 Stealth', description: 'Ghostmode, fakeonline, autotyping' },
              { id: 'cat_group', title: '👥 Group', description: 'Manage groups, tagall, polls' },
              { id: 'cat_admin', title: '🔐 Admin', description: 'Ban, settings, logs' },
            ]
          },
          {
            title: '📊 Intelligence',
            rows: [
              { id: 'cat_surveillance', title: '👁️ Surveillance', description: 'Whoviewed, readreceipt, lasttexted' },
              { id: 'cat_productivity', title: '📝 Productivity', description: 'Reminders, notes, todos' },
              { id: 'cat_info', title: '🌍 Info & Tools', description: 'Weather, crypto, news, calc' },
            ]
          }
        ]
      }
    });
  } catch {
    // fallback to text menu
    await sock.sendMessage(jid, { text: `Type *${PREFIX}help* to see all commands.` });
  }
}

async function sendSubMenu(sock, jid, category) {
  const menus = {
    cat_osint: {
      title: '🕵️ OSINT & Stalk',
      body: 'Choose an action',
      buttonText: 'Select',
      sections: [{
        title: 'OSINT Tools',
        rows: [
          { id: 'cmd_stalk', title: '🔍 Stalk', description: 'Full phone OSINT report' },
          { id: 'cmd_expose', title: '🗂️ Expose', description: 'Mega profile report' },
          { id: 'cmd_usersearch', title: '👤 User Search', description: 'Find username across platforms' },
          { id: 'cmd_pastebin', title: '📋 Pastebin', description: 'Search paste sites' },
          { id: 'cmd_stalkwatch', title: '👁️ Stalk Watch', description: 'Monitor online/offline' },
        ]
      }]
    },
    cat_psych: {
      title: '🧠 Psychology',
      body: 'Choose an action',
      buttonText: 'Select',
      sections: [{
        title: 'Psychological Tools',
        rows: [
          { id: 'cmd_mood', title: '😊 Mood', description: 'Read emotional state' },
          { id: 'cmd_pattern', title: '📊 Pattern', description: 'Texting pattern analysis' },
          { id: 'cmd_interest', title: '🎯 Interest', description: 'Discover their interests' },
          { id: 'cmd_liedetect', title: '🔎 Lie Detect', description: 'Detect deception patterns' },
          { id: 'cmd_manipulate', title: '🎭 Manipulate', description: 'Psychological tactics' },
          { id: 'cmd_influence', title: '💡 Influence', description: 'Full persuasion profile' },
        ]
      }]
    },
    cat_social: {
      title: '🎭 Social Engineering',
      body: 'Choose an action',
      buttonText: 'Select',
      sections: [{
        title: 'Social Tools',
        rows: [
          { id: 'cmd_warmup', title: '🔥 Warmup', description: 'Send natural message sequence' },
          { id: 'cmd_conversation', title: '💬 Conversation', description: 'AI holds auto conversation' },
          { id: 'cmd_ghostreply', title: '👻 Ghost Reply', description: 'Perfect re-engagement message' },
          { id: 'cmd_mimic', title: '🎭 Mimic', description: 'Reply in their style' },
          { id: 'cmd_anonymous', title: '🕶️ Anonymous', description: 'Send anonymous message' },
        ]
      }]
    },
    cat_fun: {
      title: '🎮 Fun & Games',
      body: 'Choose an action',
      buttonText: 'Select',
      sections: [{
        title: 'Fun Commands',
        rows: [
          { id: 'cmd_joke', title: '😂 Joke', description: 'Random joke' },
          { id: 'cmd_fact', title: '💡 Fact', description: 'Random fact' },
          { id: 'cmd_trivia', title: '🎯 Trivia', description: 'Trivia question' },
          { id: 'cmd_riddle', title: '🧩 Riddle', description: 'Random riddle' },
          { id: 'cmd_8ball', title: '🎱 8Ball', description: 'Ask the magic 8 ball' },
          { id: 'cmd_coinflip', title: '🪙 Coin Flip', description: 'Heads or tails' },
          { id: 'cmd_truth', title: '😳 Truth', description: 'Truth question' },
          { id: 'cmd_dare', title: '😈 Dare', description: 'Dare challenge' },
        ]
      }]
    },
    cat_flirt: {
      title: '💕 Flirt',
      body: 'Choose an action',
      buttonText: 'Select',
      sections: [{
        title: 'Flirt Commands',
        rows: [
          { id: 'cmd_rizz', title: '😏 Rizz', description: 'Generate smooth reply' },
          { id: 'cmd_seduce', title: '🔥 Seduce', description: 'Seductive message' },
          { id: 'cmd_pickup', title: '💘 Pickup Line', description: 'Creative pickup line' },
          { id: 'cmd_compliment', title: '💝 Compliment', description: 'Sweet compliment' },
          { id: 'cmd_lovemeter', title: '💞 Love Meter', description: 'Check compatibility' },
          { id: 'cmd_shipname', title: '⚓ Ship Name', description: 'Create ship name' },
        ]
      }]
    },
    cat_stealth: {
      title: '👻 Stealth',
      body: 'Choose an action',
      buttonText: 'Select',
      sections: [{
        title: 'Stealth Controls',
        rows: [
          { id: 'cmd_ghostmode_on', title: '👻 Ghost Mode ON', description: 'Read without replying' },
          { id: 'cmd_ghostmode_off', title: '👻 Ghost Mode OFF', description: 'Resume replying' },
          { id: 'cmd_fakeonline_on', title: '🟢 Fake Online ON', description: 'Appear online always' },
          { id: 'cmd_fakeonline_off', title: '🔴 Fake Online OFF', description: 'Stop fake online' },
          { id: 'cmd_autotyping_on', title: '⌨️ Auto Typing ON', description: 'Appear typing forever' },
          { id: 'cmd_autotyping_off', title: '⌨️ Auto Typing OFF', description: 'Stop auto typing' },
          { id: 'cmd_chameleon_on', title: '🦎 Chameleon ON', description: 'Mirror contact profiles' },
          { id: 'cmd_chameleon_off', title: '🦎 Chameleon OFF', description: 'Stop chameleon mode' },
        ]
      }]
    },
    cat_surveillance: {
      title: '👁️ Surveillance',
      body: 'Choose an action',
      buttonText: 'Select',
      sections: [{
        title: 'Surveillance Tools',
        rows: [
          { id: 'cmd_whoviewed', title: '👁️ Who Viewed', description: 'See who viewed your status' },
          { id: 'cmd_readreceipt', title: '📬 Read Receipt', description: 'See read and reply times' },
          { id: 'cmd_lasttexted', title: '📋 Last Texted', description: 'Ranked contact activity' },
          { id: 'cmd_myonline', title: '📡 My Online', description: 'Monitor your own activity' },
        ]
      }]
    },
    cat_ai: {
      title: '🤖 AI',
      body: 'Choose an action',
      buttonText: 'Select',
      sections: [{
        title: 'AI Commands',
        rows: [
          { id: 'cmd_ask', title: '🤖 Ask AI', description: 'Ask anything' },
          { id: 'cmd_summarize', title: '📝 Summarize', description: 'Summarize text' },
          { id: 'cmd_translate', title: '🌐 Translate', description: 'Translate text' },
          { id: 'cmd_code', title: '💻 Code', description: 'Generate code' },
          { id: 'cmd_story', title: '📖 Story', description: 'Generate story' },
          { id: 'cmd_poem', title: '🎭 Poem', description: 'Generate poem' },
        ]
      }]
    },
    cat_group: {
      title: '👥 Group Management',
      body: 'Choose an action',
      buttonText: 'Select',
      sections: [{
        title: 'Group Commands',
        rows: [
          { id: 'cmd_groupon', title: '✅ Group ON', description: 'Enable bot in this group' },
          { id: 'cmd_groupoff', title: '🔕 Group OFF', description: 'Disable bot in this group' },
          { id: 'cmd_tagall', title: '📢 Tag All', description: 'Mention all members' },
          { id: 'cmd_ghostlist', title: '👻 Ghost List', description: 'List inactive members' },
          { id: 'cmd_poll', title: '📊 Poll', description: 'Create a poll' },
          { id: 'cmd_rules', title: '📋 Rules', description: 'Show group rules' },
        ]
      }]
    },
    cat_info: {
      title: '🌍 Info & Tools',
      body: 'Choose an action',
      buttonText: 'Select',
      sections: [{
        title: 'Info Commands',
        rows: [
          { id: 'cmd_weather', title: '🌤️ Weather', description: 'Current weather' },
          { id: 'cmd_crypto', title: '💰 Crypto', description: 'Crypto prices' },
          { id: 'cmd_news', title: '📰 News', description: 'Latest news' },
          { id: 'cmd_calc', title: '🧮 Calculator', description: 'Calculate expression' },
          { id: 'cmd_define', title: '📖 Define', description: 'Word definition' },
          { id: 'cmd_time', title: '🕐 Time', description: 'Current time' },
        ]
      }]
    },
    cat_admin: {
      title: '🔐 Admin',
      body: 'Choose an action',
      buttonText: 'Select',
      sections: [{
        title: 'Admin Commands',
        rows: [
          { id: 'cmd_ban', title: '🚫 Ban', description: 'Ban a user' },
          { id: 'cmd_unban', title: '✅ Unban', description: 'Unban a user' },
          { id: 'cmd_logs', title: '📋 Logs', description: 'View message logs' },
          { id: 'cmd_stats', title: '📊 Stats', description: 'Bot statistics' },
        ]
      }]
    },
    cat_productivity: {
      title: '📝 Productivity',
      body: 'Choose an action',
      buttonText: 'Select',
      sections: [{
        title: 'Productivity Commands',
        rows: [
          { id: 'cmd_remind', title: '⏰ Remind', description: 'Set a reminder' },
          { id: 'cmd_todo', title: '✅ Todo', description: 'Manage todos' },
          { id: 'cmd_note', title: '📝 Note', description: 'Save a note' },
          { id: 'cmd_notes', title: '📋 Notes', description: 'View all notes' },
          { id: 'cmd_schedule', title: '📅 Schedule', description: 'Schedule a message' },
        ]
      }]
    },
  };

  const menu = menus[category];
  if (!menu) return;

  try {
    await sock.sendMessage(jid, {
      listMessage: {
        title: menu.title,
        description: menu.body,
        buttonText: menu.buttonText,
        listType: 1,
        sections: menu.sections
      }
    });
  } catch {
    await sock.sendMessage(jid, { text: `Selected: ${category}. Type the command directly.` });
  }
}

// Commands that need a phone number input
const NEEDS_NUMBER = [
  'cmd_stalk','cmd_expose','cmd_usersearch','cmd_pastebin','cmd_stalkwatch',
  'cmd_mood','cmd_pattern','cmd_interest','cmd_liedetect','cmd_manipulate','cmd_influence',
  'cmd_warmup','cmd_conversation','cmd_ghostreply','cmd_mimic','cmd_anonymous',
  'cmd_readreceipt','cmd_autotyping_on','cmd_clone',
  'cmd_rizz','cmd_seduce','cmd_pickup','cmd_compliment',
  'cmd_joke','cmd_fact','cmd_8ball','cmd_riddle','cmd_truth','cmd_dare',
];

// Commands that need text input
const NEEDS_TEXT = [
  'cmd_ask','cmd_summarize','cmd_translate','cmd_code','cmd_story','cmd_poem',
  'cmd_weather','cmd_crypto','cmd_define','cmd_calc','cmd_remind','cmd_note',
  'cmd_poll','cmd_manipulate',
];

// Commands that execute directly
const DIRECT_CMDS = {
  'cmd_ghostmode_on': 'ghostmode on',
  'cmd_ghostmode_off': 'ghostmode off',
  'cmd_fakeonline_on': 'fakeonline on',
  'cmd_fakeonline_off': 'fakeonline off',
  'cmd_autotyping_off': 'autotyping off',
  'cmd_chameleon_on': 'chameleon on',
  'cmd_chameleon_off': 'chameleon off',
  'cmd_groupon': 'groupon',
  'cmd_groupoff': 'groupoff',
  'cmd_tagall': 'tagall',
  'cmd_ghostlist': 'ghostlist',
  'cmd_rules': 'rules',
  'cmd_whoviewed': 'whoviewed',
  'cmd_readreceipt': 'readreceipt',
  'cmd_lasttexted': 'lasttexted',
  'cmd_myonline': 'myonline',
  'cmd_logs': 'logs',
  'cmd_stats': 'stats',
  'cmd_notes': 'notes',
  'cmd_coinflip': 'coinflip',
  'cmd_trivia': 'trivia',
  'cmd_time': 'time',
  'cmd_news': 'news',
  'cmd_lovemeter': 'lovemeter',
  'cmd_shipname': 'shipname',
};

async function handleMenuSelection(sock, msg, selectedId) {
  const jid = getJID(msg);

  // Category selection
  if (selectedId.startsWith('cat_')) {
    await sendSubMenu(sock, jid, selectedId);
    return true;
  }

  // Direct commands
  if (DIRECT_CMDS[selectedId]) {
    global.menuSession[jid] = null;
    return { cmd: DIRECT_CMDS[selectedId], args: [] };
  }

  // Commands needing number
  if (NEEDS_NUMBER.includes(selectedId)) {
    global.menuSession[jid] = { pendingCmd: selectedId, step: 'number' };
    await sock.sendMessage(jid, {
      text: `📱 *Enter phone number*\n\nReply with the number (with country code)\nExample: 254712345678\n\nOr type *cancel* to go back`
    });
    return true;
  }

  // Commands needing text
  if (NEEDS_TEXT.includes(selectedId)) {
    global.menuSession[jid] = { pendingCmd: selectedId, step: 'text' };
    const prompts = {
      'cmd_ask': '💬 What do you want to ask AI?',
      'cmd_summarize': '📝 Paste the text to summarize:',
      'cmd_translate': '🌐 Enter text to translate (add language at end)\nExample: Hello world to Spanish',
      'cmd_code': '💻 Describe the code you need:',
      'cmd_story': '📖 Give a story theme or topic:',
      'cmd_poem': '🎭 Give a poem topic:',
      'cmd_weather': '🌤️ Enter city name:',
      'cmd_crypto': '💰 Enter coin name (e.g. bitcoin):',
      'cmd_define': '📖 Enter word to define:',
      'cmd_calc': '🧮 Enter expression to calculate:',
      'cmd_remind': '⏰ Enter reminder (e.g. call John in 2h):',
      'cmd_note': '📝 Enter your note:',
      'cmd_poll': '📊 Enter poll question and options\nFormat: Question | Option1 | Option2 | Option3',
      'cmd_manipulate': '🎭 Enter your goal:\nExample: get them to meet up',
    };
    await sock.sendMessage(jid, {
      text: `${prompts[selectedId] || '💬 Enter your input:'}\n\nOr type *cancel* to go back`
    });
    return true;
  }

  return false;
}

async function handleMenuSession(sock, msg, text) {
  const jid = getJID(msg);
  const session = global.menuSession?.[jid];
  if (!session) return false;

  if (text.toLowerCase() === 'cancel') {
    global.menuSession[jid] = null;
    await sendMainMenu(sock, jid);
    return true;
  }

  if (session.step === 'number') {
    const number = text.replace(/[^0-9]/g, '');
    if (!number || number.length < 9) {
      await sock.sendMessage(jid, { text: '❌ Invalid number. Try again or type *cancel*' });
      return true;
    }

    // Commands that need text after number
    const needsTextAfterNumber = ['cmd_warmup','cmd_conversation','cmd_manipulate','cmd_anonymous','cmd_mimic','cmd_autotyping_on'];
    if (needsTextAfterNumber.includes(session.pendingCmd)) {
      global.menuSession[jid] = { ...session, number, step: 'text_after_number' };
      const prompts = {
        'cmd_warmup': '🔥 Enter warmup topic (or send *skip* for general):',
        'cmd_conversation': '💬 Enter conversation topic (or send *skip*):',
        'cmd_manipulate': '🎭 Enter your goal (e.g. get them to meet up):',
        'cmd_anonymous': '🕶️ Enter message to send anonymously:',
        'cmd_mimic': '🎭 Enter message to reply to:',
        'cmd_autotyping_on': '⌨️ Number saved. Send *ok* to start typing indicator.',
      };
      await sock.sendMessage(jid, { text: prompts[session.pendingCmd] || '💬 Enter additional info:' });
      return true;
    }

    // Execute directly with number
    global.menuSession[jid] = null;
    const cmdMap = {
      'cmd_stalk': 'stalk', 'cmd_expose': 'expose', 'cmd_usersearch': 'usersearch',
      'cmd_pastebin': 'pastebin', 'cmd_stalkwatch': 'stalkwatch', 'cmd_mood': 'mood',
      'cmd_pattern': 'pattern', 'cmd_interest': 'interest', 'cmd_liedetect': 'liedetect',
      'cmd_influence': 'influence', 'cmd_ghostreply': 'ghostreply', 'cmd_readreceipt': 'readreceipt',
      'cmd_clone': 'clone', 'cmd_rizz': 'rizz', 'cmd_seduce': 'seduce',
      'cmd_pickup': 'pickup', 'cmd_compliment': 'compliment',
      'cmd_joke': 'joke', 'cmd_fact': 'fact', 'cmd_8ball': '8ball',
      'cmd_riddle': 'riddle', 'cmd_truth': 'truth', 'cmd_dare': 'dare',
    };
    const cmd = cmdMap[session.pendingCmd];
    if (cmd) return { cmd, args: [number] };
  }

  if (session.step === 'text_after_number') {
    const input = text === 'skip' ? '' : text;
    global.menuSession[jid] = null;
    const cmdMap = {
      'cmd_warmup': 'warmup', 'cmd_conversation': 'conversation',
      'cmd_manipulate': 'manipulate', 'cmd_anonymous': 'anonymous',
      'cmd_mimic': 'mimic', 'cmd_autotyping_on': 'autotyping',
    };
    const cmd = cmdMap[session.pendingCmd];
    if (cmd === 'autotyping') return { cmd, args: ['on', session.number] };
    if (cmd) return { cmd, args: [session.number, ...input.split(' ')] };
  }

  if (session.step === 'text') {
    global.menuSession[jid] = null;
    const cmdMap = {
      'cmd_ask': 'ask', 'cmd_summarize': 'summarize', 'cmd_translate': 'translate',
      'cmd_code': 'code', 'cmd_story': 'story', 'cmd_poem': 'poem',
      'cmd_weather': 'weather', 'cmd_crypto': 'crypto', 'cmd_define': 'define',
      'cmd_calc': 'calc', 'cmd_remind': 'remind', 'cmd_note': 'note', 'cmd_poll': 'poll',
    };
    const cmd = cmdMap[session.pendingCmd];
    if (cmd) return { cmd, args: text.split(' ') };
  }

  return false;
}

module.exports = { sendMainMenu, sendSubMenu, handleMenuSelection, handleMenuSession };
