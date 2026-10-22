const { ipcMain, desktopCapturer } = require('electron');
const snapshots = require('../services/snapshots.cjs');

function register() {
  ipcMain.handle('store-camera-snap-image-on-disk', (_event, data) => snapshots.save('camera', data));
  ipcMain.handle('store-screen-snap-image-on-disk', (_event, data) => snapshots.save('screen', data));

  // Return the first screen's source ID so the renderer can open a capture stream
  ipcMain.handle('get-screen-source', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 0, height: 0 },
    });
    return sources[0]?.id ?? null;
  });
}

module.exports = { register };
