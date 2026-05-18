const { toFont, STYLES } = require('./unique');
const { getJID } = require('../utils/helpers');

const jokes = [
  "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
  "Why did the developer go broke? Because he used up all his cache! 💸",
  "A SQL query walks into a bar, walks up to two tables and asks... 'Can I join you?' 😄",
  "Why do Java developers wear glasses? Because they don't C#! 👓",
  "How many programmers does it take to change a light bulb? None — that's a hardware problem! 💡",
  "Why was the JavaScript developer sad? Because he didn't Node how to Express himself! 😢",
];

const facts = [
  "Honey never spoils — archaeologists found 3000-year-old honey in Egyptian tombs still edible! 🍯",
  "A day on Venus is longer than a year on Venus. 🪐",
  "Octopuses have three hearts and blue blood. 🐙",
  "The shortest war in history lasted 38–45 minutes (Anglo-Zanzibar War, 1896). ⚔️",
  "Bananas are berries, but strawberries are not. 🍌",
  "A group of flamingos is called a 'flamboyance'. 🦩",
];

const triviaList = [
  { q: "What is the capital of Australia?", a: "Canberra" },
  { q: "How many bones are in the human body?", a: "206" },
  { q: "What language has the most native speakers?", a: "Mandarin Chinese" },
  { q: "What is the largest ocean on Earth?", a: "Pacific Ocean" },
  { q: "Who invented the telephone?", a: "Alexander Graham Bell" },
];

const riddles = [
  { q: "I speak without a mouth and hear without ears. I have no body, but I come alive with the wind. What am I?", a: "An echo" },
  { q: "The more you take, the more you leave behind. What am I?", a: "Footsteps" },
  { q: "I have cities, but no houses live there. I have mountains, but no trees grow there. What am I?", a: "A map" },
];

const truthQuestions = [
  "What's the most embarrassing thing you've done?",
  "What's a secret you've never told anyone?",
  "What's your biggest fear?",
  "Have you ever lied to get out of trouble?",
  "What's the worst gift you've ever received?",
  "What's the most romantic thing you've ever done?",
  "Have you ever had a crush on someone in this chat?",
  "What's your biggest turn on?",
  "Have you ever sent a risky text to the wrong person?",
  "What's the naughtiest thought you've had today?",
  "Have you ever kissed someone you shouldn't have?",
  "What's your favorite body part on your partner?",
  "Have you ever faked it?",
  "What's the wildest place you've ever hooked up?",
  "What's your biggest bedroom fantasy?",
];

const dares = [
  "Send a voice note singing for 10 seconds.",
  "Change your status to something embarrassing for 10 minutes.",
  "Send a selfie with the silliest face you can make.",
  "Text someone 'I know what you did' and share their reaction.",
  "Do 10 push-ups and send proof.",
  "Send the last photo in your gallery right now.",
  "Send a voice note saying 'I love you' in 5 different languages.",
  "Send your most embarrassing selfie.",
  "Text your crush 'hey' right now.",
  "Send a screenshot of your last Google search.",
  "Send a voice note of your best animal sound.",
  "Text your mom a heart emoji right now.",
];

const spicyDares = [
  "Send a flirty voice note to the last person you texted.",
  "Describe your ideal romantic night in detail.",
  "Send a voice note whispering something sweet.",
  "Tell your partner one thing you've been too shy to say.",
  "Send a voice note doing your most seductive voice.",
  "Describe where you would kiss your partner first.",
  "Send a compliment to someone you find attractive.",
  "Tell your partner your favorite memory with them.",
  "Whisper something naughty in a voice note.",
  "Describe your partner in 3 words right now.",
];

const compliments = [
  "You are the most beautiful person I have ever seen. 😍",
  "Your smile makes the whole world brighter. ☀️",
  "You are incredibly intelligent and amazing. 🧠✨",
  "Being with you feels like home. 🏡❤️",
  "You make every moment special just by being in it. 💫",
  "Your laugh is literally my favorite sound in the world. 😂❤️",
  "You are so incredibly kind and it melts my heart. 💝",
  "You are the reason I smile for no reason. 😊",
  "You are dangerously attractive and you don't even know it. 🔥",
  "Everything about you is perfect. Simply perfect. 💯",
];

