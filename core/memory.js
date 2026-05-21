
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../db/bot.db'));

// Create contact memory table
db.exec(`
  CREATE TABLE IF NOT EXISTS contact_memory (
    number TEXT PRIMARY KEY,
    name TEXT,
    first_contact INTEGER,
    last_contact INTEGER,
    message_count INTEGER DEFAULT 0,
    topics TEXT DEFAULT '[]',
    mood TEXT DEFAULT 'neutral',
    is_flirty INTEGER DEFAULT 0,
    is_annoying INTEGER DEFAULT 0,
    is_bot_tester INTEGER DEFAULT 0,
    notes TEXT DEFAULT '[]',
    summary TEXT
  )
`);

function getContact(number) {
  return db.prepare('SELECT * FROM contact_memory WHERE number = ?').get(number);
}

function upsertContact(number, updates) {
  const existing = getContact(number);
  if (!existing) {
    db.prepare(`INSERT INTO contact_memory (number, name, first_contact, last_contact, message_count, topics, mood, is_flirty, is_annoying, is_bot_tester, notes, summary)
      VALUES (?, ?, ?, ?, 1, '[]', 'neutral', 0, 0, 0, '[]', null)`
    ).run(number, updates.name || null, Date.now(), Date.now());
  } else {
    const sets = Object.keys(updates).map(k => k + ' = ?').join(', ');
    const vals = [...Object.values(updates), number];
    db.prepare(`UPDATE contact_memory SET ${sets}, last_contact = ?, message_count = message_count + 1 WHERE number = ?`)
      .run(...Object.values(updates), Date.now(), number);
  }
  return getContact(number);
}

function addTopic(number, topic) {
  const contact = getContact(number);
  if (!contact) return;
  const topics = JSON.parse(contact.topics || '[]');
  if (!topics.includes(topic)) {
    topics.push(topic);
    if (topics.length > 15) topics.shift();
    db.prepare('UPDATE contact_memory SET topics = ? WHERE number = ?').run(JSON.stringify(topics), number);
  }
}

function addNote(number, note) {
  const contact = getContact(number);
  if (!contact) return;
  const notes = JSON.parse(contact.notes || '[]');
  notes.push({ note, time: Date.now() });
  if (notes.length > 10) notes.shift();
  db.prepare('UPDATE contact_memory SET notes = ? WHERE number = ?').run(JSON.stringify(notes), number);
}

function buildContactContext(number) {
  const contact = getContact(number);
  if (!contact) return null;

  const topics = JSON.parse(contact.topics || '[]');
  const notes = JSON.parse(contact.notes || '[]');
  const daysSinceFirst = Math.floor((Date.now() - contact.first_contact) / 86400000);
  const daysSinceLast = Math.floor((Date.now() - contact.last_contact) / 86400000);
  const isNew = contact.message_count <= 2;
  const isRegular = contact.message_count > 20;
  const beenAwhile = daysSinceLast > 3;

  let context = '';

  if (contact.name) context += `Their name is ${contact.name}. `;
  if (isNew) context += 'This is one of the first times they are texting you. ';
  if (isRegular) context += `You text regularly, they have sent ${contact.message_count} messages. `;
  if (beenAwhile) context += `They have not texted in ${daysSinceLast} days, so reference it naturally like "been a minute" or "where you been". `;
  if (topics.length) context += `Topics you have discussed: ${topics.join(', ')}. Reference these naturally when relevant. `;
  if (contact.is_flirty) context += 'This person tends to flirt, match that energy subtly. ';
  if (contact.is_annoying) context += 'This person can be annoying or needy. Keep replies shorter and drier. ';
  if (contact.is_bot_tester) context += 'This person has tried to test if you are a bot before. Be extra natural and deflect any bot questions with humor. ';
  if (notes.length) context += `Things to remember: ${notes.map(n => n.note).join(', ')}. `;
  if (contact.summary) context += `Summary of past conversations: ${contact.summary}. `;

  return context;
}

module.exports = { getContact, upsertContact, addTopic, addNote, buildContactContext };
