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
];

const dares = [
  "Send a voice note singing for 10 seconds.",
  "Change your status to something embarrassing for 10 minutes.",
  "Send a selfie with the silliest face you can make.",
  "Text someone 'I know what you did' and share their reaction.",
  "Do 10 push-ups and send proof.",
];

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

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

async function handleFun(sock, msg, cmd, args) {
  const jid = msg.key.remoteJid;

  switch (cmd) {
    case 'joke':
      try { await sock.sendMessage(jid, { text: `😂 ${rand(jokes)}` }); console.log("[SENT] joke ok"); } catch(e) { console.log("[FAIL] joke:", e.message); }
      break;

    case 'fact':
      await sock.sendMessage(jid, { text: `🧠 *Random Fact:*\n${rand(facts)}` });
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
      await sock.sendMessage(jid, { text: `💬 *Truth:*\n\n${rand(truthQuestions)}` });
      break;

    case 'dare':
      await sock.sendMessage(jid, { text: `🔥 *Dare:*\n\n${rand(dares)}` });
      break;

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

module.exports = { handleFun };
