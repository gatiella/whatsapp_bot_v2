const { getJID, getMessageText } = require('../utils/helpers');
const { safeSend } = require('../utils/send');

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const MODELS = [
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'deepseek/deepseek-v4-flash:free',
];

async function askAI(prompt, system) {
  for (const model of MODELS) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + OPENROUTER_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt }
          ],
          max_tokens: 400,
        }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content;
      if (reply) return reply;
    } catch (_) {}
  }
  return null;
}

// Global state
global.ghostMode = global.ghostMode || {};
global.busyMode = global.busyMode || {};
global.spyMode = global.spyMode || {};
global.personas = global.personas || {};
global.chatHistory = global.chatHistory || {};
global.scheduledDMs = global.scheduledDMs || [];
global.lastBotMessage = global.lastBotMessage || {};
global.botMessages = global.botMessages || {};

async function handleUnique(sock, msg, cmd, args) {
  const jid = getJID(msg);
  const sender = msg.key.participant || msg.key.remoteJid;
  const input = args.join(' ');
  const isGroup = jid.endsWith('@g.us');
  const ownerNumber = process.env.OWNER_NUMBER || '';

  switch (cmd) {

    case 'stalk': {
      const number = args[0]?.replace(/[^0-9]/g, '');
      if (!number) { await safeSend(sock, jid, { text: '❌ Usage: !stalk <number>\nExample: !stalk 254712345678' }); return; }
      await safeSend(sock, jid, { text: '🔍 Stalking...' });
      try {
        const jidToCheck = number + '@s.whatsapp.net';
        const [result] = await sock.onWhatsApp(jidToCheck);
        if (!result?.exists) {
          await safeSend(sock, jid, { text: `⚠️ *+${number}* is not on WhatsApp.\n\n🔍 Try searching manually:\n• https://www.truecaller.com/search/ke/${number}\n• https://www.facebook.com/search/people/?q=${number}` });
          return;
        }

        let text = `🕵️ *Stalk Report*\n\n📱 Number: *+${number}*\n✅ On WhatsApp: Yes`;

        // Last seen / online
        try {
          const presence = await sock.fetchPresenceUpdates(jidToCheck);
          if (presence?.lastKnownPresence === 'available') {
            text += `\n🟢 Status: Online`;
          } else if (presence?.lastSeen) {
            text += `\n🕐 Last seen: ${new Date(presence.lastSeen * 1000).toLocaleString()}`;
          } else {
            text += `\n🕐 Last seen: Hidden`;
          }
        } catch { text += `\n🕐 Last seen: Hidden`; }

        // About / status
        try {
          const profile = await sock.fetchStatus(jidToCheck);
          if (profile?.status) text += `\n📝 About: _${profile.status}_`;
          if (profile?.setAt) text += `\n🗓️ About updated: ${new Date(profile.setAt).toLocaleDateString()}`;
        } catch {}

        // Business profile
        try {
          const biz = await sock.getBusinessProfile(jidToCheck);
          if (biz) {
            if (biz.description) text += `\n🏢 Business: ${biz.description}`;
            if (biz.category) text += `\n📂 Category: ${biz.category}`;
            if (biz.email) text += `\n📧 Email: ${biz.email}`;
            if (biz.website?.length) text += `\n🌐 Website: ${biz.website[0]}`;
          }
        } catch {}

        // AbstractAPI phone intelligence
        try {
          const abstractKey = process.env.ABSTRACTAPI_KEY;
          if (abstractKey) {
            const apiRes = await fetch(`https://phoneintelligence.abstractapi.com/v1/?api_key=${abstractKey}&phone=${number}`);
            const apiData = await apiRes.json();
            if (apiData && !apiData.error) {
              const fmt = apiData.phone_format?.international || '+' + number;
              const carrier = apiData.phone_carrier?.name;
              const lineType = apiData.phone_carrier?.line_type;
              const country = apiData.phone_location?.country_name;
              const region = apiData.phone_location?.region;
              const tz = apiData.phone_location?.timezone;
              const isValid = apiData.phone_validation?.is_valid;
              const lineStatus = apiData.phone_validation?.line_status;
              const isVoip = apiData.phone_validation?.is_voip;
              const riskLevel = apiData.phone_risk?.risk_level;
              const isDisposable = apiData.phone_risk?.is_disposable;
              const breaches = apiData.phone_breaches?.total_breaches;
              const firstBreach = apiData.phone_breaches?.date_first_breached;
              const lastBreach = apiData.phone_breaches?.date_last_breached;

              text += `\n\n📡 *Phone Intelligence*`;
              text += `\n📞 Format: ${fmt}`;
              if (carrier) text += `\n🗼 Carrier: ${carrier}`;
              if (lineType) text += `\n📱 Line type: ${lineType}`;
              if (isVoip !== null) text += `\n🌐 VoIP: ${isVoip ? 'Yes ⚠️' : 'No'}`;
              if (lineStatus) text += `\n✅ Line status: ${lineStatus}`;
              if (country) text += `\n🌍 Country: ${country}`;
              if (region && region !== country) text += `\n📍 Region: ${region}`;
              if (tz) text += `\n🕐 Timezone: ${tz}`;
              if (isValid === false) text += `\n⚠️ Number invalid`;
              if (riskLevel) text += `\n⚠️ Risk level: ${riskLevel}`;
              if (isDisposable) text += `\n🚨 Disposable number: Yes`;
              if (breaches) {
                text += `\n\n🔓 *Data Breaches*`;
                text += `\n💥 Total breaches: ${breaches}`;
                if (firstBreach) text += `\n📅 First breach: ${firstBreach}`;
                if (lastBreach) text += `\n📅 Last breach: ${lastBreach}`;
              }
            }
          }
        } catch {}

        // Country from prefix
        const cc = number.slice(0, number.length > 11 ? 3 : number.length > 10 ? 3 : 2);
        const countries = {'254':'🇰🇪 Kenya','255':'🇹🇿 Tanzania','256':'🇺🇬 Uganda','251':'🇪🇹 Ethiopia','234':'🇳🇬 Nigeria','27':'🇿🇦 South Africa','1':'🇺🇸 US/Canada','44':'🇬🇧 UK','91':'🇮🇳 India','86':'🇨🇳 China','49':'🇩🇪 Germany','33':'🇫🇷 France'};
        const country = countries[number.slice(0,3)] || countries[number.slice(0,2)] || '🌍 Unknown';
        text += `\n🌍 Country: ${country}`;

        // Account type
        text += `\n👤 Type: ${result.isBusiness ? '🏢 Business' : '👤 Personal'}`;

        // Mutual groups
        try {
          const groups = await sock.groupFetchAllParticipating();
          const mutual = Object.values(groups).filter(g =>
            g.participants?.some(p => p.id === jidToCheck || p.id === result.lid)
          ).map(g => g.subject);
          if (mutual.length) {
            text += `\n👥 Mutual groups (${mutual.length}): ${mutual.slice(0, 3).join(', ')}${mutual.length > 3 ? ` +${mutual.length - 3} more` : ''}`;
          } else {
            text += `\n👥 Mutual groups: None`;
          }
        } catch {}

        // Blocked check
        try {
          const blocklist = await sock.fetchBlocklist();
          const isBlocked = blocklist?.some(b => b === jidToCheck);
          if (isBlocked) text += `\n🚫 You have blocked this number`;
        } catch {}

        // WhatsApp LID
        if (result.lid) text += `\n🔢 WA ID: ${result.lid}`;

        // Push name
        if (result.name) text += `\n📛 Name: ${result.name}`;

        // Direct link
        text += `\n🔗 Link: https://wa.me/${number}`;

        // Platform registration checks
        text += `\n\n🌐 *Platform Checks*`;

        // Snapchat
        try {
          const sr = await fetch('https://accounts.snapchat.com/accounts/get_username_suggestions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `phone_number=%2B${number}`
          });
          const sd = await sr.json();
          text += `\n📸 Snapchat: ${sd?.username_suggestions?.length || sr.status === 200 ? '✅ Registered' : '❌ Not found'}`;
        } catch { text += `\n📸 Snapchat: ⚠️ Failed`; }

        // Instagram
        try {
          const ir = await fetch('https://www.instagram.com/accounts/account_recovery_send_ajax/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-CSRFToken': 'missing', 'X-Requested-With': 'XMLHttpRequest' },
            body: `phone_number=${encodeURIComponent('+' + number)}`
          });
          const id = await ir.json();
          text += `\n📷 Instagram: ${id?.success || id?.message === 'success' ? '✅ Registered' : '❌ Not found'}`;
        } catch { text += `\n📷 Instagram: ⚠️ Failed`; }

        // Amazon
        try {
          const ar = await fetch('https://www.amazon.com/ap/signin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `email=%2B${number}&create=0`
          });
          const at = await ar.text();
          text += `\n🛒 Amazon: ${at.includes('auth-password') || at.includes('password') ? '✅ Registered' : '❌ Not found'}`;
        } catch { text += `\n🛒 Amazon: ⚠️ Failed`; }

        // WhatsApp already checked above
        text += `\n💬 WhatsApp: ${result?.exists ? '✅ Registered' : '❌ Not found'}`;

        // Telegram
        text += `\n✈️ Telegram: t.me/+${number}`;

        // Search links
        const encoded = encodeURIComponent('+' + number);
        text += `\n\n🔗 *Search Links*`;
        text += `\n• 🌐 Google: https://www.google.com/search?q=${encoded}`;
        text += `\n• 🖼️ Google Images: https://www.google.com/search?tbm=isch&q=${encoded}`;
        text += `\n• 📞 Truecaller: https://www.truecaller.com/search/ke/${number}`;
        text += `\n• 👤 Facebook: https://www.facebook.com/search/people/?q=${number}`;
        text += `\n• 📸 Instagram: https://www.instagram.com/explore/search/keyword/?q=${encoded}`;
        text += `\n• 🎵 TikTok: https://www.tiktok.com/search?q=${encoded}`;
        text += `\n• 🐦 Twitter/X: https://x.com/search?q=${encoded}`;
        text += `\n• 💼 LinkedIn: https://www.linkedin.com/search/results/people/?keywords=${encoded}`;
        text += `\n• ▶️ YouTube: https://www.youtube.com/results?search_query=${encoded}`;
        text += `\n• 👻 Snapchat: https://www.snapchat.com/add/${number}`;

        // Profile picture (high-res fallback to low-res)
        const ppUrl = await sock.profilePictureUrl(jidToCheck, 'image').catch(() => null) ||
          await sock.profilePictureUrl(jidToCheck, 'preview').catch(() => null) ||
          await sock.profilePictureUrl(jidToCheck, 'thumbnail').catch(() => null);
        if (ppUrl) {
          await sock.sendMessage(jid, { image: { url: ppUrl }, caption: text });
        } else {
          text += `\n🖼️ Profile pic: Hidden`;
          await safeSend(sock, jid, { text });
        }

      } catch (err) {
        await safeSend(sock, jid, { text: '❌ Stalk failed: ' + err.message });
      }
      break;
    }



    case 'myonline': {
      const sub = args[0]?.toLowerCase();
      const ownerJid = process.env.OWNER_NUMBER + '@s.whatsapp.net';

      if (sub === 'stop') {
        if (global.selfMonitor) {
          clearInterval(global.selfMonitor.timer);
          global.selfMonitor = null;
        }
        await safeSend(sock, jid, { text: '🛑 Self monitor stopped.' });
        return;
      }

      if (sub === 'report') {
        if (!global.selfMonitorLog?.length) {
          await safeSend(sock, jid, { text: '📊 No activity logged yet.' });
          return;
        }
        const log = global.selfMonitorLog.slice(-10).reverse().map(e =>
          `${e.type === 'online' ? '🟢' : '🔴'} ${e.type.toUpperCase()} — ${e.time}${e.duration ? ' (was online ' + e.duration + ' min)' : ''}`
        ).join('\n');
        const totalSessions = global.selfMonitorLog.filter(e => e.type === 'offline' && e.duration).length;
        const totalMins = global.selfMonitorLog.filter(e => e.type === 'offline' && e.duration).reduce((a, e) => a + e.duration, 0);
        await safeSend(sock, jid, { text: `📊 *My Activity Report*\n\n${log}\n\n⏱️ Total sessions: ${totalSessions}\n🕐 Total online time: ${totalMins} min` });
        return;
      }

      if (global.selfMonitor) {
        await safeSend(sock, jid, { text: '⚠️ Already monitoring your number.' });
        return;
      }

      global.selfMonitorLog = global.selfMonitorLog || [];
      let sessionStart = null;

      sock.ev.on('presence.update', async ({ id, presences }) => {
        if (id !== ownerJid) return;
        const p = presences[ownerJid];
        if (!p) return;
        const now = new Date();
        const timeStr = now.toLocaleTimeString();
        if (p.lastKnownPresence === 'available' && !sessionStart) {
          sessionStart = now;
          global.selfMonitorLog.push({ type: 'online', time: timeStr });
          if (global.selfMonitorLog.length > 100) global.selfMonitorLog.shift();
        } else if (p.lastKnownPresence === 'unavailable' && sessionStart) {
          const duration = Math.round((now - sessionStart) / 60000);
          global.selfMonitorLog.push({ type: 'offline', time: timeStr, duration });
          sessionStart = null;
        }
      });

      global.selfMonitor = {
        timer: setInterval(async () => {
          try { await sock.subscribePresence(ownerJid); } catch {}
        }, 30000)
      };

      try { await sock.subscribePresence(ownerJid); } catch {}
      await safeSend(sock, jid, { text: `📡 *Monitoring your own number*\n\nTracking your online/offline activity silently.\n\n• !myonline report — see activity log\n• !myonline stop — stop monitoring` });
      break;
    }

    case 'usersearch': {
      const username = args[0];
      if (!username) { await safeSend(sock, jid, { text: '❌ Usage: !usersearch <username>' }); return; }
      await safeSend(sock, jid, { text: `🔍 Searching for *${username}* across platforms...` });

      const platforms = [
        { name: '🐙 GitHub', url: `https://github.com/${username}`, notFound: ['Not Found', 'This is not the web page'] },
        { name: '🐦 Twitter/X', url: `https://x.com/${username}`, notFound: ['This account doesn\'t exist', 'page does not exist'] },
        { name: '📸 Instagram', url: `https://www.instagram.com/${username}/`, notFound: ["Sorry, this page isn\'t available"] },
        { name: '🎵 TikTok', url: `https://www.tiktok.com/@${username}`, notFound: ["Couldn\'t find this account"] },
        { name: '▶️ YouTube', url: `https://www.youtube.com/@${username}`, notFound: ['404', 'not available'] },
        { name: '👻 Snapchat', url: `https://www.snapchat.com/add/${username}`, notFound: ['Sorry, we couldn\'t find'] },
        { name: '💼 LinkedIn', url: `https://www.linkedin.com/in/${username}`, notFound: ['Page not found', 'profile is not available'] },
        { name: '🎮 Twitch', url: `https://www.twitch.tv/${username}`, notFound: ['Sorry. Unless you\'ve got a time machine'] },
        { name: '🎮 Steam', url: `https://steamcommunity.com/id/${username}`, notFound: ['The specified profile could not be found'] },
        { name: '🟠 Reddit', url: `https://www.reddit.com/user/${username}`, notFound: ['nobody on Reddit goes by that name', 'page not found'] },
        { name: '🖼️ Pinterest', url: `https://www.pinterest.com/${username}`, notFound: ['Hmm, we couldn\'t find that page'] },
        { name: '💻 GitLab', url: `https://gitlab.com/${username}`, notFound: ['404', 'page not found'] },
        { name: '🐳 Docker', url: `https://hub.docker.com/u/${username}`, notFound: ['404', 'Page Not Found'] },
        { name: '📝 Medium', url: `https://medium.com/@${username}`, notFound: ['Page not found', '404'] },
        { name: '🎵 SoundCloud', url: `https://soundcloud.com/${username}`, notFound: ['We can\'t find that user'] },
        { name: '💬 Telegram', url: `https://t.me/${username}`, notFound: ['If you have Telegram'] },
      ];

      const found = [];
      const notFound = [];
      const failed = [];

      for (const p of platforms) {
        try {
          const r = await fetch(p.url, {
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36' },
            redirect: 'follow'
          });
          if (r.status === 404) {
            notFound.push(`${p.name}: ❌`);
          } else if (r.status === 200) {
            const body = await r.text();
            const isNotFound = p.notFound?.some(str => body.includes(str));
            if (isNotFound) notFound.push(`${p.name}: ❌`);
            else found.push(`${p.name}: ✅ ${p.url}`);
          } else {
            failed.push(`${p.name}: ⚠️ ${r.status}`);
          }
        } catch { failed.push(`${p.name}: ⚠️ Failed`); }
      }

      let report = `👤 *Username OSINT: ${username}*\n`;
      report += `✅ Found: ${found.length} | ❌ Not found: ${notFound.length}\n\n`;
      if (found.length) report += `*Found on:*\n` + found.join('\n') + '\n\n';
      if (notFound.length) report += `*Not found on:*\n` + notFound.join('  ') + '\n';
      if (failed.length) report += `\n*Failed checks:*\n` + failed.join('  ');

      await safeSend(sock, jid, { text: report });
      break;
    }

    case 'pastebin': {
      const query = args.join(' ');
      if (!query) { await safeSend(sock, jid, { text: '❌ Usage: !pastebin <email/number/username>' }); return; }
      await safeSend(sock, jid, { text: `🔍 Searching pastes for *${query}*...` });
      const encoded = encodeURIComponent(query);
      const sites = [
        `https://www.google.com/search?q=site:pastebin.com+${encoded}`,
        `https://www.google.com/search?q=site:paste.ee+${encoded}`,
        `https://www.google.com/search?q=site:ghostbin.com+${encoded}`,
        `https://www.google.com/search?q=site:hastebin.com+${encoded}`,
        `https://www.google.com/search?q=site:rentry.co+${encoded}`,
        `https://www.google.com/search?q=site:privatebin.net+${encoded}`,
      ];
      let text = `📋 *Pastebin OSINT: ${query}*\n\nOpen these links to check for exposed data:\n\n`;
      text += sites.map((s, i) => `${i+1}. ${s}`).join('\n');
      text += `\n\n💡 Tip: If Google shows results, the data has been publicly leaked.`;
      await safeSend(sock, jid, { text });
      break;
    }

    case 'anonymous': {
      const number = args[0]?.replace(/[^0-9]/g, '');
      const message = args.slice(1).join(' ');
      if (!number || !message) {
        await safeSend(sock, jid, { text: '❌ Usage: !anonymous <number> <message>' });
        return;
      }
      const targetJid = number + '@s.whatsapp.net';
      try {
        await sock.sendMessage(targetJid, { text: message });
        await safeSend(sock, jid, { text: '✅ Anonymous message sent.' });
      } catch (err) {
        await safeSend(sock, jid, { text: '❌ Failed: ' + err.message });
      }
      break;
    }

    case 'ghostlist': {
      if (!jid.endsWith('@g.us')) { await safeSend(sock, jid, { text: '❌ Only works in groups.' }); return; }
      const days = parseInt(args[0]) || 7;
      const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
      try {
        const meta = await sock.groupMetadata(jid);
        const active = new Set();
        // scan message cache for recent senders
        if (global.messageCache) {
          for (const [id, cached] of Object.entries(global.messageCache)) {
            if (cached.timestamp && cached.timestamp > cutoff && cached.jid === jid) {
              active.add(cached.sender);
            }
          }
        }
        const ghosts = meta.participants.filter(p => !active.has(p.id) && !p.id.includes(process.env.OWNER_NUMBER));
        if (!ghosts.length) {
          await safeSend(sock, jid, { text: `✅ No ghosts found in the last ${days} days.` });
          return;
        }
        const list = ghosts.map((p, i) => `${i+1}. @${p.id.replace('@s.whatsapp.net','').replace('@lid','')}`).join('\n');
        await sock.sendMessage(jid, {
          text: `👻 *Ghost Members (${days} days)*
${ghosts.length} inactive members:

${list}`,
          mentions: ghosts.map(p => p.id)
        });
      } catch (err) {
        await safeSend(sock, jid, { text: '❌ Failed: ' + err.message });
      }
      break;
    }

    case 'autotyping': {
      const val = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(val)) { await safeSend(sock, jid, { text: '❌ Usage: !autotyping on/off' }); return; }
      if (val === 'off') {
        if (global.autoTypingTimer) { clearInterval(global.autoTypingTimer); global.autoTypingTimer = null; }
        await safeSend(sock, jid, { text: '⌨️ Auto typing indicator OFF.' });
        return;
      }
      global.autoTypingTimer = setInterval(async () => {
        try {
          await sock.sendPresenceUpdate('composing', jid);
          setTimeout(() => sock.sendPresenceUpdate('paused', jid), 3000);
        } catch {}
      }, 30000);
      await safeSend(sock, jid, { text: '⌨️ Auto typing indicator ON — bot appears active every 30s.' });
      break;
    }

    case 'clone': {
      const number = args[0]?.replace(/[^0-9]/g, '');
      if (!number) { await safeSend(sock, jid, { text: '❌ Usage: !clone <number>' }); return; }
      await safeSend(sock, jid, { text: '🔄 Cloning profile info...' });
      try {
        const targetJid = number + '@s.whatsapp.net';
        const status = await sock.fetchStatus(targetJid).catch(() => null);
        const ppUrl = await sock.profilePictureUrl(targetJid, 'image').catch(() => null);
        let done = [];
        if (status?.status) {
          await sock.updateProfileStatus(status.status);
          done.push('📝 About: ' + status.status);
        }
        if (ppUrl) {
          const res = await fetch(ppUrl);
          const buf = Buffer.from(await res.arrayBuffer());
          await sock.updateProfilePicture(process.env.OWNER_NUMBER + '@s.whatsapp.net', buf);
          done.push('🖼️ Profile picture cloned');
        }
        if (!done.length) await safeSend(sock, jid, { text: '⚠️ Nothing to clone — target profile is private.' });
        else await safeSend(sock, jid, { text: '✅ *Cloned:*\n' + done.join('\n') });
' + done.join('
      } catch (err) {
        await safeSend(sock, jid, { text: '❌ Clone failed: ' + err.message });
      }
      break;
    }

    case 'recallall': {
      await safeSend(sock, jid, { text: '🗑️ Deleting all bot messages...' });
      let count = 0;
      if (global.botMessages?.[jid]) {
        for (const key of global.botMessages[jid]) {
          try {
            await sock.sendMessage(jid, { delete: key });
            count++;
            await new Promise(r => setTimeout(r, 500));
          } catch {}
        }
        global.botMessages[jid] = [];
      }
      await safeSend(sock, jid, { text: `✅ Deleted ${count} bot messages.` });
      break;
    }

    case 'mimic': {
      const number = args[0]?.replace(/[^0-9]/g, '');
      const prompt = args.slice(1).join(' ');
      if (!number || !prompt) {
        await safeSend(sock, jid, { text: '❌ Usage: !mimic <number> <what to say>\nExample: !mimic 254712345678 tell them you are running late' });
        return;
      }
      const targetJid = number + '@s.whatsapp.net';
      const history = global.messageCache ? Object.values(global.messageCache).filter(m => m.sender === targetJid).slice(-20).map(m => m.text).filter(Boolean) : [];
      if (!history.length) {
        await safeSend(sock, jid, { text: '⚠️ No message history found for that number. They need to have sent messages the bot has seen.' });
        return;
      }
      await safeSend(sock, jid, { text: '🎭 Analyzing style...' });
      const stylePrompt = `Here are sample messages from a person:\n${history.join('\n')}\n\nNow write a message in their exact texting style, tone, vocabulary and punctuation habits about: ${prompt}\nJust return the message, nothing else.`;
      const reply = await askAI(stylePrompt, 'You are a writing style mimic. Study the examples and replicate the style exactly.');
      await safeSend(sock, jid, { text: reply ? `🎭 *Mimic draft:*\n\n"${reply}"` : '❌ Could not generate.' });
      break;
    }

    case 'fakeonline': {
      const val = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(val)) { await safeSend(sock, jid, { text: '❌ Usage: !fakeonline on/off' }); return; }
      if (val === 'off') {
        if (global.fakeOnlineTimer) { clearInterval(global.fakeOnlineTimer); global.fakeOnlineTimer = null; }
        await sock.sendPresenceUpdate('unavailable');
        await safeSend(sock, jid, { text: '🔴 Fake online OFF.' });
        return;
      }
      global.fakeOnlineTimer = setInterval(async () => {
        try { await sock.sendPresenceUpdate('available'); } catch {}
      }, 10000);
      await sock.sendPresenceUpdate('available');
      await safeSend(sock, jid, { text: '🟢 Fake online ON — your number appears online continuously.' });
      break;
    }

    case 'lastseen': {
      const val = args[0]?.toLowerCase();
      const options = ['everyone', 'contacts', 'nobody'];
      if (!options.includes(val)) {
        await safeSend(sock, jid, { text: '❌ Usage: !lastseen <everyone/contacts/nobody>' });
        return;
      }
      try {
        await sock.updateLastSeenPrivacy(val);
        await safeSend(sock, jid, { text: `✅ Last seen set to: *${val}*` });
      } catch (err) {
        await safeSend(sock, jid, { text: '❌ Failed: ' + err.message });
      }
      break;
    }

    case 'recallall': {
      const limit = parseInt(args[0]) || 50;
      try {
        const stored = global.botMessages?.[jid];
        if (!stored?.length) { await safeSend(sock, jid, { text: '❌ No stored bot messages found.' }); return; }
        const toDelete = stored.slice(-limit);
        let deleted = 0;
        for (const key of toDelete) {
          try {
            await sock.sendMessage(jid, { delete: key });
            deleted++;
            await new Promise(r => setTimeout(r, 300));
          } catch {}
        }
        global.botMessages[jid] = stored.slice(0, stored.length - toDelete.length);
        await safeSend(sock, jid, { text: `🗑️ Deleted ${deleted}/${toDelete.length} bot messages.` });
      } catch (err) {
        await safeSend(sock, jid, { text: '❌ Failed: ' + err.message });
      }
      break;
    }

    case 'mimic': {
      const number = args[0]?.replace(/[^0-9]/g, '');
      const messageToReply = args.slice(1).join(' ');
      if (!number || !messageToReply) {
        await safeSend(sock, jid, { text: '❌ Usage: !mimic <number> <message to reply to>\nExample: !mimic 254712345678 hey how are you' });
        return;
      }
      const targetJid = number + '@s.whatsapp.net';
      // gather cached messages from this person
      const samples = Object.values(global.messageCache || {})
        .filter(m => m.sender === targetJid && m.text)
        .slice(-20)
        .map(m => m.text)
        .join('\n');
      if (!samples) {
        await safeSend(sock, jid, { text: '⚠️ No cached messages from that number yet. They need to send messages first.' });
        return;
      }
      await safeSend(sock, jid, { text: '🎭 Analyzing style...' });
      const reply = await askAI(
        `Their messages:\n${samples}\n\nMessage to reply to: "${messageToReply}"`,
        'Analyze the writing style, tone, vocabulary, emoji usage, and sentence length from these sample messages. Then write a reply to the given message in exactly that person\'s style. Only return the reply, nothing else.'
      );
      await safeSend(sock, jid, { text: reply ? `🎭 *Mimic Reply:*\n\n${reply}` : '❌ Could not generate reply.' });
      break;
    }

    case 'sendfrom': {
      const fromNumber = args[0]?.replace(/[^0-9]/g, '');
      const toNumber = args[1]?.replace(/[^0-9]/g, '');
      const message = args.slice(2).join(' ');
      if (!fromNumber || !toNumber || !message) {
        await safeSend(sock, jid, { text: '❌ Usage: !sendfrom <your_other_number> <recipient_number> <message>\nExample: !sendfrom 254700000000 254711111111 hey did you go to church?' });
        return;
      }
      const toJid = toNumber + '@s.whatsapp.net';
      try {
        await sock.sendMessage(toJid, {
          text: message,
          contextInfo: {
            participant: fromNumber + '@s.whatsapp.net',
            remoteJid: fromNumber + '@s.whatsapp.net',
          }
        });
        await safeSend(sock, jid, { text: '✅ Sent!' });
      } catch (err) {
        await safeSend(sock, jid, { text: '❌ Failed: ' + err.message });
      }
      break;
    }

    case 'fake': {
      const number = args[0]?.replace(/[^0-9]/g, '');
      const message = args.slice(1).join(' ');
      if (!number || !message) {
        await safeSend(sock, jid, { text: '❌ Usage: !fake <number> <message>\nExample: !fake 254712345678 hey bro' });
        return;
      }
      try {
        const fakeJid = number + '@s.whatsapp.net';
        // forward trick — quote a message appearing from that number
        await sock.sendMessage(jid, {
          text: message,
          contextInfo: {
            externalAdReply: null,
            quotedMessage: { conversation: message },
            participant: fakeJid,
            remoteJid: fakeJid,
          }
        });
      } catch (err) {
        await safeSend(sock, jid, { text: '❌ Failed: ' + err.message });
      }
      break;
    }

    case 'stylemode': {
      const sub = args[0]?.toLowerCase();
      const number = args[1]?.replace(/[^0-9]/g, '');

      if (sub === 'off') {
        global.styleMode = null;
        await safeSend(sock, jid, { text: '🎭 Style mode OFF — bot back to normal.' });
        return;
      }

      if (!number) {
        await safeSend(sock, jid, { text: '❌ Usage:\n!stylemode on <number> — reply as that person\'s style\n!stylemode off — stop' });
        return;
      }

      const targetJid = number + '@s.whatsapp.net';
      const samples = Object.values(global.messageCache || {})
        .filter(m => m.sender === targetJid && m.text)
        .slice(-20)
        .map(m => m.text)
        .join('\n');

      if (!samples) {
        await safeSend(sock, jid, { text: '⚠️ No cached messages from that number yet. They need to send messages to the bot first.' });
        return;
      }

      global.styleMode = { jid: targetJid, samples, number };
      await safeSend(sock, jid, { text: `🎭 *Style Mode ON*\n\nBot will now reply in the style of +${number}.\n\nTurn off with: !stylemode off` });
      break;
    }
    case 'stalkwatch': {
      const sub = args[0]?.toLowerCase();
      const number = args[1]?.replace(/[^0-9]/g, '') || args[0]?.replace(/[^0-9]/g, '');

      if (sub === 'stop') {
        if (global.stalkWatchers) {
          Object.keys(global.stalkWatchers).forEach(k => {
            clearInterval(global.stalkWatchers[k].timer);
          });
          global.stalkWatchers = {};
        }
        await safeSend(sock, jid, { text: '🛑 All stalk watchers stopped.' });
        return;
      }

      if (!number || isNaN(number)) {
        await safeSend(sock, jid, { text: '❌ Usage:\n!stalkwatch <number> — start watching\n!stalkwatch stop — stop all' });
        return;
      }

      global.stalkWatchers = global.stalkWatchers || {};
      const targetJid = number + '@s.whatsapp.net';
      const ownerJid = process.env.OWNER_NUMBER + '@s.whatsapp.net';

      if (global.stalkWatchers[number]) {
        await safeSend(sock, jid, { text: `⚠️ Already watching *+${number}*` });
        return;
      }

      let wasOnline = false;
      let sessionStart = null;
      global.stalkWatchers[number] = {
        timer: setInterval(async () => {
          try {
            await sock.subscribePresence(targetJid);
          } catch {}
        }, 30000)
      };

      sock.ev.on('presence.update', async ({ id, presences }) => {
        if (id !== targetJid) return;
        const p = presences[targetJid];
        if (!p) return;
        const now = new Date();
        if (p.lastKnownPresence === 'available' && !wasOnline) {
          wasOnline = true;
          sessionStart = now;
          await sock.sendMessage(ownerJid, {
            text: `👁️ *Stalk Alert*\n\n📱 +${number} just came *ONLINE*\n🕐 Time: ${now.toLocaleTimeString()}`
          });
        } else if (p.lastKnownPresence === 'unavailable' && wasOnline) {
          wasOnline = false;
          const duration = sessionStart ? Math.round((now - sessionStart) / 60000) : '?';
          await sock.sendMessage(ownerJid, {
            text: `👁️ *Stalk Alert*\n\n📱 +${number} went *OFFLINE*\n🕐 Time: ${now.toLocaleTimeString()}\n⏱️ Was online for: ${duration} min`
          });
          sessionStart = null;
        }
      });

      try { await sock.subscribePresence(targetJid); } catch {}
      await safeSend(sock, jid, { text: `👁️ *Watching +${number}*\n\nYou'll get a DM whenever they go online or offline.\n\nStop with: !stalkwatch stop` });
      break;
    }
    case 'ghostmode': {
      const val = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(val)) { await safeSend(sock, jid, { text: '❌ Usage: !ghostmode on/off' }); return; }
      global.ghostMode[jid] = val === 'on';
      await safeSend(sock, jid, {
        text: val === 'on'
          ? '👻 *Ghost Mode ON* — I will read all messages but never reply.'
          : '👻 *Ghost Mode OFF* — Back to normal, I will reply again.'
      });
      break;
    }

    case 'busy': {
      const val = args[0]?.toLowerCase();
      if (val === 'off') {
        delete global.busyMode[ownerNumber];
        await safeSend(sock, jid, { text: '✅ Busy mode OFF — replying normally now.' });
        return;
      }
      const busyMessage = input || 'I am busy right now. I will get back to you soon!';
      global.busyMode[ownerNumber] = busyMessage;
      await safeSend(sock, jid, { text: `✅ *Busy Mode ON*\n\nAuto-reply: _"${busyMessage}"_\n\nTurn off with !busy off` });
      break;
    }

    case 'scheduledm': {
      // !scheduledm +254712345678 2h Hello there!
      const number = args[0]?.replace(/[^0-9]/g, '');
      const timeStr = args[1];
      const message = args.slice(2).join(' ');
      if (!number || !timeStr || !message) {
        await safeSend(sock, jid, { text: '❌ Usage: !scheduledm <number> <time> <message>\nExample: !scheduledm 254712345678 2h Hey there!' });
        return;
      }
      let ms = 0;
      if (/^\d+s$/.test(timeStr)) ms = parseInt(timeStr) * 1000;
      else if (/^\d+m$/.test(timeStr)) ms = parseInt(timeStr) * 60000;
      else if (/^\d+h$/.test(timeStr)) ms = parseInt(timeStr) * 3600000;
      if (!ms) { await safeSend(sock, jid, { text: '❌ Invalid time. Use 30m, 2h, etc.' }); return; }
      const targetJid = number + '@s.whatsapp.net';
      setTimeout(async () => {
        try {
          await sock.sendMessage(targetJid, { text: message });
          console.log('[SCHEDULEDM] Sent to', number);
        } catch (e) {
          console.log('[SCHEDULEDM] Failed:', e.message);
        }
      }, ms);
      const whenStr = ms < 3600000 ? Math.round(ms/60000) + ' minutes' : Math.round(ms/3600000) + ' hours';
      await safeSend(sock, jid, { text: `✅ Message scheduled to *+${number}* in *${whenStr}*\n\n_"${message}"_` });
      break;
    }

    case 'recall': {
      const lastMsg = global.lastBotMessage[jid];
      if (!lastMsg) { await safeSend(sock, jid, { text: '❌ No recent message to recall.' }); return; }
      try {
        await sock.sendMessage(jid, { delete: lastMsg });
        await safeSend(sock, jid, { text: '🗑️ Last message deleted.' });
        delete global.lastBotMessage[jid];
      } catch {
        await safeSend(sock, jid, { text: '❌ Could not recall message.' });
      }
      break;
    }

    case 'spy': {
      if (!isGroup) { await safeSend(sock, jid, { text: '❌ Spy mode only works in groups.' }); return; }
      const val = args[0]?.toLowerCase();
      if (!['on', 'off'].includes(val)) { await safeSend(sock, jid, { text: '❌ Usage: !spy on/off' }); return; }
      global.spyMode[jid] = val === 'on' ? ownerNumber : null;
      global.spyMedia = global.spyMedia || {};
      global.spyMedia[jid] = val === 'on';
      await safeSend(sock, jid, {
        text: val === 'on'
          ? '🕵️ *Spy Mode ON* — All group messages will be forwarded to your DM.'
          : '🕵️ *Spy Mode OFF* — Stopped forwarding messages.'
      });
      break;
    }

    case 'rizz': {
      const theirMessage = input || 'hey';
      await safeSend(sock, jid, { text: '😏 Generating rizz...' });
      const reply = await askAI(theirMessage,
        'You are the ultimate rizz master. Generate a smooth, charming and witty reply to this message. ' +
        'Make it flirty but not creepy. Confident but not arrogant. Max 2 sentences.'
      );
      await safeSend(sock, jid, { text: reply ? `😏 *Rizz Reply:*\n\n"${reply}"` : '😏 "You must be a star, because I can\'t stop looking at you." ⭐' });
      break;
    }

    case 'suggestreply': {
      const theirMessage = input;
      if (!theirMessage) { await safeSend(sock, jid, { text: '❌ Usage: !suggestreply <their message>' }); return; }
      await safeSend(sock, jid, { text: '💭 Thinking of best reply...' });
      const reply = await askAI(theirMessage,
        'Suggest 3 different reply options to this message. Number them 1, 2, 3. ' +
        'Give one casual, one formal and one funny option. Keep each under 2 sentences.'
      );
      await safeSend(sock, jid, { text: reply ? `💬 *Suggested Replies:*\n\n${reply}` : '❌ Could not generate replies.' });
      break;
    }

    case 'persona': {
      const personaName = args[0]?.toLowerCase();
      const personas = {
        sassy: 'You are sassy, witty and a little dramatic. You use attitude and sass in every response. Keep it fun.',
        serious: 'You are professional, formal and serious. Give concise factual responses with no humor.',
        funny: 'You are hilarious and always make jokes. Add humor to everything you say.',
        flirty: 'You are charming and flirty. Compliment and tease in every response.',
        wise: 'You are a wise old sage. Give deep philosophical responses full of wisdom.',
        default: null,
      };
      if (!personaName || !personas[personaName]) {
        await safeSend(sock, jid, { text: `❌ Usage: !persona <type>\nOptions: ${Object.keys(personas).join(', ')}` });
        return;
      }
      global.personas[jid] = personas[personaName];
      await safeSend(sock, jid, {
        text: personaName === 'default'
          ? '✅ Persona reset to default.'
          : `✅ *Persona set to: ${personaName}* — Bot will now respond with that personality.`
      });
      break;
    }

    case 'chat': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !chat <message>\nStart a conversation with AI that remembers context.' }); return; }
      global.chatHistory[jid] = global.chatHistory[jid] || [];
      global.chatHistory[jid].push({ role: 'user', content: input });
      if (global.chatHistory[jid].length > 10) global.chatHistory[jid] = global.chatHistory[jid].slice(-10);
      const persona = global.personas[jid] || 'You are xssrat, a helpful and friendly WhatsApp bot assistant.';
      for (const model of MODELS) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': 'Bearer ' + OPENROUTER_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: 'system', content: persona },
                ...global.chatHistory[jid],
              ],
              max_tokens: 400,
            }),
          });
          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content;
          if (reply) {
            global.chatHistory[jid].push({ role: 'assistant', content: reply });
            await safeSend(sock, jid, { text: `🤖 ${reply}` });
            return;
          }
        } catch (_) {}
      }
      await safeSend(sock, jid, { text: '❌ AI did not respond. Try again.' });
      break;
    }

    case 'clearchat': {
      delete global.chatHistory[jid];
      await safeSend(sock, jid, { text: '🗑️ Chat history cleared. Starting fresh!' });
      break;
    }

  }
}

