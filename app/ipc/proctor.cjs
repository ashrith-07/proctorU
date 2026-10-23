const { ipcMain } = require('electron');
const proctor = require('../services/proctor.cjs');
const violations = require('../services/violations.cjs');

// Only these are detected by the page itself; the rest come from the main process
const RENDERER_VIOLATIONS = ['copy-paste', 'devtools-shortcut', 'camera-lost'];

function register() {
  ipcMain.handle('proctor:start', (_event, sessionId) => {
    if (typeof sessionId !== 'string' || !sessionId) throw new Error('sessionId is required');
    proctor.start(sessionId);
  });
  ipcMain.handle('proctor:stop', () => proctor.stop());
  ipcMain.on('violation:report', (_event, type) => {
    if (RENDERER_VIOLATIONS.includes(type)) violations.report(type);
  });
  ipcMain.handle('proctor:save-camera-snap', (_event, data) => proctor.saveCameraSnapshot(data));
}

module.exports = { register };
