const { getJID } = require('../utils/helpers');
const math = require('mathjs');
const QRCode = require('qrcode');
const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

async function handleInfo(sock, msg, cmd, args) {
  const jid = getJID(msg);

  switch (cmd) {
    case 'weather': {
      const city = args.join(' ');
      if (!city) { await sock.sendMessage(jid, { text: '❌ Usage: !weather <city>' }); return; }
      try {
        const key = process.env.OPENWEATHER_KEY;
        if (!key) { await sock.sendMessage(jid, { text: '❌ Set OPENWEATHER_KEY in .env (free at openweathermap.org)' }); return; }
        const res = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${key}&units=metric`);
        const d = res.data;
        await sock.sendMessage(jid, {
          text: `🌤️ *Weather in ${d.name}, ${d.sys.country}*\n\n` +
            `🌡️ Temp: *${d.main.temp}°C* (feels like ${d.main.feels_like}°C)\n` +
            `💧 Humidity: *${d.main.humidity}%*\n` +
            `💨 Wind: *${d.wind.speed} m/s*\n` +
            `☁️ Condition: *${d.weather[0].description}*`,
        });
      } catch { await sock.sendMessage(jid, { text: '❌ City not found.' }); }
      break;
    }

    case 'crypto': {
      const coin = (args[0] || 'bitcoin').toLowerCase();
      try {
        const res = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd&include_24hr_change=true`);
        const data = res.data[coin];
        if (!data) { await sock.sendMessage(jid, { text: `❌ Coin "${coin}" not found.` }); return; }
        const change = data.usd_24h_change?.toFixed(2);
        const arrow = change >= 0 ? '📈' : '📉';
        await sock.sendMessage(jid, {
          text: `💰 *${coin.toUpperCase()}*\n\n$${data.usd.toLocaleString()} USD\n${arrow} 24h: ${change}%`,
        });
      } catch { await sock.sendMessage(jid, { text: '❌ Failed to fetch crypto price.' }); }
      break;
    }

    case 'stock': {
      const sym = args[0]?.toUpperCase();
      if (!sym) { await sock.sendMessage(jid, { text: '❌ Usage: !stock <symbol> (e.g. !stock AAPL)' }); return; }
      try {
        const key = process.env.ALPHAVANTAGE_KEY;
        if (!key) { await sock.sendMessage(jid, { text: '❌ Set ALPHAVANTAGE_KEY in .env (free at alphavantage.co)' }); return; }
        const res = await axios.get(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${key}`);
        const q = res.data['Global Quote'];
        if (!q || !q['05. price']) { await sock.sendMessage(jid, { text: '❌ Symbol not found.' }); return; }
        const change = parseFloat(q['10. change percent']).toFixed(2);
        const arrow = parseFloat(change) >= 0 ? '📈' : '📉';
        await sock.sendMessage(jid, {
          text: `📊 *${sym}*\n\n$${parseFloat(q['05. price']).toFixed(2)}\n${arrow} ${change}% today`,
        });
      } catch { await sock.sendMessage(jid, { text: '❌ Stock lookup failed.' }); }
      break;
    }

    case 'news': {
      const topic = args.join(' ') || 'technology';
      try {
        const key = process.env.NEWSAPI_KEY;
        if (!key) { await sock.sendMessage(jid, { text: '❌ Set NEWSAPI_KEY in .env (free at newsapi.org)' }); return; }
        const res = await axios.get(`https://newsapi.org/v2/everything?q=${encodeURIComponent(topic)}&pageSize=5&sortBy=publishedAt&apiKey=${key}`);
        const articles = res.data.articles;
        if (!articles?.length) { await sock.sendMessage(jid, { text: '❌ No news found.' }); return; }
        const lines = articles.map((a, i) => `${i+1}. *${a.title}*\n   ${a.url}`);
        await sock.sendMessage(jid, { text: `📰 *Top News: ${topic}*\n\n${lines.join('\n\n')}` });
      } catch { await sock.sendMessage(jid, { text: '❌ News fetch failed.' }); }
      break;
    }

    case 'define': {
      const word = args[0];
      if (!word) { await sock.sendMessage(jid, { text: '❌ Usage: !define <word>' }); return; }
      try {
        const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
        const entry = res.data[0];
        const meaning = entry.meanings[0];
        const def = meaning.definitions[0];
        await sock.sendMessage(jid, {
          text: `📖 *${entry.word}* (${meaning.partOfSpeech})\n\n${def.definition}${def.example ? `\n\n_"${def.example}"_` : ''}`,
        });
      } catch { await sock.sendMessage(jid, { text: `❌ Definition not found for "${args[0]}".` }); }
      break;
    }

    case 'ip': {
      const ip = args[0];
      if (!ip) { await sock.sendMessage(jid, { text: '❌ Usage: !ip <ip address>' }); return; }
      try {
        const res = await axios.get(`http://ip-api.com/json/${ip}`);
        const d = res.data;
        await sock.sendMessage(jid, {
          text: `🌐 *IP Info: ${ip}*\n\n📍 Location: ${d.city}, ${d.regionName}, ${d.country}\n🏢 ISP: ${d.isp}\n🕐 Timezone: ${d.timezone}`,
        });
      } catch { await sock.sendMessage(jid, { text: '❌ IP lookup failed.' }); }
      break;
    }

    case 'calc': {
      const expr = args.join(' ');
      if (!expr) { await sock.sendMessage(jid, { text: '❌ Usage: !calc <expression>' }); return; }
      try {
        const result = math.evaluate(expr);
        await sock.sendMessage(jid, { text: `🧮 *${expr}* = *${result}*` });
      } catch { await sock.sendMessage(jid, { text: '❌ Invalid expression.' }); }
      break;
    }

    case 'convert': {
      // !convert 100 usd to kes
      const amount = parseFloat(args[0]);
      const from = args[1]?.toUpperCase();
      const to = args[3]?.toUpperCase() || args[2]?.toUpperCase();
      if (!amount || !from || !to) {
        await sock.sendMessage(jid, { text: '❌ Usage: !convert 100 USD to KES' }); return;
      }
      try {
        const res = await axios.get(`https://open.er-api.com/v6/latest/${from}`);
        const rate = res.data.rates[to];
        if (!rate) { await sock.sendMessage(jid, { text: `❌ Unknown currency: ${to}` }); return; }
        const converted = (amount * rate).toFixed(2);
        await sock.sendMessage(jid, { text: `💱 *${amount} ${from}* = *${converted} ${to}*` });
      } catch { await sock.sendMessage(jid, { text: '❌ Conversion failed.' }); }
      break;
    }

    case 'qr': {
      const text = args.join(' ');
      if (!text) { await sock.sendMessage(jid, { text: '❌ Usage: !qr <text or url>' }); return; }
      try {
        const buffer = await QRCode.toBuffer(text, { width: 512 });
        await sock.sendMessage(jid, { image: buffer, caption: `🔲 QR code for: ${text}` });
      } catch { await sock.sendMessage(jid, { text: '❌ QR generation failed.' }); }
      break;
    }

    case 'password': {
      const len = parseInt(args[0]) || 16;
      if (len < 4 || len > 128) { await sock.sendMessage(jid, { text: '❌ Length must be between 4 and 128.' }); return; }
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
      let pwd = '';
      for (let i = 0; i < len; i++) {
        pwd += chars[crypto.randomInt(chars.length)];
      }
      await sock.sendMessage(jid, { text: `🔐 Generated password (${len} chars):\n\`${pwd}\`` });
      break;
    }

    case 'time': {
      const city = args.join(' ') || 'UTC';
      try {
        const res = await axios.get(`https://worldtimeapi.org/api/timezone/${city.replace(' ', '_')}`);
        const d = new Date(res.data.datetime);
        await sock.sendMessage(jid, {
          text: `🕐 *Time in ${city}*\n\n${d.toLocaleString('en-US', { timeZone: res.data.timezone })}`,
        });
      } catch { await sock.sendMessage(jid, { text: '❌ Usage: !time Africa/Nairobi (use timezone format)' }); }
      break;
    }
  }
}

module.exports = { handleInfo };
