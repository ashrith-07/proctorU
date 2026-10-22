// Main-process clock that drives the exam: elapsed-time ticks plus
// periodic "take a camera / screen snapshot" requests for the renderer.
const { sendToRenderer } = require('../windows/main-window.cjs');
const { TIMER_TICK_MS, CAMERA_SNAP_MS, SCREEN_SNAP_MS } = require('../config.cjs');

let handles = [];
let startedAt = null;

function start() {
  stop(); // calling start twice must never create duplicate intervals
  startedAt = Date.now();
  handles = [
    setInterval(() => sendToRenderer('timer', (Date.now() - startedAt) / 1000), TIMER_TICK_MS),
    setInterval(() => sendToRenderer('camera-shot'), CAMERA_SNAP_MS),
    setInterval(() => sendToRenderer('screen-shot'), SCREEN_SNAP_MS),
  ];
}

function stop() {
  handles.forEach(clearInterval);
  handles = [];
  startedAt = null;
}

module.exports = { start, stop };
