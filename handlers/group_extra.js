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
