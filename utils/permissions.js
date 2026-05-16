function isBotAdmin(senderJID, groupParticipants) {
  const owner = (process.env.OWNER_NUMBER || '').trim();
  const admins = (process.env.ADMIN_NUMBERS || '')
    .split(',').map(n => n.trim()).filter(Boolean);
  const allAdmins = [owner, ...admins];

  if (groupParticipants) {
    // Find the participant matching sender LID or phone
    const senderRaw = senderJID.replace(/@s\.whatsapp\.net|@lid/g, '').replace(/:\d+/, '');
    const match = groupParticipants.find(p => {
      const lid = p.id.replace(/@s\.whatsapp\.net|@lid/g, '');
      const phone = (p.phoneNumber || '').replace(/@s\.whatsapp\.net/g, '');
      return lid === senderRaw || phone === senderRaw;
    });
    if (match) {
      const phone = (match.phoneNumber || '').replace(/@s\.whatsapp\.net/g, '');
      return allAdmins.includes(phone);
    }
  }

  const senderRaw = senderJID.replace(/@s\.whatsapp\.net|@lid/g, '').replace(/:\d+/, '');
  return allAdmins.includes(senderRaw);
}

module.exports = { isBotAdmin };
