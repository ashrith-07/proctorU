// Electron main process entry point: app lifecycle only.
// Windows live in ./windows, IPC handlers in ./ipc, background logic in ./services.
const { app, BrowserWindow } = require('electron');
const { createMainWindow } = require('./windows/main-window.cjs');
const { registerAll } = require('./ipc/index.cjs');
const examClock = require('./services/exam-clock.cjs');

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

  app.whenReady().then(() => {
    registerAll();
    createMainWindow();

    // macOS: re-create the window when the dock icon is clicked and none are open
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });
  });

  // An exam app should fully quit when its window closes (also on macOS)
  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => examClock.stop());
}
