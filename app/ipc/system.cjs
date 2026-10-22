// OS-level helpers: permissions, fullscreen, snapshot folder.
const { ipcMain, dialog, shell } = require('electron');
const { getMainWindow, sendToRenderer } = require('../windows/main-window.cjs');
const permissions = require('../services/permissions.cjs');
const snapshots = require('../services/snapshots.cjs');

function register() {
  // ── Permissions
  ipcMain.handle('permissions:status', () => permissions.getStatus());
  ipcMain.handle('permissions:request-camera', () => permissions.requestCamera());
  ipcMain.handle('permissions:request-screen', () => permissions.requestScreen());
  ipcMain.handle('permissions:open-settings', (_event, kind) => permissions.openPrivacySettings(kind));

  // ── Native fullscreen (more reliable than the DOM Fullscreen API, and observable from main)
  ipcMain.handle('window:set-fullscreen', (_event, value) => {
    const win = getMainWindow();
    if (!win) return false;
    win.setFullScreen(Boolean(value));
    return win.isFullScreen();
  });
  ipcMain.handle('window:is-fullscreen', () => getMainWindow()?.isFullScreen() ?? false);

  // ── Snapshot folder (persisted in settings.json)
  ipcMain.handle('snapshots:get-folder', () => snapshots.getBaseFolder());
  ipcMain.handle('snapshots:select-folder', async () => {
    const result = await dialog.showOpenDialog(getMainWindow(), {
      title: 'Select Folder to Save Snapshots',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return snapshots.getBaseFolder();
    snapshots.setBaseFolder(result.filePaths[0]);
    return result.filePaths[0];
  });
  ipcMain.handle('snapshots:open-folder', async () => {
    const error = await shell.openPath(snapshots.getBaseFolder()); // '' on success
    return error === '';
  });
}

// Called once the window exists so fullscreen changes reach the page
function watchFullScreen(win) {
  win.on('enter-full-screen', () => sendToRenderer('fullscreen-changed', true));
  win.on('leave-full-screen', () => sendToRenderer('fullscreen-changed', false));
}

module.exports = { register, watchFullScreen };
