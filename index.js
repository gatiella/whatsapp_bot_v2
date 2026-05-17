require('dotenv').config();
const { startBot } = require('./client');
const { initDB } = require('./db/database');
const { restoreFromEnv } = require('./utils/session');
const logger = require('./utils/logger');

async function main() {
  logger.info('🤖 xssrat WhatsApp Bot v2.0 starting...');
  await restoreFromEnv();
  await initDB();
  await startBot();
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
