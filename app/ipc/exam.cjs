// Exam-level native features: dock progress, submit confirmation, report export, quit.
const { app, ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { getMainWindow } = require('../windows/main-window.cjs');
const report = require('../services/report.cjs');
const snapshots = require('../services/snapshots.cjs');

function register() {
  // Progress bar on the Dock icon / taskbar button: 0..1, or -1 to hide it
  ipcMain.on('exam:set-progress', (_event, fraction) => {
    const value = Number(fraction);
    getMainWindow()?.setProgressBar(Number.isFinite(value) ? Math.min(value, 1) : -1);
  });

  // Native "are you sure?" before submitting with unanswered questions
  ipcMain.handle('exam:confirm-submit', async (_event, unanswered) => {
    const n = Number(unanswered) || 0;
    const { response } = await dialog.showMessageBox(getMainWindow(), {
      type: 'warning',
      title: 'Submit exam',
      message: n > 0 ? `You have ${n} unanswered question${n === 1 ? '' : 's'}.` : 'Submit your exam?',
      detail: 'You cannot change your answers after submitting.',
      buttons: ['Submit Exam', 'Keep Working'],
      defaultId: 1,
      cancelId: 1,
    });
    return response === 0;
  });

  // Save dialog -> write report (.txt or .json) -> reveal it in Finder
  ipcMain.handle('report:export', async (_event, sessionId) => {
    const { canceled, filePath } = await dialog.showSaveDialog(getMainWindow(), {
      title: 'Save exam report',
      defaultPath: path.join(app.getPath('documents'), `athena-report-${Date.now()}.txt`),
      filters: [{ name: 'Text report', extensions: ['txt'] }, { name: 'JSON', extensions: ['json'] }],
    });
    if (canceled || !filePath) return null;
    await fs.promises.writeFile(filePath, await report.build(sessionId, filePath));
    shell.showItemInFolder(filePath);
    return filePath;
  });

  // Open this session's snapshots (falls back to the base folder)
  ipcMain.handle('snapshots:open-session-folder', async (_event, sessionId) => {
    const base = snapshots.getBaseFolder();
    const candidate = report.SESSION_ID.test(String(sessionId)) ? path.join(base, sessionId) : base;
    return (await shell.openPath(fs.existsSync(candidate) ? candidate : base)) === '';
  });

  ipcMain.handle('app:quit', () => app.quit());
}

module.exports = { register };
