function isBotAdmin(sender) {
  const number = sender.replace(/@s\.whatsapp\.net|@lid/g, '');
  const owner = process.env.OWNER_NUMBER || '';
  const admins = (process.env.ADMIN_NUMBERS || '').split(',').map(n => n.trim());
  return number === owner || admins.includes(number);
}

module.exports = { isBotAdmin };
