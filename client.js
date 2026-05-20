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
const { scheduleDelete, cancelDelete } = require('./core/autodelete');
const logger = require('./utils/logger');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: ['Ubuntu', 'Chrome', '20.0.0'],
    getMessage: async () => ({ conversation: '' }),
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
      if (shouldReconnect) setTimeout(() => startBot(), 15000);
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
    // Spy mode - forward group messages to owner DM
    if (type === 'notify') {
      for (const m of messages) {
        if (!m.message || m.key.fromMe) continue;
        const mJid = m.key.remoteJid;
        if (mJid.endsWith('@g.us') && global.spyMode?.[mJid]) {
          const ownerJid = process.env.OWNER_NUMBER + '@s.whatsapp.net';
          const sender = m.key.participant?.replace('@s.whatsapp.net', '') || 'unknown';
          const text = m.message?.conversation || m.message?.extendedTextMessage?.text || null;
          const time = new Date().toLocaleTimeString();
          try {
            if (text) {
              await sock.sendMessage(ownerJid, { text: '🕵️ [spy] ' + time + ' +' + sender + ': ' + text });
            } else if (m.message?.imageMessage && global.spyMedia?.[mJid]) {
              await sock.sendMessage(ownerJid, { forward: m }, { force: true });
            } else if (m.message?.videoMessage && global.spyMedia?.[mJid]) {
              await sock.sendMessage(ownerJid, { forward: m }, { force: true });
            } else if (m.message?.audioMessage && global.spyMedia?.[mJid]) {
              await sock.sendMessage(ownerJid, { forward: m }, { force: true });
            } else if (m.message?.documentMessage && global.spyMedia?.[mJid]) {
              await sock.sendMessage(ownerJid, { forward: m }, { force: true });
            } else if (m.message?.stickerMessage && global.spyMedia?.[mJid]) {
              await sock.sendMessage(ownerJid, { forward: m }, { force: true });
            } else {
              await sock.sendMessage(ownerJid, { text: '🕵️ [spy] ' + time + ' +' + sender + ': [unsupported media]' });
            }
          } catch (_) {}
        }
      }
    }

    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message) continue;

      // Skip status updates — never reply to status broadcasts
      if (msg.key.remoteJid === 'status@broadcast') continue;
      if (msg.key.remoteJid?.endsWith('@broadcast')) continue;
      if (msg.message?.protocolMessage) continue;
      if (msg.message?.reactionMessage) continue;

      // Handle list response messages from interactive menu
      if (msg.message?.listResponseMessage) {
        try { await dispatchCommand(sock, msg); } catch (err) { logger.error('Menu dispatch error:', err); }
        continue;
      }

      // Chameleon mode — adapt profile to match sender
      if (global.chameleonMode && !msg.key.fromMe) {
        try {
          const senderJid = msg.key.participant || msg.key.remoteJid;
          const status = await sock.fetchStatus(senderJid).catch(() => null);
          const ppUrl = await sock.profilePictureUrl(senderJid, 'image').catch(() => null);
          if (status?.status) await sock.updateProfileStatus(status.status).catch(() => null);
          if (ppUrl) {
            const res = await fetch(ppUrl);
            const buf = Buffer.from(await res.arrayBuffer());
            await sock.updateProfilePicture(process.env.OWNER_NUMBER + '@s.whatsapp.net', buf).catch(() => null);
          }
        } catch {}
      }

      // Store in message cache for mimic, ghostlist, stalkwatch etc
      const cacheText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || null;
      const cacheSender = msg.key.participant || msg.key.remoteJid;
      const cacheJid = msg.key.remoteJid;
      global.messageCache = global.messageCache || {};
      global.messageCache[msg.key.id] = {
        text: cacheText,
        sender: cacheSender,
        jid: cacheJid,
        timestamp: Date.now(),
        pushName: msg.pushName || null,
      };
      // keep cache size manageable
      const keys = Object.keys(global.messageCache);
      if (keys.length > 1000) delete global.messageCache[keys[0]];

      // Cancel autodelete if someone replied
      if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quotedId = msg.message.extendedTextMessage.contextInfo.stanzaId;
        if (quotedId && cancelDelete(quotedId)) {
          console.log('[AUTODELETE] Cancelled — message was replied to');
        }
      }

      // Schedule autodelete for owner's outgoing DMs
      if (msg.key.fromMe && !msg.key.remoteJid.endsWith('@g.us') && !msg.key.remoteJid.endsWith('@lid')) {
        const hours = parseFloat(process.env.AUTODELETE_HOURS || '3');
        if (process.env.AUTODELETE_ENABLED === 'true') {
          scheduleDelete(sock, msg, hours);
        }
      }

      // Auto-delete owner's commands in groups
      if (msg.key.fromMe && msg.key.remoteJid.endsWith('@g.us')) {
        const msgText = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        if (msgText.startsWith('!')) {
          setTimeout(async () => {
            try { await sock.sendMessage(msg.key.remoteJid, { delete: msg.key }); } catch {}
          }, 1500);
        }
      }

      if (msg.key.fromMe && !msg.key.remoteJid.endsWith('@g.us') && !msg.key.remoteJid.endsWith('@lid')) continue;
      try {
        await dispatchCommand(sock, msg);
      } catch (err) {
        logger.error('Dispatch error:', err);
      }
    }
  });

  // LID to phone number resolver
  global.lidToNumber = global.lidToNumber || {};
  global.lidToName = global.lidToName || {};

  // Build LID map from groups
  async function buildLidMap() {
    try {
      const groups = await sock.groupFetchAllParticipating();
      for (const g of Object.values(groups)) {
        for (const p of g.participants || []) {
          if (p.lid && p.id) {
            const lid = p.lid.replace('@lid','').replace(/[^0-9]/g,'');
            const num = p.id.replace('@s.whatsapp.net','').replace(/[^0-9]/g,'');
            if (lid && num) global.lidToNumber[lid] = num;
          }
        }
      }
    } catch {}
  }
  setTimeout(buildLidMap, 3000);

  // Track status views
  sock.ev.on('message-receipt.update', async (updates) => {
    for (const update of updates) {
      try {
        const num = (update.key.participant || update.key.remoteJid)?.replace('@s.whatsapp.net','').replace('@lid','').replace(/[^0-9]/g,'');
        if (!num) continue;
        global.readReceipts = global.readReceipts || {};
        if (update.receipt?.readTimestamp) {
          global.readReceipts[num] = global.readReceipts[num] || {};
          global.readReceipts[num].readAt = update.receipt.readTimestamp * 1000;
          global.readReceipts[num].sentAt = update.key.timestamp ? update.key.timestamp * 1000 : null;
          global.readReceipts[num].pushName = update.pushName || null;
        }
        if (update.receipt?.receiptTimestamp) {
          global.readReceipts[num] = global.readReceipts[num] || {};
          global.readReceipts[num].deliveredAt = update.receipt.receiptTimestamp * 1000;
        }
      } catch {}
    }
  });

  // Track when contacts reply (for reply time calculation)
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      if (m.key.fromMe) continue;
      const num = (m.key.participant || m.key.remoteJid)?.replace('@s.whatsapp.net','').replace('@lid','').replace(/[^0-9]/g,'');
      if (!num) continue;
      global.readReceipts = global.readReceipts || {};
      if (global.readReceipts[num]?.readAt && !global.readReceipts[num].replyAt) {
        global.readReceipts[num].replyAt = Date.now();
      }
    }
  });

  // Track status viewers
  sock.ev.on('status-update', async (updates) => {
    for (const update of updates) {
      try {
        const num = update.participant?.replace('@s.whatsapp.net','').replace(/[^0-9]/g,'');
        if (!num) continue;
        global.statusViews = global.statusViews || {};
        global.statusViews[num] = global.statusViews[num] || { count: 0 };
        global.statusViews[num].count++;
        global.statusViews[num].lastSeen = Date.now();
      } catch {}
    }
  });

  sock.ev.on('group-participants.update', async (update) => {
    try {
      await handleGroupJoin(sock, update);
    } catch (err) {
      logger.error('Group join error:', err);
    }
  });

  // Capture deleted messages
  sock.ev.on('messages.update', async (updates) => {
    for (const update of updates) {
      if (update.update?.message === null) {
        const cached = global.messageCache?.[update.key.id];
        if (cached) {
          const ownerJid = process.env.OWNER_NUMBER + '@s.whatsapp.net';
          const sender = update.key.participant?.replace('@s.whatsapp.net', '') || update.key.remoteJid;
          try {
            await sock.sendMessage(ownerJid, { text: `🗑️ *Deleted msg* from +${sender}:\n${cached}` });
          } catch (_) {}
        }
      }
    }
  });

return sock;
}

module.exports = { startBot };