const seduceLines = [
  "Are you a magician? Because whenever I look at you, everyone else disappears. ✨",
  "Do you have a map? I keep getting lost in your eyes. 👀",
  "Is it hot in here or is it just you? 🔥",
  "You must be tired because you've been running through my mind all day. 😏",
  "I was having a terrible day until I thought of you. 💭❤️",
  "If kisses were snowflakes, I'd send you a blizzard. ❄️💋",
  "You're not just beautiful, you're dangerously beautiful. 😈",
  "Every time you smile at me I forget how to function. 😵‍💫",
  "I don't need dreams when I have you. 🌙",
  "The way you laugh makes me want to make you laugh forever. 😍",
  "You're the type of person people write love songs about. 🎵",
  "I can't stop thinking about you and honestly I don't want to. 💭",
];

const couplesChallenges = [
  "📸 Take a cute selfie together and set it as your status.",
  "💌 Write each other a 3-sentence love letter right now.",
  "🎵 Send each other your current favorite song.",
  "🍽️ Plan a surprise date for each other this week.",
  "💆 Give each other a 5-minute massage.",
  "📝 Write 5 things you love about each other.",
  "🌅 Watch a sunrise or sunset together this week.",
  "🍳 Cook a meal together from scratch.",
  "📱 No phones for 1 hour — just each other.",
  "💃 Dance together to your favorite song right now.",
  "🎁 Surprise each other with a small gift under $5.",
  "🗺️ Plan a mini adventure somewhere new together.",
];

const wouldYouRather = [
  "Would you rather kiss in the rain 🌧️ or under the stars ⭐?",
  "Would you rather have a long hug 🤗 or a quick kiss 💋?",
  "Would you rather go on a beach date 🏖️ or a mountain hike 🏔️?",
  "Would you rather receive flowers 🌹 or chocolates 🍫?",
  "Would you rather stay in and cuddle 🛋️ or go out dancing 💃?",
  "Would you rather know all your partner's thoughts 🧠 or have them always know yours?",
  "Would you rather have a partner who's super funny 😂 or super romantic 💕?",
  "Would you rather never fight 🕊️ or always make up quickly 💋?",
];

const pickupLines = [
  "Are you a parking ticket? Because you've got 'fine' written all over you. 😏",
  "Do you believe in love at first text? 💬❤️",
  "Are you Google? Because you have everything I've been searching for. 🔍",
  "Is your name Wi-Fi? Because I'm feeling a connection. 📶",
  "Are you a camera? Every time I look at you I smile. 📸",
  "Do you have a name or can I call you mine? 😍",
  "Are you a star? Because your beauty lights up the night. ⭐",
  "I must be lost because heaven is a long way from here. 😇",
  "Are you an alarm clock? Because you make my heart race every morning. ⏰",
  "If you were a vegetable, you'd be a cute-cumber. 🥒😄",
  "Are you a magnet? Because I'm attracted to you. 🧲",
  "Can I follow you home? My parents always told me to follow my dreams. 💭",
];

const roastLines = [
  "You're not stupid, you just have bad luck thinking. 🧠",
  "I'd agree with you but then we'd both be wrong. 😂",
  "You're like a cloud — when you disappear, it's a beautiful day. ☀️",
  "You have your entire life to be an idiot. Why not take today off? 😴",
  "I was going to roast you but my mom said I shouldn't burn trash. 🗑️🔥",
  "You're proof that evolution can go in reverse. 🐒",
  "I'd give you a nasty look but you already have one. 😬",
  "Brains aren't everything. In your case they're nothing. 💭",
  "You're like a software update — whenever I see you, I think 'not now'. 💻",
  "Keep rolling your eyes, maybe you'll find a brain back there. 👀",
];

const loveAdvice = [
  "Love is not about finding the perfect person, it's about seeing an imperfect person perfectly. 💕",
  "The best relationship is one where you love each other more than you need each other. 💑",
  "A great relationship is about two things: appreciating similarities and respecting differences. 🤝",
  "Never stop doing the little things that matter. Those are the ones that matter most. 💌",
  "Love is not just a feeling, it's a daily choice to put someone else first. 💝",
  "The secret to a lasting relationship: laugh together, grow together, stay together. 😂🌱",
  "Always choose love over pride. Your ego will never keep you warm at night. 🔥",
  "A partner who makes you laugh is worth more than all the money in the world. 😂💰",
];

const shipNames = [
  ["fire", "ice"], ["sun", "moon"], ["star", "sky"],
  ["rose", "thorn"], ["day", "night"], ["storm", "calm"],
];

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function generateShipName(name1, name2) {
  const half1 = name1.slice(0, Math.ceil(name1.length / 2));
  const half2 = name2.slice(Math.floor(name2.length / 2));
  return half1 + half2;
}

