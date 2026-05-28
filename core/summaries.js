const fs = require('fs');
const path = require('path');

const SUMMARY_FILE = path.join(__dirname, '../db/summaries.json');

function loadSummaries() {
  try {
    if (fs.existsSync(SUMMARY_FILE)) {
      return JSON.parse(fs.readFileSync(SUMMARY_FILE, 'utf8'));
    }
  } catch {}
  return {};
}

function saveSummaries(data) {
  try {
    fs.writeFileSync(SUMMARY_FILE, JSON.stringify(data, null, 2));
  } catch {}
}

function getSummary(number) {
  const data = loadSummaries();
  return data[number] || null;
}

function setSummary(number, summary, name) {
  const data = loadSummaries();
  data[number] = data[number] || {};
  if (summary) data[number].summary = summary;
  if (name) data[number].name = name;
  data[number].updatedAt = Date.now();
  saveSummaries(data);
}

function getName(number) {
  const data = loadSummaries();
  return data[number]?.name || null;
}

module.exports = { getSummary, setSummary, getName };
