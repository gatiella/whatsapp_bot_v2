const { getJID } = require('../utils/helpers');
const { saveNote, getNote, listNotes, saveTodo, listTodos, completeTodo } = require('../db/database');
const cron = require('node-cron');
const moment = require('moment');
const logger = require('../utils/logger');

// Store active reminders in memory
global.reminders = global.reminders || [];

async function handleProductivity(sock, msg, cmd, args) {
  const jid = getJID(msg);
  const sender = msg.key.participant || msg.key.remoteJid;

  switch (cmd) {
    case 'remind': {
      // !remind 10m Take medicine  OR  !remind 17:30 Call client
      const timeStr = args[0];
      const reminder = args.slice(1).join(' ');
      if (!timeStr || !reminder) {
        await sock.sendMessage(jid, { text: '❌ Usage: !remind 10m <message> OR !remind 17:30 <message>' });
        return;
      }

      let ms = 0;
      if (/^\d+m$/.test(timeStr)) ms = parseInt(timeStr) * 60000;
      else if (/^\d+h$/.test(timeStr)) ms = parseInt(timeStr) * 3600000;
      else if (/^\d+s$/.test(timeStr)) ms = parseInt(timeStr) * 1000;
      else if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
        const [h, m] = timeStr.split(':').map(Number);
        const now = new Date();
        const target = new Date();
        target.setHours(h, m, 0, 0);
        if (target <= now) target.setDate(target.getDate() + 1);
        ms = target - now;
      }

      if (!ms) {
        await sock.sendMessage(jid, { text: '❌ Invalid time. Use 10m, 2h, or 17:30' });
        return;
      }

      setTimeout(async () => {
        await sock.sendMessage(jid, {
          text: `⏰ *Reminder!*\n\n${reminder}`,
          mentions: [sender],
        });
      }, ms);

      const whenStr = ms < 3600000 ? `${Math.round(ms/60000)} minutes` : `${Math.round(ms/3600000)} hours`;
      await sock.sendMessage(jid, { text: `✅ Reminder set for ${whenStr} from now.\n📝 _${reminder}_` });
      break;
    }

    case 'todo': {
      const sub = args[0]?.toLowerCase();
      if (sub === 'add') {
        const task = args.slice(1).join(' ');
        if (!task) { await sock.sendMessage(jid, { text: '❌ Usage: !todo add <task>' }); return; }
        await saveTodo(sender, task);
        await sock.sendMessage(jid, { text: `✅ Added to your list: _${task}_` });
      } else if (sub === 'list') {
        const todos = await listTodos(sender);
        if (!todos.length) { await sock.sendMessage(jid, { text: '📋 Your todo list is empty.' }); return; }
        const lines = todos.map((t, i) => `${t.done ? '✅' : '⬜'} ${i+1}. ${t.task}`);
        await sock.sendMessage(jid, { text: `📋 *Your Todo List*\n\n${lines.join('\n')}` });
      } else if (sub === 'done') {
        const idx = parseInt(args[1]) - 1;
        await completeTodo(sender, idx);
        await sock.sendMessage(jid, { text: `✅ Task marked as done!` });
      } else {
        await sock.sendMessage(jid, { text: '❌ Usage: !todo add/list/done <number>' });
      }
      break;
    }

    case 'note': {
      const sub = args[0]?.toLowerCase();
      if (sub === 'save') {
        const [, key, ...rest] = args;
        const value = rest.join(' ');
        if (!key || !value) { await sock.sendMessage(jid, { text: '❌ Usage: !note save <key> <text>' }); return; }
        await saveNote(sender, key, value);
        await sock.sendMessage(jid, { text: `✅ Note saved as *${key}*.` });
      } else if (sub === 'get') {
        const key = args[1];
        if (!key) { await sock.sendMessage(jid, { text: '❌ Usage: !note get <key>' }); return; }
        const note = await getNote(sender, key);
        if (!note) { await sock.sendMessage(jid, { text: `❌ No note found for *${key}*.` }); return; }
        await sock.sendMessage(jid, { text: `📝 *${key}:*\n\n${note}` });
      } else if (sub === 'list') {
        const notes = await listNotes(sender);
        if (!notes.length) { await sock.sendMessage(jid, { text: '📝 No notes saved.' }); return; }
        await sock.sendMessage(jid, { text: `📝 *Your Notes:*\n\n${notes.map(n => `• ${n}`).join('\n')}` });
      } else {
        await sock.sendMessage(jid, { text: '❌ Usage: !note save/get/list' });
      }
      break;
    }

    case 'notes':
      args.unshift('list');
      return handleProductivity(sock, msg, 'note', args);

    case 'broadcast': {
      if (sender.replace('@s.whatsapp.net', '') !== process.env.OWNER_NUMBER) {
        await sock.sendMessage(jid, { text: '❌ Only the bot owner can broadcast.' });
        return;
      }
      const message = args.join(' ');
      if (!message) { await sock.sendMessage(jid, { text: '❌ Usage: !broadcast <message>' }); return; }
      await sock.sendMessage(jid, { text: `📢 Broadcast sent: _${message}_` });
      logger.info(`Broadcast: ${message}`);
      break;
    }

    case 'stats': {
      const { getMessageStats } = require('../db/database');
      const stats = await getMessageStats(jid);
      await sock.sendMessage(jid, {
        text: `📊 *Chat Stats*\n\n` +
          `💬 Total messages: *${stats.total}*\n` +
          `📅 Today: *${stats.today}*\n` +
          `👥 Unique users: *${stats.users}*`,
      });
      break;
    }
  }
}

module.exports = { handleProductivity };
