// Preload: the only bridge between the web page (renderer) and Electron.
// Exposes a small, explicit API as `window.athena` – the page never gets ipcRenderer itself.
const { contextBridge, ipcRenderer } = require('electron');

// Subscribe to a main -> renderer event; returns an "unsubscribe" function
function listen(channel, callback) {
  const handler = (_event, ...args) => callback(...args);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld('athena', {
  // ── Exam clock (driven by the main process)
  startTimerOnMain: () => ipcRenderer.invoke('start-timer'),
  stopTimerOnMain: () => ipcRenderer.invoke('stop-timer'),
  registerListenerForTimerTickFromMain: (cb) => listen('timer', cb),
  registerListenerForCameraSnapFromMain: (cb) => listen('camera-shot', cb),
  registerListenerForScreenShotFromMain: (cb) => listen('screen-shot', cb),

  // ── Snapshots saved to disk by main
  storeCameraSnapImageOnDisk: (data) => ipcRenderer.invoke('store-camera-snap-image-on-disk', data),
  storeScreenSnapImageOnDisk: (data) => ipcRenderer.invoke('store-screen-snap-image-on-disk', data),
  getScreenSource: () => ipcRenderer.invoke('get-screen-source'),

  // ── Native dialogs
  showRules: () => ipcRenderer.send('show-rules'),
  showCheckboxDialog: () => ipcRenderer.invoke('show-checkbox-dialog'),
  selectCameraSaveFolder: () => ipcRenderer.invoke('select-camera-save-folder'),
  selectFile: () => ipcRenderer.invoke('select-file'),

  // ── OS theme ('dark' | 'light')
  getTheme: () => ipcRenderer.invoke('get-theme'),
  onThemeChange: (cb) => listen('theme-changed', cb),
});
