const { BrowserWindow, session, shell } = require('electron');
const path = require('path');
const { isDev, DEV_URL } = require('../config.cjs');

let mainWindow = null;

// Only the camera (getUserMedia) and fullscreen are needed by the exam page.
// Everything else (notifications, geolocation, ...) is denied.
const ALLOWED_PERMISSIONS = new Set(['media', 'fullscreen']);

function lockDownSession() {
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission));
  });
  ses.setPermissionCheckHandler((_wc, permission) => ALLOWED_PERMISSIONS.has(permission));
}

function createMainWindow() {
  lockDownSession();

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    minWidth: 900,
    minHeight: 650,
    title: 'Athena Exam',
    backgroundColor: '#16171d',
    show: false, // shown on 'ready-to-show' to avoid a white flash
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.cjs'),
      contextIsolation: true, // renderer cannot touch the preload's Electron objects
      nodeIntegration: false, // renderer has no `require`
      sandbox: true,
      devTools: isDev, // no DevTools in the shipped app (students could tamper)
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  // The exam page must never navigate away or open new windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev ? url.startsWith(DEV_URL) : url.startsWith('file://');
    if (!allowed) event.preventDefault();
  });

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', '..', 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

// Safe accessor: returns null when the window is closed/destroyed
function getMainWindow() {
  return mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
}

// Send an event to the renderer only if the window still exists
function sendToRenderer(channel, ...args) {
  const win = getMainWindow();
  if (win) win.webContents.send(channel, ...args);
}

module.exports = { createMainWindow, getMainWindow, sendToRenderer };
