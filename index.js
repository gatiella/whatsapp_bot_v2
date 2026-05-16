require('dotenv').config();
const { startBot } = require('./client');
const { seedDefaultKeywords } = require('./db/database');
const { initDB } = require('./db/database');
const logger = require('./utils/logger');

async function main() {
  logger.info('🤖 xssrat WhatsApp Bot v2.0 starting...');
  await initDB();
  await seedDefaultKeywords();
startBot();
}

main().catch(err => {
  console.error('Fatal error details:', err.message);
  console.error(err.stack);
  process.exit(1);
});
