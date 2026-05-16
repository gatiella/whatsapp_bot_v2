require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');

async function test() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({ version, auth: state, logger: pino({ level: 'debug' }) });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection }) => {
    if (connection === 'open') {
      console.log('Connected! Bot JID:', sock.user.id);

      // List all groups
      const groups = await sock.groupFetchAllParticipating();
      const groupList = Object.values(groups);
      console.log('Groups:', groupList.map(g => ({ id: g.id, name: g.subject })));

      // Pick first group
      const group = groupList[0];
      if (!group) { console.log('No groups found'); return; }

      console.log('\nGroup:', group.subject);
      console.log('Participants:');
      group.participants.forEach(p => {
        console.log(' -', p.id, '| phone:', p.phoneNumber, '| admin:', p.admin);
      });

      // Try promote
      const target = '254103737580@s.whatsapp.net';
      console.log('\nAttempting promote of', target);
      try {
        const result = await sock.groupParticipantsUpdate(group.id, [target], 'promote');
        console.log('Result:', JSON.stringify(result));
      } catch (e) {
        console.log('Error code:', e.data);
        console.log('Error message:', e.message);
        console.log('Full error:', JSON.stringify(e, null, 2));
      }
    }
  });
}

test();
