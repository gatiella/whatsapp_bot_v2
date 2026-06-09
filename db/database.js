const Database = require('better-sqlite3');
const path = require('path');
const logger = require('../utils/logger');

const db = new Database(path.join(__dirname, 'bot.db'));

function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jid TEXT, sender TEXT, text TEXT,
      time DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS keywords (
      keyword TEXT PRIMARY KEY, reply TEXT
    );
    CREATE TABLE IF NOT EXISTS banned (
      number TEXT PRIMARY KEY
    );
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT, task TEXT, done INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT, key TEXT, value TEXT
    );
    CREATE TABLE IF NOT EXISTS group_settings (
      jid TEXT, key TEXT, value TEXT,
      PRIMARY KEY (jid, key)
    );
    CREATE TABLE IF NOT EXISTS global_settings (
      key TEXT PRIMARY KEY, value TEXT
    );
  `);

  // Seed default keywords
  const defaults = [
    ['hello', 'heyy 😊'],
    ['hi', 'niaje'],
    ['hey', 'eeh wassup'],
    ['good morning', 'morning 🌅 umelala sawa?'],
    ['good afternoon', 'afternoon, umekuwa aje?'],
    ['good evening', 'evening bana, umekuwa aje leo'],
    ['good night', 'usiku mwema 🌙 lala salama'],
    ['sup', 'poa tu maze, wewe je'],
    ['whats up', 'niko sawa tu, nini mbaya'],
    ['howdy', 'haha niaje'],
    ['who are you', 'Gatiella'],
    ['what is your name', 'Gatiella'],
    ['whats your name', 'Gatiella'],
    ['what your name', 'Gatiella'],
    ['your name', 'Gatiella'],
    ['who r u', 'Gatiella'],
    ['who are u', 'Gatiella'],
    ['what can you do', 'mengi sana 😅 nini unahitaji'],
    ['help me', 'sawa niambie nini unahitaji nikuhelp'],
    ['bot', 'mimi si bot bana 😂 mtu wa kawaida'],
    ['are you a bot', 'Yes! I am *xssrat Bot* 🤖 Type *!help* for commands.'],
    ['are you human', 'ndio kabisa 😄 mtu halisi'],
    ['ok', 'sawa 👍'],
    ['okay', 'sawa sawa'],
    ['thanks', 'np bana 😊'],
    ['thank you', 'You are welcome! 😊 Happy to help!'],
    ['thx', 'No problem! 😊'],
    ['bye', 'Goodbye! 👋 Have a great day!'],
    ['goodbye', 'Goodbye! 👋 See you soon!'],
    ['see you', 'See you! 👋 Take care!'],
    ['take care', 'You too! 😊 Take care!'],
    ['how are you', 'I am doing great! 😄 Thanks for asking. How can I help you?'],
    ['how r u', 'I am great! 😄 How can I help you today?'],
    ['wassup', 'poa tu maze, wewe je'],
    ['morning', 'Good morning! ☀️ Have a wonderful day!'],
    ['evening', 'Good evening! 🌙 Hope your day went well!'],
    ['night', 'Good night! 🌙 Rest well!'],
    ['hola', 'Hola! 👋 Type *!help* to see all commands.'],
    ['bonjour', 'Bonjour! 👋 Type *!help* to see all commands.'],
    ['namaste', 'Namaste! 🙏 Type *!help* to see all commands.'],
    ['salaam', 'Wa Alaikum Salaam! 🙏 Type *!help* to see all commands.'],
    ['salam', 'Wa Alaikum Salaam! 🙏 How can I help you?'],
    ['love you', 'Aww! 🥰 I love you too! Type *!help* to see all commands.'],
    ['lol', 'Haha! 😂 Type *!help* to see all commands.'],
    ['haha', '😂😂 Type *!help* to see all commands.'],
    ['wow', 'Wow indeed! 😮 Type *!help* to see all commands.'],
    ['nice', 'Thanks! 😊 Type *!help* to see all commands.'],
    ['cool', 'Cool! 😎 Type *!help* to see all commands.'],
    ['test', 'Bot is online and working! ✅ Type *!help* to see all commands.'],
    ['ping', 'Pong! 🏓 Bot is online!'],
    ['alive', 'Yes I am alive! ✅ Type *!help* to see all commands.'],
    ['active', 'Bot is active and running! ✅ Type *!help* for commands.'],
    ['online', 'Yes I am online! ✅ Type *!help* to see all commands.'],
  ];

  const insert = db.prepare('INSERT OR IGNORE INTO keywords (keyword, reply) VALUES (?, ?)');
  for (const [keyword, reply] of defaults) {
    insert.run(keyword, reply);
  }

  logger.info('✅ Database initialized');
}

function logMessage(jid, sender, text) {
  db.prepare('INSERT INTO messages (jid, sender, text) VALUES (?, ?, ?)').run(jid, sender, text);
}

function addKeyword(keyword, reply) {
  db.prepare('INSERT OR REPLACE INTO keywords (keyword, reply) VALUES (?, ?)').run(keyword, reply);
}

function deleteKeyword(keyword) {
  db.prepare('DELETE FROM keywords WHERE keyword=?').run(keyword);
}

function listKeywords() {
  return db.prepare('SELECT * FROM keywords').all();
}

function getKeywordReply(text) {
  const keywords = db.prepare('SELECT * FROM keywords').all();
  const lower = text.toLowerCase();
  for (const k of keywords) {
    if (lower.includes(k.keyword)) return k.reply;
  }
  return null;
}

function saveTodo(sender, task) {
  db.prepare('INSERT INTO todos (sender, task) VALUES (?, ?)').run(sender, task);
}

function listTodos(sender) {
  return db.prepare('SELECT * FROM todos WHERE sender=? ORDER BY id').all(sender);
}

function completeTodo(sender, idx) {
  const todos = listTodos(sender);
  if (todos[idx]) db.prepare('UPDATE todos SET done=1 WHERE id=?').run(todos[idx].id);
}

function saveNote(sender, key, value) {
  db.prepare('INSERT OR REPLACE INTO notes (sender, key, value) VALUES (?, ?, ?)').run(sender, key, value);
}

function getNote(sender, key) {
  return db.prepare('SELECT value FROM notes WHERE sender=? AND key=?').get(sender, key)?.value;
}

function listNotes(sender) {
  return db.prepare('SELECT key FROM notes WHERE sender=?').all(sender).map(n => n.key);
}

function getGroupSetting(jid, key) {
  return db.prepare('SELECT value FROM group_settings WHERE jid=? AND key=?').get(jid, key)?.value;
}

function setGroupSetting(jid, key, value) {
  db.prepare('INSERT OR REPLACE INTO group_settings (jid, key, value) VALUES (?, ?, ?)').run(jid, key, value);
}

function getGlobalSetting(key) {
  return db.prepare('SELECT value FROM global_settings WHERE key=?').get(key)?.value;
}

function setGlobalSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO global_settings (key, value) VALUES (?, ?)').run(key, value);
}

function banUser(number) {
  db.prepare('INSERT OR IGNORE INTO banned (number) VALUES (?)').run(number);
}

function unbanUser(number) {
  db.prepare('DELETE FROM banned WHERE number=?').run(number);
}

function isBanned(number) {
  return !!db.prepare('SELECT 1 FROM banned WHERE number=?').get(number);
}

function getRecentLogs(limit = 10) {
  return db.prepare('SELECT jid, text, time FROM messages ORDER BY id DESC LIMIT ?').all(limit);
}

function getMessageStats(jid) {
  const total = db.prepare('SELECT COUNT(*) as c FROM messages WHERE jid=?').get(jid)?.c || 0;
  const today = db.prepare("SELECT COUNT(*) as c FROM messages WHERE jid=? AND date(time)=date('now')").get(jid)?.c || 0;
  const users = db.prepare('SELECT COUNT(DISTINCT sender) as c FROM messages WHERE jid=?').get(jid)?.c || 0;
  return { total, today, users };
}

function getStats() {
  const total = db.prepare('SELECT COUNT(*) as c FROM messages').get()?.c || 0;
  const today = db.prepare("SELECT COUNT(*) as c FROM messages WHERE date(time)=date('now')").get()?.c || 0;
  const users = db.prepare('SELECT COUNT(DISTINCT sender) as c FROM messages').get()?.c || 0;
  return { total, today, users };
}

function saveSchedule(id, jid, cronExpr, message) {
  db.prepare('CREATE TABLE IF NOT EXISTS schedules (id TEXT PRIMARY KEY, jid TEXT, cron TEXT, message TEXT)').run();
  db.prepare('INSERT OR REPLACE INTO schedules (id, jid, cron, message) VALUES (?, ?, ?, ?)').run(id, jid, cronExpr, message);
}

function listSchedules() {
  try {
    db.prepare('CREATE TABLE IF NOT EXISTS schedules (id TEXT PRIMARY KEY, jid TEXT, cron TEXT, message TEXT)').run();
    return db.prepare('SELECT * FROM schedules').all();
  } catch { return []; }
}

function deleteSchedule(id) {
  try { db.prepare('DELETE FROM schedules WHERE id=?').run(id); } catch {}
}

module.exports = {
  initDB, logMessage,
  addKeyword, deleteKeyword, listKeywords, getKeywordReply,
  saveTodo, listTodos, completeTodo,
  saveNote, getNote, listNotes,
  getGroupSetting, setGroupSetting,
  getGlobalSetting, setGlobalSetting,
  banUser, unbanUser, isBanned,
  getRecentLogs, getMessageStats, getStats,
  saveSchedule, listSchedules, deleteSchedule,
};

function getInactiveMembers(jid, days) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  return db.prepare(
    'SELECT DISTINCT sender FROM messages WHERE jid=? AND time > ?'
  ).all(jid, since);
}

module.exports = { ...module.exports, getInactiveMembers };
