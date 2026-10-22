// Electron main process entry point: app lifecycle only.
// Windows live in ./windows, IPC handlers in ./ipc, background logic in ./services.
const { app, BrowserWindow, dialog } = require('electron');
const { createMainWindow } = require('./windows/main-window.cjs');
const { registerAll } = require('./ipc/index.cjs');
const proctor = require('./services/proctor.cjs');
const { watchFullScreen } = require('./ipc/system.cjs');
const violations = require('./services/violations.cjs');
const menu = require('./menu.cjs');
const backend = require('./services/backend.cjs');

function openMainWindow() {
  const win = createMainWindow();
  watchFullScreen(win);
  violations.watchWindow(win);

  // Closing the window (red button / Cmd+Q) in the middle of an exam needs confirmation
  win.on('close', (event) => {
    if (!violations.isActive()) return;
    const choice = dialog.showMessageBoxSync(win, {
      type: 'warning',
      title: 'Leave exam?',
      message: 'Your exam is still in progress.',
      detail: 'If you quit now your exam will not be submitted.',
      buttons: ['Keep Working', 'Quit Exam'],
      defaultId: 0,
      cancelId: 0,
    });
    if (choice === 0) event.preventDefault();
  });
}

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
    menu.build();
    openMainWindow();
    violations.init();

    // macOS: re-create the window when the dock icon is clicked and none are open
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) openMainWindow();
    });
  });

  // An exam app should fully quit when its window closes (also on macOS)
  app.on('window-all-closed', () => app.quit());
  // will-quit runs after the windows have closed (so the close confirmation above still sees the exam)
  app.on('will-quit', () => {
    proctor.stop();
    backend.stop();
  });
}
