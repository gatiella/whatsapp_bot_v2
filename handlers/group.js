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
  const senderJID = msg.key.participant || msg.key.remoteJid;
  const senderIsBotAdmin = isBotAdmin(senderJID, groupMeta.participants);

  const senderRaw = senderJID.replace(/@s\.whatsapp\.net|@lid/g, '').replace(/:\d+/, '');
  const senderParticipant = groupMeta.participants.find(p => {
    const lid = p.id.replace(/@s\.whatsapp\.net|@lid/g, '');
    const phone = (p.phoneNumber || '').replace('@s.whatsapp.net', '');
    return lid === senderRaw || phone === senderRaw;
  });
  const senderIsAdmin = senderParticipant && ['admin', 'superadmin'].includes(senderParticipant.admin);

  const adminCmds = ['kick','add','promote','demote','rename','antispam','antilink','welcome','mute','lock','unlock','warn'];
  if (adminCmds.includes(cmd) && !senderIsAdmin && !senderIsBotAdmin) {
    await sock.sendMessage(jid, { text: '❌ Only admins can use this command.' });
    return;
  }

  switch (cmd) {
    case 'kick': {
      let targets = getMentioned(msg);
      if (!targets.length && args[0]) targets = [args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'];
      if (!targets.length) { await sock.sendMessage(jid, { text: '❌ Usage: !kick @user or !kick 2547XXXXXXXX' }); return; }
      try {
        await sock.groupParticipantsUpdate(jid, targets, 'remove');
        await sock.sendMessage(jid, { text: '✅ Kicked ' + targets.length + ' member(s).' });
      } catch (e) { await sock.sendMessage(jid, { text: '❌ Failed: ' + e.message }); }
      break;
    }
    case 'add': {
      if (!args[0]) { await sock.sendMessage(jid, { text: '❌ Usage: !add 2547XXXXXXXX' }); return; }
      const number = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net';
      try {
        await sock.groupParticipantsUpdate(jid, [number], 'add');
        await sock.sendMessage(jid, { text: '✅ Added ' + args[0] });
      } catch (e) { await sock.sendMessage(jid, { text: '❌ Failed: ' + e.message }); }
      break;
    }
    case 'promote': {
      let targets = getMentioned(msg);
      if (!targets.length && args[0]) targets = [args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'];
      if (!targets.length) { await sock.sendMessage(jid, { text: '❌ Usage: !promote @user or !promote 2547XXXXXXXX' }); return; }
      try {
        await sock.groupParticipantsUpdate(jid, targets, 'promote');
        await sock.sendMessage(jid, { text: '✅ Promoted to admin.' });
      } catch (e) { await sock.sendMessage(jid, { text: '❌ Failed: ' + e.message }); }
      break;
    }
    case 'demote': {
      let targets = getMentioned(msg);
      if (!targets.length && args[0]) targets = [args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'];
      if (!targets.length) { await sock.sendMessage(jid, { text: '❌ Usage: !demote @user or !demote 2547XXXXXXXX' }); return; }
      try {
        await sock.groupParticipantsUpdate(jid, targets, 'demote');
        await sock.sendMessage(jid, { text: '✅ Demoted from admin.' });
      } catch (e) { await sock.sendMessage(jid, { text: '❌ Failed: ' + e.message }); }
      break;
    }
    case 'rename': {
      const name = args.join(' ');
      if (!name) { await sock.sendMessage(jid, { text: '❌ Usage: !rename <name>' }); return; }
      try {
        await sock.groupUpdateSubject(jid, name);
        await sock.sendMessage(jid, { text: '✅ Renamed to ' + name });
      } catch (e) { await sock.sendMessage(jid, { text: '❌ Failed: ' + e.message }); }
      break;
    }
    case 'members': {
      const lines = groupMeta.participants.map((p, i) => {
        const phone = (p.phoneNumber || p.id).replace('@s.whatsapp.net', '');
        return (i + 1) + '. +' + phone + (p.admin ? ' 👑' : '');
      });
      await sock.sendMessage(jid, { text: '👥 *Members (' + lines.length + ')*\n\n' + lines.join('\n') });
      break;
    }
    case 'welcome': {
      const val = args[0]?.toLowerCase();
      if (!['on','off'].includes(val)) { await sock.sendMessage(jid, { text: '❌ Usage: !welcome on/off' }); return; }
      await setGroupSetting(jid, 'welcome', val);
      await sock.sendMessage(jid, { text: '✅ Welcome messages: ' + val });
      break;
    }
    case 'antispam': {
      const val = args[0]?.toLowerCase();
      if (!['on','off'].includes(val)) { await sock.sendMessage(jid, { text: '❌ Usage: !antispam on/off' }); return; }
      await setGroupSetting(jid, 'antispam', val);
      await sock.sendMessage(jid, { text: '✅ Anti-spam: ' + val });
      break;
    }
    case 'antilink': {
      const val = args[0]?.toLowerCase();
      if (!['on','off'].includes(val)) { await sock.sendMessage(jid, { text: '❌ Usage: !antilink on/off' }); return; }
      await setGroupSetting(jid, 'antilink', val);
      await sock.sendMessage(jid, { text: '✅ Anti-link: ' + val });
      break;
    }
    case 'poll': {
      const parts = args.join(' ').split('|');
      if (parts.length < 3) { await sock.sendMessage(jid, { text: '❌ Usage: !poll Question|Option1|Option2' }); return; }
      await sock.sendMessage(jid, {
        poll: { name: parts[0].trim(), values: parts.slice(1).map(o => o.trim()), selectableCount: 1 }
      });
      break;
    }
    case 'warn': {
      let targets = getMentioned(msg);
      if (!targets.length && args[0]) targets = [args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'];
      if (!targets.length) { await sock.sendMessage(jid, { text: '❌ Usage: !warn @user or !warn 2547XXXXXXXX' }); return; }
      const reason = args.slice(1).join(' ') || 'No reason given';
      const num = targets[0].replace('@s.whatsapp.net', '');
      await sock.sendMessage(jid, { text: '⚠️ +' + num + ' has been warned.\nReason: ' + reason });
      break;
    }
    case 'lock':
    case 'unlock':
    case 'mute': {
      let val;
      if (cmd === 'lock') val = 'on';
      else if (cmd === 'unlock') val = 'off';
      else val = args[0]?.toLowerCase();
      if (!['on','off'].includes(val)) { await sock.sendMessage(jid, { text: '❌ Usage: !mute on/off' }); return; }
      try {
        await sock.groupSettingUpdate(jid, val === 'on' ? 'announcement' : 'not_announcement');
        await sock.sendMessage(jid, { text: val === 'on' ? '🔒 Group locked.' : '🔓 Group unlocked.' });
      } catch (e) { await sock.sendMessage(jid, { text: '❌ Failed: ' + e.message }); }
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
      text: '👋 Welcome @' + number + ' to the group!',
      mentions: [participant],
    });
  }
}

module.exports = { handleGroup, handleGroupJoin };
