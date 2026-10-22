// Tiny persistent settings store: <userData>/settings.json
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

const file = () => path.join(app.getPath('userData'), 'settings.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(file(), 'utf-8'));
  } catch {
    return {}; // missing or corrupt file => defaults
  }
}

function get(key, fallback = null) {
  return load()[key] ?? fallback;
}

function set(key, value) {
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  fs.writeFileSync(file(), JSON.stringify({ ...load(), [key]: value }, null, 2));
}

module.exports = { get, set };
