const cron = require('node-cron');
const logger = require('../utils/logger');

function runScheduler(sock) {
  // Example: daily ping every day at 8am
  cron.schedule('0 8 * * *', async () => {
    logger.info('Scheduler tick');
    // Add scheduled broadcasts here
  });

  logger.info('⏰ Scheduler running');
}

module.exports = { runScheduler };