module.exports = { handleUnique };

async function handleAIPowered(sock, msg, cmd, args) {
  const jid = getJID(msg);
  const input = args.join(' ');

  switch (cmd) {

    case 'meeting': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !meeting <topic>' }); return; }
      await safeSend(sock, jid, { text: '📋 Generating meeting agenda...' });
      const reply = await askAI(input,
        'Generate a professional meeting agenda for this topic. Include: objective, agenda items with time allocations, discussion points and action items. Format it cleanly.'
      );
      await safeSend(sock, jid, { text: reply ? `📋 *Meeting Agenda:*\n\n${reply}` : '❌ Failed to generate agenda.' });
      break;
    }

    case 'email': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !email <topic or details>' }); return; }
      await safeSend(sock, jid, { text: '✉️ Drafting email...' });
      const reply = await askAI(input,
        'Draft a professional email based on this topic or details. Include subject line, greeting, body and sign-off. Keep it clear and professional.'
      );
      await safeSend(sock, jid, { text: reply ? `✉️ *Email Draft:*\n\n${reply}` : '❌ Failed to draft email.' });
      break;
    }

    case 'cv': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !cv <your details>\nExample: !cv John Doe, software developer, 3 years experience, skills: JavaScript Python' }); return; }
      await safeSend(sock, jid, { text: '📄 Writing your CV...' });
      const reply = await askAI(input,
        'Write a professional CV based on these details. Include sections: Personal Info, Professional Summary, Skills, Experience, Education. Format it cleanly for WhatsApp.'
      );
      await safeSend(sock, jid, { text: reply ? `📄 *Your CV:*\n\n${reply}` : '❌ Failed to generate CV.' });
      break;
    }

    case 'invoice': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !invoice <details>\nExample: !invoice Web design for John, $500, due 30 days' }); return; }
      await safeSend(sock, jid, { text: '🧾 Generating invoice...' });
      const reply = await askAI(input,
        'Generate a simple professional invoice based on these details. Include: invoice number, date, item description, amount, payment terms and total. Format cleanly for WhatsApp.'
      );
      await safeSend(sock, jid, { text: reply ? `🧾 *Invoice:*\n\n${reply}` : '❌ Failed to generate invoice.' });
      break;
    }

    case 'quiz': {
      const topic = input || 'general knowledge';
      await safeSend(sock, jid, { text: '🎯 Generating quiz...' });
      const reply = await askAI(topic,
        'Generate 5 multiple choice quiz questions about this topic. Number them 1-5. For each question give 4 options labeled A B C D. After all questions reveal the answers. Format cleanly.'
      );
      await safeSend(sock, jid, { text: reply ? `🎯 *Quiz: ${topic}*\n\n${reply}` : '❌ Failed to generate quiz.' });
      break;
    }

    case 'roast': {
      const target = input || 'me';
      await safeSend(sock, jid, { text: '🔥 Roasting...' });
      const reply = await askAI(target,
        'Write a funny playful roast about this person or thing. Make it witty and hilarious but not mean or offensive. Use humor and sarcasm. Max 4 sentences.'
      );
      await safeSend(sock, jid, { text: reply ? `🔥 *Roasting ${target}:*\n\n${reply}` : '❌ Failed to roast.' });
      break;
    }

    case 'pickup': {
      const topic = input || 'general';
      await safeSend(sock, jid, { text: '💘 Generating pickup line...' });
      const reply = await askAI(topic,
        'Generate a creative, clever and funny pickup line related to this topic. Make it charming and witty. Just return the pickup line, nothing else.'
      );
      await safeSend(sock, jid, { text: reply ? `💘 *Pickup Line:*\n\n"${reply}"` : '❌ Failed to generate.' });
      break;
    }

    case 'coverlettr': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !coverlettr <job title and your details>' }); return; }
      await safeSend(sock, jid, { text: '📝 Writing cover letter...' });
      const reply = await askAI(input,
        'Write a professional cover letter for this job application. Include: opening, why you are a good fit, your key skills and experience, closing. Keep it concise and compelling.'
      );
      await safeSend(sock, jid, { text: reply ? `📝 *Cover Letter:*\n\n${reply}` : '❌ Failed to write cover letter.' });
      break;
    }

    case 'explain': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !explain <topic>' }); return; }
      await safeSend(sock, jid, { text: '🧠 Explaining...' });
      const reply = await askAI(input,
        'Explain this topic as simply as possible, like explaining to a 10 year old. Use simple language, examples and analogies. Max 5 sentences.'
      );
      await safeSend(sock, jid, { text: reply ? `🧠 *${input}:*\n\n${reply}` : '❌ Failed to explain.' });
      break;
    }

    case 'compare': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !compare <thing1> vs <thing2>' }); return; }
      await safeSend(sock, jid, { text: '⚖️ Comparing...' });
      const reply = await askAI(input,
        'Compare these two things fairly. Give pros and cons of each and a final verdict. Format with clear sections. Be objective and helpful.'
      );
      await safeSend(sock, jid, { text: reply ? `⚖️ *Comparison:*\n\n${reply}` : '❌ Failed to compare.' });
      break;
    }

    case 'name': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !name <description or theme>' }); return; }
      await safeSend(sock, jid, { text: '💡 Generating names...' });
      const reply = await askAI(input,
        'Generate 10 creative and unique names based on this description or theme. Number them 1-10. Give a one-word reason why each name works.'
      );
      await safeSend(sock, jid, { text: reply ? `💡 *Name Ideas:*\n\n${reply}` : '❌ Failed to generate names.' });
      break;
    }

    case 'bio': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !bio <your details>' }); return; }
      await safeSend(sock, jid, { text: '✍️ Writing bio...' });
      const reply = await askAI(input,
        'Write a compelling social media bio based on these details. Make it catchy, professional yet personable. Under 150 characters for the main bio, then a longer version. Format for WhatsApp.'
      );
      await safeSend(sock, jid, { text: reply ? `✍️ *Your Bio:*\n\n${reply}` : '❌ Failed to write bio.' });
      break;
    }

    case 'caption': {
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !caption <photo description or mood>' }); return; }
      await safeSend(sock, jid, { text: '📸 Writing captions...' });
      const reply = await askAI(input,
        'Write 5 creative Instagram/WhatsApp status captions for this photo or mood. Make them engaging, some funny some deep. Number them 1-5. Include relevant emojis.'
      );
      await safeSend(sock, jid, { text: reply ? `📸 *Caption Ideas:*\n\n${reply}` : '❌ Failed to generate captions.' });
      break;
    }

  }
}

module.exports = { handleUnique, handleAIPowered, askAI };
