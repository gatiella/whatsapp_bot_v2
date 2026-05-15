const { getJID, getMentioned } = require('../utils/helpers');
const { getGroupSetting, setGroupSetting } = require('../db/database');
const { isBotAdmin } = require('../utils/permissions');

async function handleGroup(sock, msg, cmd, args) {
  const jid = getJID(msg);
  if (!jid.endsWith('@g.us')) {
    await sock.sendMessage(jid, { text: '❌ Group commands only work in groups.' });
    return;
  }

  const groupMeta = await sock.groupMetadata(jid);
  const botJID = sock.user.id.replace(/:\d+/, '') + '@s.whatsapp.net';
  const botParticipant = groupMeta.participants.find(p => p.id === botJID);
  const senderJID = msg.key.participant || msg.key.remoteJid;
  const senderParticipant = groupMeta.participants.find(p => p.id === senderJID);

  const botIsAdmin = botParticipant && ['admin', 'superadmin'].includes(botParticipant.admin);
  const senderIsAdmin = senderParticipant && ['admin', 'superadmin'].includes(senderParticipant.admin);
  const senderIsBotAdmin = isBotAdmin(senderJID);

  const adminCmds = ['kick','add','promote','demote','rename','antispam','antilink','welcome','mute','warn'];
  if (adminCmds.includes(cmd) && !senderIsAdmin && !senderIsBotAdmin) {
    await sock.sendMessage(jid, { text: '❌ Only admins can use this command.' });
    return;
  }
  if (adminCmds.includes(cmd) && !botIsAdmin && !senderIsBotAdmin) {
    await sock.sendMessage(jid, { text: '❌ I need to be admin to do that.' });
    return;
  }

  switch (cmd) {
    case 'kick': {
      const targets = getMentioned(msg);
      if (!targets.length) { await sock.sendMessage(jid, { text: '❌ Usage: !kick @user' }); return; }
      await sock.groupParticipantsUpdate(jid, targets, 'remove');
      await sock.sendMessage(jid, { text: `✅ Kicked ${targets.length} member(s).` });
      break;
    }
    case 'add': {
      if (!args[0]) { await sock.sendMessage(jid, { text: '❌ Usage: !add 2547XXXXXXXX' }); return; }
      const number = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      await sock.groupParticipantsUpdate(jid, [number], 'add');
      await sock.sendMessage(jid, { text: `✅ Added ${args[0]}.` });
      break;
    }
    case 'promote': {
      const targets = getMentioned(msg);
      if (!targets.length) { await sock.sendMessage(jid, { text: '❌ Usage: !promote @user' }); return; }
      await sock.groupParticipantsUpdate(jid, targets, 'promote');
      await sock.sendMessage(jid, { text: `✅ Promoted to admin.` });
      break;
    }
    case 'demote': {
      const targets = getMentioned(msg);
      if (!targets.length) { await sock.sendMessage(jid, { text: '❌ Usage: !demote @user' }); return; }
      await sock.groupParticipantsUpdate(jid, targets, 'demote');
      await sock.sendMessage(jid, { text: `✅ Demoted from admin.` });
      break;
    }
    case 'rename': {
      const name = args.join(' ');
      if (!name) { await sock.sendMessage(jid, { text: '❌ Usage: !rename <name>' }); return; }
      await sock.groupUpdateSubject(jid, name);
      await sock.sendMessage(jid, { text: `✅ Group renamed to *${name}*.` });
      break;
    }
    case 'members': {
      const lines = groupMeta.participants.map((p, i) =>
        `${i + 1}. +${p.id.replace('@s.whatsapp.net', '')}${p.admin ? ' 👑' : ''}`
      );
      await sock.sendMessage(jid, { text: `👥 *Members (${lines.length})*\n\n${lines.join('\n')}` });
      break;
    }
    case 'welcome': {
      const val = args[0]?.toLowerCase();
      if (!['on','off'].includes(val)) { await sock.sendMessage(jid, { text: '❌ Usage: !welcome on/off' }); return; }
      await setGroupSetting(jid, 'welcome', val);
      await sock.sendMessage(jid, { text: `✅ Welcome messages: *${val}*` });
      break;
    }
    case 'antispam': {
      const val = args[0]?.toLowerCase();
      if (!['on','off'].includes(val)) { await sock.sendMessage(jid, { text: '❌ Usage: !antispam on/off' }); return; }
      await setGroupSetting(jid, 'antispam', val);
      await sock.sendMessage(jid, { text: `✅ Anti-spam: *${val}*` });
      break;
    }
    case 'antilink': {
      const val = args[0]?.toLowerCase();
      if (!['on','off'].includes(val)) { await sock.sendMessage(jid, { text: '❌ Usage: !antilink on/off' }); return; }
      await setGroupSetting(jid, 'antilink', val);
      await sock.sendMessage(jid, { text: `✅ Anti-link: *${val}*` });
      break;
    }
    case 'poll': {
      const full = args.join(' ');
      const parts = full.split('|');
      if (parts.length < 3) { await sock.sendMessage(jid, { text: '❌ Usage: !poll Question|Option1|Option2' }); return; }
      await sock.sendMessage(jid, {
        poll: { name: parts[0].trim(), values: parts.slice(1).map(o => o.trim()), selectableCount: 1 }
      });
      break;
    }
    case 'warn': {
      const targets = getMentioned(msg);
      if (!targets.length) { await sock.sendMessage(jid, { text: '❌ Usage: !warn @user' }); return; }
      const reason = args.slice(1).join(' ') || 'No reason given';
      await sock.sendMessage(jid, {
        text: `⚠️ @${targets[0].replace('@s.whatsapp.net', '')} warned.\nReason: ${reason}`,
        mentions: targets,
      });
      break;
    }
    case 'mute': {
      const val = args[0]?.toLowerCase();
      if (!['on','off'].includes(val)) { await sock.sendMessage(jid, { text: '❌ Usage: !mute on/off' }); return; }
      await sock.groupSettingUpdate(jid, val === 'on' ? 'announcement' : 'not_announcement');
      await sock.sendMessage(jid, { text: `✅ Group ${val === 'on' ? 'muted' : 'unmuted'}.` });
      break;
    }
  }
}

async function handleGroupJoin(sock, update) {
  const { id, participants, action } = update;
  if (action !== 'add') return;
  const setting = await getGroupSetting(id, 'welcome');
  if (setting !== 'on') return;
  for (const participant of participants) {
    const number = participant.replace('@s.whatsapp.net', '');
    await sock.sendMessage(id, {
      text: `👋 Welcome @${number} to the group!`,
      mentions: [participant],
    });
  }
}

module.exports = { handleGroup, handleGroupJoin };
