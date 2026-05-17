# 🤖 xssrat WhatsApp Bot v2.0

> A powerful, feature-rich WhatsApp bot built with Node.js & Baileys

[

![Node.js](https://img.shields.io/badge/Node.js-20.x-green?style=flat-square&logo=node.js)

](https://nodejs.org)
[

![Baileys](https://img.shields.io/badge/Baileys-Latest-blue?style=flat-square)

](https://github.com/WhiskeySockets/Baileys)
[

![Railway](https://img.shields.io/badge/Deploy-Railway-purple?style=flat-square)

](https://railway.app)
[

![GitHub](https://img.shields.io/badge/GitHub-gatiella-black?style=flat-square&logo=github)

](https://github.com/gatiella)

---

## Features (100+ Commands)

| Category | Commands |
|----------|----------|
| Basic | ping, uptime, info, id, echo, menu |
| Group | kick, add, promote, demote, rename, warn, mute, poll, tagall, rules, setrules, vote, leaderboard, raffle, welcome, antispam, antilink, inactive |
| AI | ask, ai, summarize, translate, code, sentiment, imagine, advice, story, poem, recipe, debate, explain, compare, chat, persona, clearchat |
| Fun | joke, fact, riddle, trivia, 8ball, horoscope, truth, dare, spicydare, spin, rps, coinflip |
| Flirt | seduce, pickup, compliment, rizz, roast, couple, wyr, lovemeter, shipname, loveadvice, suggestreply |
| Info | weather, crypto, stock, news, define, ip, calc, convert, qr, password, time |
| Writing | grammar, rewrite, emoji, bio, caption, name, summarizelink |
| Productivity | remind, todo, note, schedule, broadcast, autoreply, stats |
| Professional | meeting, email, cv, invoice, quiz, coverlettr |
| Special | nightmode, ghostmode, busy, spy, stalk, mood, rate, confess, anonymous, scheduledm, recall, autodelete |
| Personal | journal, myjournal, motivate, vent, affirmation |
| Admin | ban, unban, setprefix, addkeyword, delkeyword, keywords, logs |

---

## New Features

- Session restore from URL — no re-pairing after redeploy
- Spy mode — forward group messages to your DM privately
- Deleted message recovery — captures messages before deletion
- Single beautiful menu — type !menu for all commands
- Broadcast to all groups at once
- Scheduled daily messages
- AI-powered auto-replies with keyword triggers

---

## Quick Start

    git clone https://github.com/gatiella/whatsapp_bot_v2.git
    cd whatsapp_bot_v2
    npm install
    cp .env.example .env
    nano .env
    npm start

Pair with WhatsApp:
WhatsApp -> Linked Devices -> Link a Device -> Link with phone number

After connected, generate session for Railway:

    node getsession.js > session.txt
    node -e "
    const fs = require('fs');
    const s = fs.readFileSync('session.txt','utf8').trim();
    fetch('https://api.pastes.dev/post',{method:'POST',headers:{'Content-Type':'text/plain'},body:s})
    .then(r=>r.json()).then(d=>console.log('SESSION_URL=https://api.pastes.dev/'+d.key));
    "

Add the SESSION_URL to Railway environment variables.

---

## Configuration (.env)

    PREFIX=!
    BOT_NAME=xssrat
    OWNER_NUMBER=254XXXXXXXXX
    OWNER_LID=your_lid_here
    ADMIN_NUMBERS=254XXXXXXXXX
    OPENROUTER_API_KEY=your_key_here
    OPENWEATHER_KEY=your_key_here
    NEWSAPI_KEY=your_key_here
    ALPHAVANTAGE_KEY=your_key_here
    BROADCAST_LIST=254XXXXXXXXX,254XXXXXXXXX
    SESSION_URL=https://api.pastes.dev/xxxxxxxx

### Free API Keys
| Service | Link |
|---------|------|
| AI (Claude/GPT/Gemini) | openrouter.ai |
| Weather | openweathermap.org |
| News | newsapi.org |
| Stocks | alphavantage.co |

---

## Key Commands

    !menu                        Beautiful single menu
    !broadcast all <msg>         Send to all your groups
    !broadcast list <msg>        Send to contact list
    !schedule add 08:00 <msg>    Schedule daily message
    !autoreply add <kw> <reply>  Auto-reply keyword
    !spy on                      Forward group msgs to your DM
    !spy off                     Stop forwarding
    !stalk <number>              Check WhatsApp profile
    !ask <question>              Ask AI anything
    !crypto bitcoin              Live crypto price
    !weather Nairobi             Weather forecast
    !remind 30m Call client      Set reminder
    !chat <msg>                  AI with memory
    !nightmode on                Flirty mode after 10pm
    !confess <msg>               Anonymous group confession

---

## Deploy to Railway

1. Push to GitHub
2. Railway -> New Project -> Deploy from GitHub
3. Add all environment variables including SESSION_URL
4. No volume needed - session restores from URL automatically

## Deploy to Render

1. Push to GitHub
2. New Web Service -> Connect repo
3. Build: npm install | Start: npm start
4. Add all env vars including SESSION_URL

---

## Project Structure

    whatsapp_bot_v2/
    index.js          Entry point
    client.js         WhatsApp connection + spy + deleted msgs
    config.js         Config loader
    getsession.js     Generate session string
    handlers/
      dispatcher.js   Routes all commands
      basic.js        Basic + menu
      group.js        Group management
      group_extra.js  tagall, rules, vote, leaderboard, raffle
      ai.js           AI features
      fun.js          Fun & games & flirt
      info.js         Info & utilities
      media.js        Sticker, OCR, YouTube
      productivity.js Remind, todo, note, broadcast, schedule
      special.js      Nightmode, mood, confess, anonymous
      unique.js       Spy, stalk, ghostmode, chat, rizz
      personal.js     Journal, motivate, vent, grammar
      admin.js        Ban, unban, setprefix, keywords
    core/
      autoreply.js    Keyword auto-reply engine
      antispam.js     Anti-spam + anti-link engine
      scheduler.js    Cron scheduler
    db/database.js    SQLite database
    utils/
      helpers.js      JID, text, mention helpers
      logger.js       Pino logger
      send.js         Safe message sender with retry
      session.js      Session encode/decode/restore

---

Built by xssrat - github.com/gatiella
