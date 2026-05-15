const { getJID } = require('../utils/helpers');
const { downloadMediaMessage } = require('@whiskeysockets/baileys');
const sharp = require('sharp');
const Tesseract = require('tesseract.js');
const logger = require('../utils/logger');

async function handleMedia(sock, msg, cmd, args) {
  const jid = getJID(msg);

  switch (cmd) {
    case 'sticker': {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imageMsg = msg.message?.imageMessage || quoted?.imageMessage;
      if (!imageMsg) {
        await sock.sendMessage(jid, { text: '❌ Send or reply to an image with !sticker' });
        return;
      }
      await sock.sendMessage(jid, { text: '⏳ Converting...' });
      try {
        const buffer = await downloadMediaMessage(
          { message: { imageMessage: imageMsg }, key: msg.key },
          'buffer', {},
          { logger, reuploadRequest: sock.updateMediaMessage }
        );
        const webp = await sharp(buffer)
          .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .webp().toBuffer();
        await sock.sendMessage(jid, { sticker: webp });
      } catch (err) {
        logger.error('Sticker error:', err);
        await sock.sendMessage(jid, { text: '❌ Failed to convert to sticker.' });
      }
      break;
    }

    case 'toimg': {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const stickerMsg = msg.message?.stickerMessage || quoted?.stickerMessage;
      if (!stickerMsg) {
        await sock.sendMessage(jid, { text: '❌ Reply to a sticker with !toimg' });
        return;
      }
      await sock.sendMessage(jid, { text: '⏳ Converting sticker to image...' });
      try {
        const buffer = await downloadMediaMessage(
          { message: { stickerMessage: stickerMsg }, key: msg.key },
          'buffer', {},
          { logger, reuploadRequest: sock.updateMediaMessage }
        );
        const png = await sharp(buffer).png().toBuffer();
        await sock.sendMessage(jid, { image: png, caption: '🖼️ Here you go!' });
      } catch (err) {
        await sock.sendMessage(jid, { text: '❌ Conversion failed.' });
      }
      break;
    }

    case 'ocr': {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imageMsg = msg.message?.imageMessage || quoted?.imageMessage;
      if (!imageMsg) {
        await sock.sendMessage(jid, { text: '❌ Send or reply to an image with !ocr' });
        return;
      }
      await sock.sendMessage(jid, { text: '🔍 Extracting text from image...' });
      try {
        const buffer = await downloadMediaMessage(
          { message: { imageMessage: imageMsg }, key: msg.key },
          'buffer', {},
          { logger, reuploadRequest: sock.updateMediaMessage }
        );
        const { data: { text } } = await Tesseract.recognize(buffer, 'eng');
        await sock.sendMessage(jid, {
          text: text.trim() ? `📝 *Extracted Text:*\n\n${text.trim()}` : '❌ No text found in image.'
        });
      } catch (err) {
        await sock.sendMessage(jid, { text: '❌ OCR failed.' });
      }
      break;
    }

    case 'ytdl': {
      const url = args[0];
      if (!url || !url.includes('youtube')) {
        await sock.sendMessage(jid, { text: '❌ Usage: !ytdl <youtube url>' });
        return;
      }
      await sock.sendMessage(jid, { text: '⏳ Fetching video info...\n\n_Note: Large videos may timeout. Audio-only is faster._' });
      try {
        const ytdl = require('ytdl-core');
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title;
        const duration = info.videoDetails.lengthSeconds;
        if (parseInt(duration) > 600) {
          await sock.sendMessage(jid, { text: `❌ Video too long (${Math.floor(duration/60)} min). Max 10 minutes.` });
          return;
        }
        await sock.sendMessage(jid, { text: `📹 *${title}*\nDuration: ${Math.floor(duration/60)}:${String(duration%60).padStart(2,'0')}\n\nDownloading audio...` });
        const chunks = [];
        const stream = ytdl(url, { quality: 'lowestaudio', filter: 'audioonly' });
        await new Promise((resolve, reject) => {
          stream.on('data', chunk => chunks.push(chunk));
          stream.on('end', resolve);
          stream.on('error', reject);
        });
        const buffer = Buffer.concat(chunks);
        await sock.sendMessage(jid, {
          audio: buffer,
          mimetype: 'audio/mp4',
          fileName: `${title}.mp4`,
        });
      } catch (err) {
        logger.error('YTDL error:', err);
        await sock.sendMessage(jid, { text: '❌ Download failed. Try a shorter video.' });
      }
      break;
    }

    case 'compress': {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imageMsg = msg.message?.imageMessage || quoted?.imageMessage;
      if (!imageMsg) {
        await sock.sendMessage(jid, { text: '❌ Reply to an image with !compress' });
        return;
      }
      await sock.sendMessage(jid, { text: '⏳ Compressing...' });
      try {
        const buffer = await downloadMediaMessage(
          { message: { imageMessage: imageMsg }, key: msg.key },
          'buffer', {},
          { logger, reuploadRequest: sock.updateMediaMessage }
        );
        const compressed = await sharp(buffer).jpeg({ quality: 40 }).toBuffer();
        const originalKB = Math.round(buffer.length / 1024);
        const compressedKB = Math.round(compressed.length / 1024);
        await sock.sendMessage(jid, {
          image: compressed,
          caption: `✅ Compressed: ${originalKB}KB → ${compressedKB}KB (saved ${Math.round((1 - compressedKB/originalKB)*100)}%)`,
        });
      } catch (err) {
        await sock.sendMessage(jid, { text: '❌ Compression failed.' });
      }
      break;
    }

    default:
      await sock.sendMessage(jid, { text: `❌ Media command *${cmd}* not available.` });
  }
}

module.exports = { handleMedia };
