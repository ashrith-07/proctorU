// Preload: the only bridge between the web page (renderer) and Electron.
// Exposes a small, explicit API as `window.athena` – the page never gets ipcRenderer itself.
const { contextBridge, ipcRenderer } = require('electron');

// Subscribe to a main -> renderer event; returns an "unsubscribe" function
function listen(channel, callback) {
  const handler = (_event, ...args) => callback(...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

const invoke = (channel) => (...args) => ipcRenderer.invoke(channel, ...args);

contextBridge.exposeInMainWorld('athena', {
  // Local exam server URL (port is picked at runtime)
  getApiBase: invoke('get-api-base'),

  // OS theme ('dark' | 'light')
  getTheme: invoke('get-theme'),
  onThemeChange: (cb) => listen('theme-changed', cb),

  // Proctoring (camera frames from the page, screenshots from main)
  startProctoring: invoke('proctor:start'),
  stopProctoring: invoke('proctor:stop'),
  saveCameraSnap: invoke('proctor:save-camera-snap'),
  onTimerTick: (cb) => listen('timer', cb),
  onCameraShotRequest: (cb) => listen('camera-shot', cb),
  onSnapshotSaved: (cb) => listen('snapshot-saved', cb),
  reportViolation: (type) => ipcRenderer.send('violation:report', type),
  onViolation: (cb) => listen('violation', cb),
  onProctorError: (cb) => listen('proctor-error', cb),

  // OS permissions (macOS camera / screen recording)
  getPermissionStatus: invoke('permissions:status'),
  requestCameraAccess: invoke('permissions:request-camera'),
  requestScreenAccess: invoke('permissions:request-screen'),
  openPrivacySettings: invoke('permissions:open-settings'),

  // Window
  setFullScreen: invoke('window:set-fullscreen'),
  isFullScreen: invoke('window:is-fullscreen'),
  onFullScreenChange: (cb) => listen('fullscreen-changed', cb),

  // Snapshot folder
  getSnapshotFolder: invoke('snapshots:get-folder'),
  selectSnapshotFolder: invoke('snapshots:select-folder'),
  openSnapshotFolder: invoke('snapshots:open-folder'),

  // Native dialogs
  showRules: () => ipcRenderer.send('show-rules'),
  showCheckboxDialog: invoke('show-checkbox-dialog'),
});
