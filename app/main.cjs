// Electron main process entry point: app lifecycle only.
// Windows live in ./windows, IPC handlers in ./ipc, background logic in ./services.
const { app, BrowserWindow, dialog } = require('electron');
const { createMainWindow } = require('./windows/main-window.cjs');
const { registerAll } = require('./ipc/index.cjs');
const proctor = require('./services/proctor.cjs');
const { watchFullScreen } = require('./ipc/system.cjs');
const backend = require('./services/backend.cjs');

// Only one exam window at a time: a second launch focuses the first one
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      await backend.start();
    } catch (error) {
      dialog.showErrorBox('Athena Exam', `Could not start the exam server:\n${error.message}`);
      app.quit();
      return;
    }
    registerAll();
    watchFullScreen(createMainWindow());

    // macOS: re-create the window when the dock icon is clicked and none are open
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) watchFullScreen(createMainWindow());
    });
  });

  // An exam app should fully quit when its window closes (also on macOS)
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => {
    proctor.stop();
    backend.stop();
  });
}
