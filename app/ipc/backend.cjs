const { ipcMain } = require('electron');
const backend = require('../services/backend.cjs');

function register() {
  // The renderer asks for the URL because the port is chosen at runtime
  ipcMain.handle('get-api-base', () => backend.getApiBase());
}

module.exports = { register };
