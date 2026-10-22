const { ipcMain } = require('electron');
const proctor = require('../services/proctor.cjs');

function register() {
  ipcMain.handle('proctor:start', (_event, sessionId) => {
    if (typeof sessionId !== 'string' || !sessionId) throw new Error('sessionId is required');
    proctor.start(sessionId);
  });
  ipcMain.handle('proctor:stop', () => proctor.stop());
  ipcMain.handle('proctor:save-camera-snap', (_event, data) => proctor.saveCameraSnapshot(data));
}

module.exports = { register };
