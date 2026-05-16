const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const { dispatchCommand } = require('./handlers/dispatcher');
const { handleGroupJoin } = require('./handlers/group');
const { runScheduler } = require('./core/scheduler');
const { restoreSchedules } = require('./handlers/productivity');
const logger = require('./utils/logger');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['Ubuntu', 'Chrome', '20.0.0'],
  });

  let pairingCodeRequested = false;

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr && !pairingCodeRequested && !sock.authState.creds.registered) {
      pairingCodeRequested = true;
      await new Promise(r => setTimeout(r, 3000));
      try {
        const number = process.env.OWNER_NUMBER.replace(/[^0-9]/g, '');
        console.log('\nRequesting pairing code for: ' + number);
        const code = await sock.requestPairingCode(number);
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🔑 Pairing Code: ' + code);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('WhatsApp → Linked Devices → Link with phone number\n');
      } catch (err) {
        console.error('Pairing error:', err.message);
      }
    }
    if (connection === 'close') {
      const shouldReconnect =
        new Boom(lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) setTimeout(() => startBot(), 5000);
      else logger.error('Logged out. Delete auth_info and restart.');
    }
    if (connection === 'open') {
      logger.info('✅ xssrat bot connected!');
      restoreSchedules(sock);
      runScheduler(sock);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.fromMe && !msg.key.remoteJid.endsWith('@g.us')) continue;
      try {
        await dispatchCommand(sock, msg);
      } catch (err) {
        logger.error('Dispatch error:', err);
      }
    }
  });

  sock.ev.on('group-participants.update', async (update) => {
    try {
      await handleGroupJoin(sock, update);
    } catch (err) {
      logger.error('Group join error:', err);
    }
  });

  return sock;
}

module.exports = { startBot };
