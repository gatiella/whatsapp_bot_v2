const { getJID, getMentioned } = require('../utils/helpers');
const { safeSend } = require('../utils/send');
const { getMessageStats } = require('../db/database');

async function handleGroupExtra(sock, msg, cmd, args) {
  const jid = getJID(msg);
  const isGroup = jid.endsWith('@g.us');
  const input = args.join(' ');

  switch (cmd) {

    case 'tagall': {
      if (!isGroup) { await safeSend(sock, jid, { text: '❌ Group only command.' }); return; }
      const groupMeta = await sock.groupMetadata(jid);
      const members = groupMeta.participants;
      const mentions = members.map(m => m.id);
      const text = (input || '📢 Attention everyone!') + '\n\n' + members.map(m => `@${m.id.replace('@s.whatsapp.net', '')}`).join(' ');
      await sock.sendMessage(jid, { text, mentions });
      break;
    }

    case 'rules': {
      if (!isGroup) { await safeSend(sock, jid, { text: '❌ Group only command.' }); return; }
      const rules = global.groupRules?.[jid];
      if (!rules) {
        await safeSend(sock, jid, { text: '📋 No rules set.\nAdmin can set rules with: !setrules <rules>' });
      } else {
        await safeSend(sock, jid, { text: `📋 *Group Rules:*\n\n${rules}` });
      }
      break;
    }

    case 'setrules': {
      if (!isGroup) { await safeSend(sock, jid, { text: '❌ Group only command.' }); return; }
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !setrules <rules>' }); return; }
      global.groupRules = global.groupRules || {};
      global.groupRules[jid] = input;
      await safeSend(sock, jid, { text: '✅ Group rules updated!' });
      break;
    }

    case 'vote': {
      if (!isGroup) { await safeSend(sock, jid, { text: '❌ Group only command.' }); return; }
      if (!input) { await safeSend(sock, jid, { text: '❌ Usage: !vote <question>' }); return; }
      await sock.sendMessage(jid, {
        poll: {
          name: input,
          values: ['👍 Yes', '👎 No', '🤷 Maybe'],
          selectableCount: 1,
        }
      });
      break;
    }

    case 'leaderboard': {
      if (!isGroup) { await safeSend(sock, jid, { text: '❌ Group only command.' }); return; }
      const stats = getMessageStats(jid);
      await safeSend(sock, jid, {
        text: `🏆 *Group Leaderboard*\n\n📊 Total Messages: ${stats.total}\n👥 Active Users: ${stats.users}\n📅 Today: ${stats.today}`,
      });
      break;
    }

  }
}

module.exports = { handleGroupExtra };

async function handleGroupGames(sock, msg, cmd, args) {
  const jid = getJID(msg);
  const isGroup = jid.endsWith('@g.us');
  const input = args.join(' ');

  switch (cmd) {

    case 'raffle': {
      if (!isGroup) { await safeSend(sock, jid, { text: '❌ Group only command.' }); return; }
      const groupMeta = await sock.groupMetadata(jid);
      const members = groupMeta.participants.filter(m => !m.id.includes(process.env.OWNER_NUMBER));
      if (!members.length) { await safeSend(sock, jid, { text: '❌ No members to raffle.' }); return; }
      const winner = members[Math.floor(Math.random() * members.length)];
      const number = winner.id.replace('@s.whatsapp.net', '');
      await sock.sendMessage(jid, {
        text: `🎉 *Raffle Results!*\n\n🏆 Winner: @${number}\n\nCongratulations! 🎊`,
        mentions: [winner.id],
      });
      break;
    }

    case 'inactive': {
      if (!isGroup) { await safeSend(sock, jid, { text: '❌ Group only command.' }); return; }
      const days = parseInt(args[0]) || 7;
      const groupMeta = await sock.groupMetadata(jid);
      const members = groupMeta.participants;
      const { getInactiveMembers } = require('../db/database');
      try {
        const active = await getInactiveMembers(jid, days);
        const activeIds = active.map(a => a.sender);
        const inactive = members.filter(m => !activeIds.includes(m.id));
        if (!inactive.length) {
          await safeSend(sock, jid, { text: `✅ No inactive members in the last ${days} days!` });
          return;
        }
        const mentions = inactive.map(m => m.id);
        const lines = inactive.map(m => `@${m.id.replace('@s.whatsapp.net', '')}`);
        await sock.sendMessage(jid, {
          text: `😴 *Inactive Members (${days}+ days):*\n\n${lines.join('\n')}\n\nTotal: ${inactive.length} members`,
          mentions,
        });
      } catch {
        await safeSend(sock, jid, { text: '❌ Could not fetch inactive members.' });
      }
      break;
    }

  }
}

module.exports = { handleGroupExtra, handleGroupGames };
