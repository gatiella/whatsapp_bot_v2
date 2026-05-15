const Database = require('better-sqlite3');
const path = require('path');
const logger = require('../utils/logger');

let db;

function initDB() {
  db = new Database(path.join(__dirname, 'bot.db'));
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      jid TEXT, sender TEXT, text TEXT,
      time TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS group_settings (
      jid TEXT, key TEXT, value TEXT,
      PRIMARY KEY (jid, key)
    );
    CREATE TABLE IF NOT EXISTS global_settings (
      key TEXT PRIMARY KEY, value TEXT
    );
    CREATE TABLE IF NOT EXISTS keywords (
      keyword TEXT PRIMARY KEY, reply TEXT
    );
    CREATE TABLE IF NOT EXISTS todos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender TEXT, task TEXT, done INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS notes (
      sender TEXT, key TEXT, value TEXT,
      PRIMARY KEY (sender, key)
    );
    CREATE TABLE IF NOT EXISTS banned (
      number TEXT PRIMARY KEY
    );
  `);

  logger.info('✅ Database initialized');
}

function logMessage(jid, sender, text) {
  db.prepare('INSERT INTO messages (jid, sender, text) VALUES (?, ?, ?)').run(jid, sender, text);
}

function getGroupSetting(jid, key) {
  const row = db.prepare('SELECT value FROM group_settings WHERE jid=? AND key=?').get(jid, key);
  return row?.value || null;
}

function setGroupSetting(jid, key, value) {
  db.prepare('INSERT OR REPLACE INTO group_settings (jid, key, value) VALUES (?, ?, ?)').run(jid, key, value);
}

function getGlobalSetting(key) {
  const row = db.prepare('SELECT value FROM global_settings WHERE key=?').get(key);
  return row?.value || null;
}

function setGlobalSetting(key, value) {
  db.prepare('INSERT OR REPLACE INTO global_settings (key, value) VALUES (?, ?)').run(key, value);
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
  if (todos[idx]) {
    db.prepare('UPDATE todos SET done=1 WHERE id=?').run(todos[idx].id);
  }
}

function saveNote(sender, key, value) {
  db.prepare('INSERT OR REPLACE INTO notes (sender, key, value) VALUES (?, ?, ?)').run(sender, key, value);
}

function getNote(sender, key) {
  const row = db.prepare('SELECT value FROM notes WHERE sender=? AND key=?').get(sender, key);
  return row?.value || null;
}

function listNotes(sender) {
  return db.prepare('SELECT key FROM notes WHERE sender=?').all(sender).map(r => r.key);
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
  return {
    totalMessages: db.prepare('SELECT COUNT(*) as c FROM messages').get()?.c || 0,
    totalGroups: db.prepare('SELECT COUNT(DISTINCT jid) as c FROM group_settings').get()?.c || 0,
  };
}

module.exports = {
  initDB, logMessage,
  getGroupSetting, setGroupSetting,
  getGlobalSetting, setGlobalSetting,
  addKeyword, deleteKeyword, listKeywords, getKeywordReply,
  saveTodo, listTodos, completeTodo,
  saveNote, getNote, listNotes,
  banUser, unbanUser, isBanned,
  getRecentLogs, getMessageStats, getStats,
};