function loveMeter(name1, name2) {
  let score = 0;
  const combined = (name1 + name2).toLowerCase();
  for (let i = 0; i < combined.length; i++) score += combined.charCodeAt(i);
  return (score % 100) + 1;
}

async function handleFun(sock, msg, cmd, args) {
  const jid = msg.key.remoteJid;

  switch (cmd) {
    case 'joke':
      try { await sock.sendMessage(jid, { text: `😂 *ⓙⓞⓚⓔ*\n\n${STYLES.fun(rand(jokes))}` }); console.log("[SENT] joke ok"); } catch(e) { console.log("[FAIL] joke:", e.message); }
      break;

    case 'fact':
      await sock.sendMessage(jid, { text: `🧠 *𝗥𝗮𝗻𝗱𝗼𝗺 𝗙𝗮𝗰𝘁:*\n\n${STYLES.ai(rand(facts))}` });
      break;

    case 'trivia': {
      const t = rand(triviaList);
      await sock.sendMessage(jid, {
        text: `🎯 *Trivia Question:*\n\n${t.q}\n\n_Reply with your answer, then type !answer to reveal._`,
      });
      global.lastTrivia = global.lastTrivia || {};
      global.lastTrivia[jid] = t.a;
      break;
    }

    case 'riddle': {
      const r = rand(riddles);
      await sock.sendMessage(jid, {
        text: `🧩 *Riddle:*\n\n${r.q}\n\n_Think about it... Type !answer when ready._`,
      });
      global.lastTrivia = global.lastTrivia || {};
      global.lastTrivia[jid] = r.a;
      break;
    }

    case '8ball': {
      const answers = [
        "✅ It is certain.", "✅ Without a doubt.", "✅ Yes, definitely.",
        "✅ Most likely.", "🤔 Ask again later.", "🤔 Cannot predict now.",
        "❌ Don't count on it.", "❌ Very doubtful.", "❌ My sources say no.",
      ];
      const q = args.join(' ');
      if (!q) { await sock.sendMessage(jid, { text: '❌ Usage: !8ball <question>' }); return; }
      await sock.sendMessage(jid, { text: `🎱 *${q}*\n\n${rand(answers)}` });
      break;
    }

    case 'horoscope': {
      const sign = args[0]?.toLowerCase();
      if (!sign || !horoscopes[sign]) {
        await sock.sendMessage(jid, {
          text: `❌ Usage: !horoscope <sign>\nSigns: ${Object.keys(horoscopes).join(', ')}`,
        });
        return;
      }
      await sock.sendMessage(jid, { text: horoscopes[sign] });
      break;
    }

    case 'truth':
      await sock.sendMessage(jid, { text: `💬 *𝓣𝓻𝓾𝓽𝓱:*\n\n${STYLES.flirt(rand(truthQuestions))}` });
      break;

    case 'dare':
      await sock.sendMessage(jid, { text: `🔥 *𝗗𝗮𝗿𝗲:*\n\n${STYLES.fun(rand(dares))}` });
      break;

    case 'spicydare':
      await sock.sendMessage(jid, { text: `🌶️ *𝓢𝓹𝓲𝓬𝔂 𝓓𝓪𝓻𝓮:*\n\n${STYLES.flirt(rand(spicyDares))}` });
      break;

    case 'compliment':
      await sock.sendMessage(jid, { text: `💝 *𝓒𝓸𝓶𝓹𝓵𝓲𝓶𝓮𝓷𝓽:*\n\n${STYLES.flirt(rand(compliments))}` });
      break;

    case 'seduce':
      await sock.sendMessage(jid, { text: `😏 *𝓕𝓵𝓲𝓻𝓽 𝓛𝓲𝓷𝓮:*\n\n${STYLES.flirt(rand(seduceLines))}` });
      break;

    case 'couple':
      await sock.sendMessage(jid, { text: `👫 *𝓒𝓸𝓾𝓹𝓵𝓮 𝓒𝓱𝓪𝓵𝓵𝓮𝓷𝓰𝓮:*\n\n${STYLES.flirt(rand(couplesChallenges))}` });
      break;

    case 'wyr':
      await sock.sendMessage(jid, { text: `🤔 *𝗪𝗼𝘂𝗹𝗱 𝗬𝗼𝘂 𝗥𝗮𝘁𝗵𝗲𝗿:*\n\n${STYLES.fun(rand(wouldYouRather))}` });
      break;

    case 'pickup':
      await sock.sendMessage(jid, { text: `💘 *𝓟𝓲𝓬𝓴𝓾𝓹 𝓛𝓲𝓷𝓮:*\n\n${STYLES.flirt(rand(pickupLines))}` });
      break;

    case 'roast': {
      const target = args.join(' ') || 'you';
      await sock.sendMessage(jid, { text: `🔥 *Roasting ${target}:*\n\n${rand(roastLines)}` });
      break;
    }

    case 'loveadvice':
      await sock.sendMessage(jid, { text: `💕 *𝓛𝓸𝓿𝓮 𝓐𝓭𝓿𝓲𝓬𝓮:*\n\n${STYLES.flirt(rand(loveAdvice))}` });
      break;

    case 'lovemeter': {
      const name1 = args[0] || 'you';
      const name2 = args[1] || 'them';
      const score = loveMeter(name1, name2);
      const hearts = '❤️'.repeat(Math.floor(score / 10));
      await sock.sendMessage(jid, {
        text: `💕 *Love Meter*\n\n${name1} + ${name2}\n\n${hearts}\n\n*${score}% compatible!* ${score > 80 ? '🔥 Perfect match!' : score > 60 ? '💕 Great potential!' : score > 40 ? '🤔 Could work!' : '💔 Keep looking!'}`,
      });
      break;
    }

    case 'shipname': {
      const name1 = args[0];
      const name2 = args[1];
      if (!name1 || !name2) { await sock.sendMessage(jid, { text: '❌ Usage: !shipname <name1> <name2>' }); return; }
      const ship = generateShipName(name1, name2);
      await sock.sendMessage(jid, {
        text: `💑 *Ship Name for ${name1} & ${name2}:*\n\n*${ship.charAt(0).toUpperCase() + ship.slice(1)}* 💕`,
      });
      break;
    }

    case 'spin': {
      const members = args.length ? args : ['Player 1', 'Player 2', 'Player 3'];
      const chosen = rand(members);
      await sock.sendMessage(jid, { text: `🌀 The bottle spins...\n\n🎯 It lands on: *${chosen}*!` });
      break;
    }

    case 'rps': {
      const choice = args[0]?.toLowerCase();
      const options = ['rock', 'paper', 'scissors'];
      if (!options.includes(choice)) {
        await sock.sendMessage(jid, { text: '❌ Usage: !rps rock/paper/scissors' });
        return;
      }
      const bot = rand(options);
      const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
      let result = '';
      if (choice === bot) result = "It's a *tie*! 🤝";
      else if ((choice==='rock'&&bot==='scissors')||(choice==='paper'&&bot==='rock')||(choice==='scissors'&&bot==='paper'))
        result = "You *win*! 🎉";
      else result = "You *lose*! 😈";
      await sock.sendMessage(jid, {
        text: `🎮 *Rock Paper Scissors*\n\nYou: ${emojis[choice]} ${choice}\nMe: ${emojis[bot]} ${bot}\n\n${result}`,
      });
      break;
    }

    case 'coinflip':
      await sock.sendMessage(jid, {
        text: `🪙 Flipping coin...\n\n*${Math.random() > 0.5 ? '🦅 HEADS' : '🔢 TAILS'}*!`,
      });
      break;
  }
}

const horoscopes = {
  aries: "♈ Bold moves pay off today. Your energy is magnetic — use it!",
  taurus: "♉ Patience is your superpower. Financial luck improves this week.",
  gemini: "♊ Communication is key. A conversation changes everything.",
  cancer: "♋ Trust your gut. Home and family bring comfort today.",
  leo: "♌ You're in the spotlight — own it. Creative projects shine.",
  virgo: "♍ Details matter today. Your hard work is about to pay off.",
  libra: "♎ Balance is restored. Relationships bloom under today's energy.",
  scorpio: "♏ Transformation is near. Embrace change — it's working for you.",
  sagittarius: "♐ Adventure calls. A new opportunity is closer than you think.",
  capricorn: "♑ Discipline pays dividends. Stay the course — you're almost there.",
  aquarius: "♒ Innovation sparks today. Your unique ideas will be noticed.",
  pisces: "♓ Intuition is sharp. Creative and spiritual energy is high.",
};

module.exports = { handleFun };
