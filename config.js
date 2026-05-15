require('dotenv').config();

const config = {
  PREFIX: process.env.PREFIX || '!',
  BOT_NAME: process.env.BOT_NAME || 'xssrat',
  OWNER_NUMBER: process.env.OWNER_NUMBER || '',
  AUTO_REPLY_DM: process.env.AUTO_REPLY_DM === 'true',
  AUTO_REPLY_TEXT: process.env.AUTO_REPLY_TEXT || 'Hi! Type !help for commands.',
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
};

module.exports = config;
