const { getJID } = require('../utils/helpers');
const { safeSend } = require('../utils/send');
const { saveNote, getNote, listNotes, saveTodo, listTodos, completeTodo, getMessageStats,
        saveSchedule, listSchedules, deleteSchedule, addKeyword, deleteKeyword, listKeywords } = require('../db/database');
const cron = require('node-cron');
const logger = require('../utils/logger');

global.scheduledJobs = global.scheduledJobs || {};

async function handleProductivity(sock, msg, cmd, args) {
  const jid = getJID(msg);
  const sender = msg.key.participant || msg.key.remoteJid;
  const senderNum = sender.replace(/@s\.whatsapp\.net|@lid/g, '').replace(/:\d+/, '');
  const isOwner = senderNum === (process.env.OWNER_NUMBER || '').trim();

  switch (cmd) {
    case 'remind': {
      const timeStr = args[0];
      const reminder = args.slice(1).join(' ');
      if (!timeStr || !reminder) { await safeSend(sock, jid, { text: 'Usage: !remind 10m <msg> OR !remind 17:30 <msg>' }); return; }
      let ms = 0;
      if (/^\d+s$/.test(timeStr)) ms = parseInt(timeStr) * 1000;
      else if (/^\d+m$/.test(timeStr)) ms = parseInt(timeStr) * 60000;
      else if (/^\d+h$/.test(timeStr)) ms = parseInt(timeStr) * 3600000;
      else if (/^\d{1,2}:\d{2}$/.test(timeStr)) {
        const [h, m] = timeStr.split(':').map(Number);
        const target = new Date();
        target.setHours(h, m, 0, 0);
        if (target <= new Date()) target.setDate(target.getDate() + 1);
        ms = target - new Date();
      }
      if (!ms) { await safeSend(sock, jid, { text: 'Invalid time. Use 10m, 2h, or 17:30' }); return; }
      setTimeout(async () => {
        await safeSend(sock, jid, { text: 'Reminder: ' + reminder, mentions: [sender] });
      }, ms);
      const whenStr = ms < 3600000 ? Math.round(ms/60000) + ' minutes' : Math.round(ms/3600000) + ' hours';
      await safeSend(sock, jid, { text: 'Reminder set for ' + whenStr + ': ' + reminder });
      break;
    }

    case 'todo': {
      const sub = args[0]?.toLowerCase();
      if (sub === 'add') {
        const task = args.slice(1).join(' ');
        if (!task) { await safeSend(sock, jid, { text: 'Usage: !todo add <task>' }); return; }
        await saveTodo(sender, task);
        await safeSend(sock, jid, { text: 'Added: ' + task });
      } else if (sub === 'list') {
        const todos = await listTodos(sender);
        if (!todos.length) { await safeSend(sock, jid, { text: 'Todo list is empty.' }); return; }
        const lines = todos.map((t, i) => (t.done ? 'DONE' : 'TODO') + ' ' + (i+1) + '. ' + t.task);
        await safeSend(sock, jid, { text: 'Todo List:\n\n' + lines.join('\n') });
      } else if (sub === 'done') {
        const idx = parseInt(args[1]) - 1;
        await completeTodo(sender, idx);
        await safeSend(sock, jid, { text: 'Task marked done!' });
      } else {
        await safeSend(sock, jid, { text: 'Usage: !todo add/list/done <number>' });
      }
      break;
    }

    case 'note': {
      const sub = args[0]?.toLowerCase();
      if (sub === 'save') {
        const [, key, ...rest] = args;
        const value = rest.join(' ');
        if (!key || !value) { await safeSend(sock, jid, { text: 'Usage: !note save <key> <text>' }); return; }
        await saveNote(sender, key, value);
        await safeSend(sock, jid, { text: 'Note saved: ' + key });
      } else if (sub === 'get') {
        const key = args[1];
        if (!key) { await safeSend(sock, jid, { text: 'Usage: !note get <key>' }); return; }
        const note = await getNote(sender, key);
        if (!note) { await safeSend(sock, jid, { text: 'No note found for ' + key }); return; }
        await safeSend(sock, jid, { text: key + ':\n\n' + note });
      } else if (sub === 'list') {
        const notes = await listNotes(sender);
        if (!notes.length) { await safeSend(sock, jid, { text: 'No notes saved.' }); return; }
        await safeSend(sock, jid, { text: 'Notes:\n\n' + notes.map(n => '- ' + n).join('\n') });
      } else {
        await safeSend(sock, jid, { text: 'Usage: !note save/get/list' });
      }
      break;
    }

    case 'notes':
      return handleProductivity(sock, msg, 'note', ['list']);

    case 'broadcast': {
      if (!isOwner) { await safeSend(sock, jid, { text: 'Owner only command.' }); return; }
      const sub = args[0]?.toLowerCase();
      if (sub === 'all') {
        const message = args.slice(1).join(' ');
        if (!message) { await safeSend(sock, jid, { text: 'Usage: !broadcast all <message>' }); return; }
        await safeSend(sock, jid, { text: 'Broadcasting to all groups...' });
        const groups = await sock.groupFetchAllParticipating();
        const groupList = Object.values(groups);
        let sent = 0;
        for (const group of groupList) {
          try { await sock.sendMessage(group.id, { text: message }); sent++; await new Promise(r => setTimeout(r, 1500)); } catch (_) {}
        }
        await safeSend(sock, jid, { text: 'Broadcast sent to ' + sent + '/' + groupList.length + ' groups.' });
      } else if (sub === 'list') {
        const message = args.slice(1).join(' ');
        if (!message) { await safeSend(sock, jid, { text: 'Usage: !broadcast list <message>' }); return; }
        const contacts = (process.env.BROADCAST_LIST || '').split(',').map(n => n.trim()).filter(Boolean);
        if (!contacts.length) { await safeSend(sock, jid, { text: 'Add BROADCAST_LIST=2547XXX,2547XXX to .env first.' }); return; }
        let sent = 0;
        for (const num of contacts) {
          try { await sock.sendMessage(num + '@s.whatsapp.net', { text: message }); sent++; await new Promise(r => setTimeout(r, 1500)); } catch (_) {}
        }
        await safeSend(sock, jid, { text: 'Sent to ' + sent + '/' + contacts.length + ' contacts.' });
      } else if (sub === 'groups') {
        const groups = await sock.groupFetchAllParticipating();
        const groupList = Object.values(groups);
        const lines = groupList.map((g, i) => (i+1) + '. ' + g.subject + ' (' + g.participants.length + ' members)');
        await safeSend(sock, jid, { text: 'Your Groups (' + groupList.length + '):\n\n' + lines.join('\n') });
      } else {
        await safeSend(sock, jid, { text: 'Broadcast:\n!broadcast all <msg>\n!broadcast list <msg>\n!broadcast groups' });
      }
      break;
    }

    case 'schedule': {
      if (!isOwner) { await safeSend(sock, jid, { text: 'Owner only command.' }); return; }
      const sub = args[0]?.toLowerCase();
      if (sub === 'add') {
        const time = args[1];
        const message = args.slice(2).join(' ');
        if (!time || !message) { await safeSend(sock, jid, { text: 'Usage: !schedule add HH:MM <message>' }); return; }
        const [h, m] = time.split(':');
        const cronExpr = m + ' ' + h + ' * * *';
        const id = Date.now().toString();
        await saveSchedule(id, jid, cronExpr, message);
        global.scheduledJobs[id] = cron.schedule(cronExpr, async () => {
          await safeSend(sock, jid, { text: 'Scheduled: ' + message });
        });
        await safeSend(sock, jid, { text: 'Scheduled daily at ' + time + ': ' + message });
      } else if (sub === 'list') {
        const schedules = await listSchedules();
        if (!schedules.length) { await safeSend(sock, jid, { text: 'No scheduled messages.' }); return; }
        const lines = schedules.map((s, i) => (i+1) + '. [' + s.id + '] ' + s.cron + ' - ' + s.message);
        await safeSend(sock, jid, { text: 'Schedules:\n\n' + lines.join('\n') });
      } else if (sub === 'delete') {
        const id = args[1];
        if (!id) { await safeSend(sock, jid, { text: 'Usage: !schedule delete <id>' }); return; }
        if (global.scheduledJobs[id]) { global.scheduledJobs[id].destroy(); delete global.scheduledJobs[id]; }
        await deleteSchedule(id);
        await safeSend(sock, jid, { text: 'Schedule deleted.' });
      } else {
        await safeSend(sock, jid, { text: 'Schedule:\n!schedule add HH:MM <msg>\n!schedule list\n!schedule delete <id>' });
      }
      break;
    }

    case 'autoreply': {
      if (!isOwner) { await safeSend(sock, jid, { text: 'Owner only command.' }); return; }
      const sub = args[0]?.toLowerCase();
      if (sub === 'add') {
        const keyword = args[1];
        const reply = args.slice(2).join(' ');
        if (!keyword || !reply) { await safeSend(sock, jid, { text: 'Usage: !autoreply add <keyword> <reply>' }); return; }
        await addKeyword(keyword.toLowerCase(), reply);
        await safeSend(sock, jid, { text: 'Auto-reply: ' + keyword + ' -> ' + reply });
      } else if (sub === 'delete') {
        const keyword = args[1];
        if (!keyword) { await safeSend(sock, jid, { text: 'Usage: !autoreply delete <keyword>' }); return; }
        await deleteKeyword(keyword.toLowerCase());
        await safeSend(sock, jid, { text: 'Deleted: ' + keyword });
      } else if (sub === 'list') {
        const keywords = await listKeywords();
        if (!keywords.length) { await safeSend(sock, jid, { text: 'No auto-replies set.' }); return; }
        await safeSend(sock, jid, { text: 'Auto-replies:\n\n' + keywords.map(k => k.keyword + ' -> ' + k.reply).join('\n') });
      } else {
        await safeSend(sock, jid, { text: 'Usage: !autoreply add/delete/list' });
      }
      break;
    }

    case 'stats': {
      const stats = await getMessageStats(jid);
      const groups = await sock.groupFetchAllParticipating().catch(() => ({}));
      const uptime = Math.floor(process.uptime());
      await safeSend(sock, jid, {
        text: 'Bot Stats:\nMessages: ' + stats.total + '\nToday: ' + stats.today +
          '\nUsers: ' + stats.users + '\nGroups: ' + Object.keys(groups).length +
          '\nUptime: ' + Math.floor(uptime/3600) + 'h ' + Math.floor((uptime%3600)/60) + 'm'
      });
      break;
    }
    case 'habit': {
      const sub = args[0]?.toLowerCase();
      const habitName = args.slice(1).join(' ');
      global.habits = global.habits || {};
      global.habits[sender] = global.habits[sender] || {};
      if (sub === 'add') {
        if (!habitName) { await safeSend(sock, jid, { text: '❌ Usage: !habit add <name>' }); return; }
        global.habits[sender][habitName] = { streak: 0, lastDone: null };
        await safeSend(sock, jid, { text: '✅ Habit added: ' + habitName });
      } else if (sub === 'done') {
        const habit = global.habits[sender][habitName];
        if (!habit) { await safeSend(sock, jid, { text: '❌ Habit not found.' }); return; }
        const today = new Date().toDateString();
        if (habit.lastDone === today) { await safeSend(sock, jid, { text: '✅ Already done today!' }); return; }
        habit.streak++;
        habit.lastDone = today;
        await safeSend(sock, jid, { text: '🔥 ' + habitName + ' done! Streak: ' + habit.streak + ' days' });
      } else if (sub === 'list') {
        const habits = global.habits[sender];
        if (!habits || !Object.keys(habits).length) { await safeSend(sock, jid, { text: '📋 No habits yet.' }); return; }
        const lines = Object.entries(habits).map(([n, h]) => '🔥 ' + n + ' — ' + h.streak + ' day streak');
        await safeSend(sock, jid, { text: '📋 *Your Habits:*\n\n' + lines.join('\n') });
      } else if (sub === 'delete') {
        delete global.habits[sender][habitName];
        await safeSend(sock, jid, { text: '✅ Habit deleted.' });
      } else {
        await safeSend(sock, jid, { text: 'Usage: !habit add/done/list/delete <name>' });
      }
      break;
    }

    case 'goal': {
      const sub = args[0]?.toLowerCase();
      const goalText = args.slice(1).join(' ');
      global.goals = global.goals || {};
      global.goals[sender] = global.goals[sender] || [];
      if (sub === 'add') {
        if (!goalText) { await safeSend(sock, jid, { text: '❌ Usage: !goal add <goal>' }); return; }
        global.goals[sender].push({ text: goalText, done: false, date: new Date().toLocaleDateString() });
        await safeSend(sock, jid, { text: '🎯 Goal added: ' + goalText });
      } else if (sub === 'list') {
        const goals = global.goals[sender];
        if (!goals?.length) { await safeSend(sock, jid, { text: '🎯 No goals yet.' }); return; }
        const lines = goals.map((g, i) => (g.done ? '✅' : '🎯') + ' ' + (i+1) + '. ' + g.text);
        await safeSend(sock, jid, { text: '🎯 *Your Goals:*\n\n' + lines.join('\n') });
      } else if (sub === 'done') {
        const idx = parseInt(args[1]) - 1;
        if (global.goals[sender][idx]) { global.goals[sender][idx].done = true; await safeSend(sock, jid, { text: '✅ Goal completed! Keep going! 🔥' }); }
      } else if (sub === 'delete') {
        const idx = parseInt(args[1]) - 1;
        global.goals[sender].splice(idx, 1);
        await safeSend(sock, jid, { text: '✅ Goal deleted.' });
      } else {
        await safeSend(sock, jid, { text: 'Usage: !goal add/list/done/delete' });
      }
      break;
    }

    case 'expense': {
      const sub = args[0]?.toLowerCase();
      global.expenses = global.expenses || {};
      global.expenses[sender] = global.expenses[sender] || [];
      if (sub === 'add') {
        const amount = parseFloat(args[1]);
        const desc = args.slice(2).join(' ');
        if (!amount || !desc) { await safeSend(sock, jid, { text: '❌ Usage: !expense add <amount> <description>' }); return; }
        global.expenses[sender].push({ amount, desc, date: new Date().toLocaleDateString() });
        await safeSend(sock, jid, { text: '💸 Expense added: ' + desc + ' — $' + amount });
      } else if (sub === 'list') {
        const expenses = global.expenses[sender];
        if (!expenses?.length) { await safeSend(sock, jid, { text: '💸 No expenses yet.' }); return; }
        const total = expenses.reduce((s, e) => s + e.amount, 0);
        const lines = expenses.map((e, i) => (i+1) + '. ' + e.desc + ' — $' + e.amount + ' (' + e.date + ')');
        await safeSend(sock, jid, { text: '💸 *Expenses:*\n\n' + lines.join('\n') + '\n\n*Total: $' + total.toFixed(2) + '*' });
      } else if (sub === 'clear') {
        global.expenses[sender] = [];
        await safeSend(sock, jid, { text: '✅ Expenses cleared.' });
      } else {
        await safeSend(sock, jid, { text: 'Usage: !expense add <amount> <desc> | list | clear' });
      }
      break;
    }

    case 'budget':
      return handleProductivity(sock, msg, 'expense', ['list']);

    case 'countdown': {
      const sub = args[0]?.toLowerCase();
      global.countdowns = global.countdowns || {};
      global.countdowns[sender] = global.countdowns[sender] || [];
      if (sub === 'add') {
        const date = args[1];
        const eventName = args.slice(2).join(' ');
        if (!date || !eventName) { await safeSend(sock, jid, { text: '❌ Usage: !countdown add YYYY-MM-DD <event name>' }); return; }
        const target = new Date(date);
        if (isNaN(target)) { await safeSend(sock, jid, { text: '❌ Invalid date. Use YYYY-MM-DD' }); return; }
        global.countdowns[sender].push({ date, eventName });
        const days = Math.ceil((target - new Date()) / 86400000);
        await safeSend(sock, jid, { text: '⏳ Countdown added: ' + eventName + ' in ' + days + ' days!' });
      } else if (sub === 'list') {
        const countdowns = global.countdowns[sender];
        if (!countdowns?.length) { await safeSend(sock, jid, { text: '⏳ No countdowns yet.' }); return; }
        const lines = countdowns.map((c, i) => {
          const days = Math.ceil((new Date(c.date) - new Date()) / 86400000);
          return (i+1) + '. ' + c.eventName + ' — ' + (days > 0 ? days + ' days left' : 'Today! 🎉');
        });
        await safeSend(sock, jid, { text: '⏳ *Countdowns:*\n\n' + lines.join('\n') });
      } else {
        await safeSend(sock, jid, { text: 'Usage: !countdown add YYYY-MM-DD <event> | list' });
      }
      break;
    }

    case 'pomodoro': {
      const minutes = parseInt(args[0]) || 25;
      await safeSend(sock, jid, { text: '🍅 *Pomodoro Started!*\n\nFocus for ' + minutes + ' minutes.\nI will notify you when done! 💪' });
      setTimeout(async () => {
        try {
          await safeSend(sock, jid, { text: '⏰ *Pomodoro Complete!*\n\n🎉 Great work! Take a 5 minute break.\nType !pomodoro to start another.' });
        } catch (_) {}
      }, minutes * 60 * 1000);
      break;
    }

    case 'checklist': {
      const sub = args[0]?.toLowerCase();
      const item = args.slice(1).join(' ');
      global.checklists = global.checklists || {};
      global.checklists[sender] = global.checklists[sender] || [];
      if (sub === 'add') {
        if (!item) { await safeSend(sock, jid, { text: '❌ Usage: !checklist add <item>' }); return; }
        global.checklists[sender].push({ item, done: false });
        await safeSend(sock, jid, { text: '✅ Added: ' + item });
      } else if (sub === 'list') {
        const list = global.checklists[sender];
        if (!list?.length) { await safeSend(sock, jid, { text: '📋 Checklist is empty.' }); return; }
        const lines = list.map((i, idx) => (i.done ? '☑️' : '⬜') + ' ' + (idx+1) + '. ' + i.item);
        await safeSend(sock, jid, { text: '📋 *Checklist:*\n\n' + lines.join('\n') });
      } else if (sub === 'done') {
        const idx = parseInt(args[1]) - 1;
        if (global.checklists[sender][idx]) { global.checklists[sender][idx].done = true; await safeSend(sock, jid, { text: '☑️ Item checked off!' }); }
      } else if (sub === 'clear') {
        global.checklists[sender] = [];
        await safeSend(sock, jid, { text: '✅ Checklist cleared.' });
      } else {
        await safeSend(sock, jid, { text: 'Usage: !checklist add/list/done/clear' });
      }
      break;
    }
  }
}
async function restoreSchedules(sock) {
  try {
    const schedules = await listSchedules();
    for (const s of schedules) {
      global.scheduledJobs[s.id] = cron.schedule(s.cron, async () => {
        await sock.sendMessage(s.jid, { text: 'Scheduled: ' + s.message });
      });
    }
    if (schedules.length) logger.info('Restored ' + schedules.length + ' schedules');
  } catch (e) { logger.error('Schedule restore error:', e); }
}

module.exports = { handleProductivity, restoreSchedules };

// New productivity features
global.habits = global.habits || {};
global.goals = global.goals || {};
global.expenses = global.expenses || {};
global.countdowns = global.countdowns || {};
global.checklists = global.checklists || {};
