// Main-process proctoring loop for one exam session:
//  - 'timer'        elapsed-seconds tick for the UI
//  - 'camera-shot'  asks the renderer for a webcam frame (only the page can open the camera)
//  - screen shots   taken right here with desktopCapturer
const { sendToRenderer } = require('../windows/main-window.cjs');
const { TIMER_TICK_MS, CAMERA_SNAP_MS, SCREEN_SNAP_MS } = require('../config.cjs');
const snapshots = require('./snapshots.cjs');
const { captureJpeg } = require('./screen-capture.cjs');

let handles = [];
let startedAt = null;
let screenBusy = false;

async function takeScreenSnapshot() {
  if (screenBusy) return; // never overlap two captures
  screenBusy = true;
  try {
    await snapshots.save('screen', await captureJpeg());
    notifySaved('screen');
  } catch (error) {
    sendToRenderer('proctor-error', { kind: 'screen', message: error.message });
  } finally {
    screenBusy = false;
  }
}

function notifySaved(kind) {
  sendToRenderer('snapshot-saved', { kind, counts: snapshots.getCounts() });
}

function start(sessionId) {
  stop(); // calling start twice must never create duplicate intervals
  snapshots.beginSession(sessionId);
  startedAt = Date.now();
  handles = [
    setInterval(() => sendToRenderer('timer', (Date.now() - startedAt) / 1000), TIMER_TICK_MS),
    setInterval(() => sendToRenderer('camera-shot'), CAMERA_SNAP_MS),
    setInterval(takeScreenSnapshot, SCREEN_SNAP_MS),
  ];
  takeScreenSnapshot(); // first screenshot right away
}

function stop() {
  handles.forEach(clearInterval);
  handles = [];
  startedAt = null;
  snapshots.endSession();
}

async function saveCameraSnapshot(data) {
  const filePath = await snapshots.save('camera', data);
  notifySaved('camera');
  return filePath;
}

module.exports = { start, stop, saveCameraSnapshot };
