const fs = require('fs');
const path = require('path');
const logger = require('./logger');

const AUTH_DIR = 'auth_info';

function encodeSession() {
  try {
    if (!fs.existsSync(AUTH_DIR)) return null;
    const files = {};
    for (const item of fs.readdirSync(AUTH_DIR)) {
      files[item] = fs.readFileSync(path.join(AUTH_DIR, item), 'utf8');
    }
    return Buffer.from(JSON.stringify(files)).toString('base64');
  } catch (e) {
    logger.error('Session encode error:', e.message);
    return null;
  }
}

function decodeSession(encoded) {
  try {
    const files = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
    for (const [name, content] of Object.entries(files)) {
      fs.writeFileSync(path.join(AUTH_DIR, name), content);
    }
    logger.info('✅ Session restored');
    return true;
  } catch (e) {
    logger.error('Session decode error:', e.message);
    return false;
  }
}

async function restoreFromEnv() {
  if (fs.existsSync(path.join(AUTH_DIR, 'creds.json'))) {
    logger.info('✅ Session found locally');
    return true;
  }

  // Try SESSION_DATA env var first
  if (process.env.SESSION_DATA) {
    return decodeSession(process.env.SESSION_DATA);
  }

  // Try SESSION_URL
  if (process.env.SESSION_URL) {
    try {
      logger.info('Fetching session from URL...');
      const res = await fetch(process.env.SESSION_URL);
      const encoded = await res.text();
      return decodeSession(encoded.trim());
    } catch (e) {
      logger.error('Session URL fetch error:', e.message);
      return false;
    }
  }

  return false;
}

function printSessionEnv() {
  const encoded = encodeSession();
  if (!encoded) { console.log('No session found'); return; }
  console.log(encoded);
}

module.exports = { restoreFromEnv, printSessionEnv, encodeSession };
