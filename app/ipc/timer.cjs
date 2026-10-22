const { ipcMain } = require('electron');
const examClock = require('../services/exam-clock.cjs');

function register() {
  ipcMain.handle('start-timer', () => examClock.start());
  ipcMain.handle('stop-timer', () => examClock.stop());
}

module.exports = { register };
