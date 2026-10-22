const { ipcMain, nativeTheme } = require('electron');
const { sendToRenderer } = require('../windows/main-window.cjs');

const currentTheme = () => (nativeTheme.shouldUseDarkColors ? 'dark' : 'light');

function register() {
  ipcMain.handle('get-theme', currentTheme);
  // Push OS theme changes to the renderer (registered once, not per window)
  nativeTheme.on('updated', () => sendToRenderer('theme-changed', currentTheme()));
}

module.exports = { register };
