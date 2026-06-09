require('dotenv').config();
const { startInstance } = require('./client');
const { initDB } = require('./db/database');
const { restoreFromEnv } = require('./utils/session');
const logger = require('./utils/logger');

async function main() {
  logger.info('🤖 xssrat WhatsApp Bot v2.0 starting...');
  await restoreFromEnv();
  await initDB();

  // Instance 1 — primary number
  const instance1 = {
    ownerNumber: process.env.OWNER_NUMBER || '',
    authFolder: 'auth_info',
    sessionUrl: process.env.SESSION_URL || '',
    label: 'Bot1',
  };

  // Instance 2 — second number
  const instance2 = {
    ownerNumber: process.env.OWNER_NUMBER_2 || '',
    authFolder: 'auth_info_2',
    sessionUrl: process.env.SESSION_URL_2 || '',
    label: 'Bot2',
  };

  // Start instance 1 always
  await startInstance(instance1);

  // Start instance 2 only if second number is configured
  if (instance2.ownerNumber) {
    await startInstance(instance2);
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
