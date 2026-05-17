# 🤖 xssrat WhatsApp Bot v2.0

> A powerful, feature-rich WhatsApp bot built with Node.js & Baileys

[

![Node.js](https://img.shields.io/badge/Node.js-20.x-green?style=flat-square&logo=node.js)

](https://nodejs.org)
[

![Baileys](https://img.shields.io/badge/Baileys-Latest-blue?style=flat-square)

](https://github.com/WhiskeySockets/Baileys)
[

![GitHub](https://img.shields.io/badge/GitHub-gatiella-black?style=flat-square&logo=github)

](https://github.com/gatiella)

---

## Features (100+ Commands)

| Category | Commands |
|----------|----------|
| Basic | ping, uptime, info, echo, id |
| Group | kick, add, promote, demote, rename, warn, poll, tagall, rules, vote, leaderboard, raffle |
| AI | ask, summarize, translate, code, story, poem, recipe, debate, explain, compare, advice |
| Fun | joke, fact, riddle, trivia, 8ball, horoscope, truth, dare, rps, coinflip |
| Flirt | seduce, pickup, compliment, lovemeter, shipname, rizz, roast, couple, wyr |
| Info | weather, crypto, stock, news, define, calc, convert, qr, password, time, ip |
| Writing | grammar, rewrite, emoji, bio, caption, name, summarizelink |
| Productivity | remind, todo, note, schedule, broadcast, stats, habit, goal, expense |
| Professional | meeting, email, cv, invoice, quiz, coverlettr |
| Special | nightmode, ghostmode, busy, spy, mood, confess, anonymous, recall, autodelete |
| Personal | journal, motivate, vent, affirmation |
| Admin | ban, unban, setprefix, addkeyword, delkeyword, keywords, logs |

---

## Quick Start

### Prerequisites
- Node.js 20+
- A WhatsApp account
- OpenRouter API key (free at openrouter.ai)

### Installation

    git clone https://github.com/gatiella/whatsapp_bot_v2.git
    cd whatsapp_bot_v2
    npm install
    cp .env.example .env
    nano .env
    npm start

Scan the pairing code shown in terminal:
WhatsApp -> Linked Devices -> Link a Device -> Link with phone number

---

## Configuration (.env)

    PREFIX=!
    BOT_NAME=xssrat
    OWNER_NUMBER=254XXXXXXXXX
    OPENROUTER_API_KEY=your_key_here
    OPENWEATHER_KEY=your_key_here
    NEWSAPI_KEY=your_key_here
    BROADCAST_LIST=254XXXXXXXXX,254XXXXXXXXX

### Free API Keys
| Service | Link |
|---------|------|
| AI | openrouter.ai |
| Weather | openweathermap.org |
| News | newsapi.org |
| Stocks | alphavantage.co |

---

## Key Commands

    !broadcast all <msg>         Send to all groups
    !broadcast list <msg>        Send to contact list
    !schedule add 08:00 <msg>    Schedule daily message
    !autoreply add price <reply> Auto-reply keyword
    !ask <question>              Ask AI anything
    !translate French <text>     Translate text
    !weather Nairobi             Weather forecast
    !crypto bitcoin              Crypto price
    !remind 30m Call client      Set reminder
    !sticker                     Convert image to sticker

---

## Deploy to Railway

1. Push to GitHub
2. Railway -> New Project -> Deploy from GitHub
3. Add environment variables
4. Add Volume mounted at /app/auth_info

## Deploy to Render

1. Push to GitHub
2. New Web Service -> Connect repo
3. Build: npm install | Start: npm start
4. Add Disk at /app/auth_info

---

## Project Structure

    whatsapp_bot_v2/
    handlers/
      dispatcher.js  basic.js  group.js  ai.js
      fun.js  info.js  media.js  productivity.js
      special.js  unique.js  personal.js  admin.js
    core/
      autoreply.js  antispam.js  scheduler.js
    db/database.js
    utils/
      helpers.js  logger.js  send.js

---

Built by xssrat - github.com/gatiella
