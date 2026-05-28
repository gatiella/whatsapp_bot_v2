
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || path.join(__dirname, '../db/bot.db');
const db = new Database(dbPath);

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
    const extraSets = Object.keys(updates).map(k => k + ' = ?').join(', ');
    const setSql = extraSets ? extraSets + ', last_contact = ?, message_count = message_count + 1' : 'last_contact = ?, message_count = message_count + 1';
    db.prepare(`UPDATE contact_memory SET ${setSql} WHERE number = ?`)
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

function getRelationshipTier(contact) {
  const count = contact.message_count || 0;
  const daysSinceFirst = Math.floor((Date.now() - contact.first_contact) / 86400000);

  if (count >= 100 || (count >= 50 && daysSinceFirst >= 14)) return 'close';
  if (count >= 20 || (count >= 10 && daysSinceFirst >= 7)) return 'acquaintance';
  if (count >= 5) return 'known';
  return 'stranger';
}

function buildContactContext(number) {
  const contact = getContact(number);
  if (!contact) return null;

  const topics = JSON.parse(contact.topics || '[]');
  const notes = JSON.parse(contact.notes || '[]');
  const daysSinceLast = Math.floor((Date.now() - contact.last_contact) / 86400000);
  const beenAwhile = daysSinceLast > 3;
  const tier = getRelationshipTier(contact);

  let context = '';

  if (contact.name) context += `Their name is ${contact.name}. `;

  // Relationship tier — shapes tone of entire reply
  if (tier === 'stranger') {
    context += 'You barely know this person, only a few messages exchanged. Be normal but a bit measured, not too open, not cold. Short replies. ';
  } else if (tier === 'known') {
    context += 'You know this person a little, maybe 5-15 messages shared. Relaxed but not fully open yet. Normal conversational tone. ';
  } else if (tier === 'acquaintance') {
    context += 'You know this person decently well. Be relaxed, can joke around, reference things you have discussed before. ';
  } else if (tier === 'close') {
    context += 'This is someone you talk to regularly and know well. Be fully yourself — jokes, banter, slang, references to past convos, zero formality. Treat them like a real friend. ';
  }

  if (beenAwhile) context += `They have not texted in ${daysSinceLast} days, so acknowledge it naturally like "been a minute" or "where you been". `;
  if (topics.length) {
    context += `Topics you have talked about before: ${topics.join(', ')}. `;
    if (tier === 'close' || tier === 'acquaintance') {
      const recentTopic = topics[topics.length - 1];
      context += `If what they say connects to any of those topics, bring it up naturally like a real friend would. `;
      context += `The most recent topic was "${recentTopic}" — if there is a natural opening, reference it casually without forcing it. `;
    }
    if (tier === 'close') {
      context += 'You know this person well enough to randomly bring up a shared topic even if they did not mention it — like texting a friend you know watches football and asking if they saw the game. Only do this if their message is short or low effort and you need something to say. ';
    }
  }
  if (contact.is_flirty) context += 'This person tends to flirt. Match that energy subtly, be charming but natural. ';
  if (contact.is_annoying) context += 'This person can be annoying or needy. Keep replies shorter and drier, do not over-engage. ';
  if (contact.is_bot_tester) context += 'This person has tried to test if you are a bot. Be extra human, deflect any AI questions with dry confident humor — never admit anything. ';
  if (notes.length) context += `Things to remember about them: ${notes.map(n => n.note).join(', ')}. `;
  if (contact.summary) context += `Summary of past conversations: ${contact.summary}. `;

  return context;
}

module.exports = { getContact, upsertContact, addTopic, addNote, buildContactContext };
