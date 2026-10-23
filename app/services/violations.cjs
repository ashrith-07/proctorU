// Detects proctoring violations while an exam session is active and reports them:
//   window-blur       the exam window lost focus (alt-tab, clicked another app)
//   fullscreen-exit   the student left full screen (we also put them back)
//   multiple-displays a second monitor is connected
//   system-suspend    the computer went to sleep
// Violations are saved by the backend, shown as a native notification, and pushed to the page.
const { Notification, screen, powerMonitor } = require('electron');
const { sendToRenderer, getMainWindow } = require('../windows/main-window.cjs');
const backend = require('./backend.cjs');
const { EXAM_CONFIG } = require('../../backend/server.cjs');

const MESSAGES = {
  'window-blur': 'You left the exam window.',
  'fullscreen-exit': 'You left full screen.',
  'multiple-displays': 'More than one display is connected.',
  'system-suspend': 'The computer went to sleep.',
  'copy-paste': 'Copy / paste is not allowed.',
  'devtools-shortcut': 'Developer tools are not allowed.',
  'camera-lost': 'The camera was disconnected.',
};

const DEDUPE_MS = 2000; // the same violation within this window is counted once

let sessionId = null;
let count = 0;
const lastSeen = new Map();

const isActive = () => sessionId !== null;

function begin(id) {
  sessionId = id;
  count = 0;
  lastSeen.clear();
  // The student may have left full screen between the setup screen and the login screen
  const win = getMainWindow();
  if (win && !win.isFullScreen()) win.setFullScreen(true);
  if (screen.getAllDisplays().length > 1) report('multiple-displays', 'Detected at exam start');
}

function end() {
  sessionId = null;
}

async function persist(type, detail) {
  try {
    const res = await fetch(`${backend.getApiBase()}/exam/violation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, type, detail }),
    });
    return res.ok;
  } catch {
    return false; // the local counter below still enforces the limit
  }
}

function notify(type, count) {
  if (!Notification.isSupported()) return;
  new Notification({
    title: `Exam violation ${count}/${EXAM_CONFIG.maxViolations}`,
    body: MESSAGES[type],
  }).show();
}

function report(type, detail = '') {
  if (!isActive()) return;
  const now = Date.now();
  if (now - (lastSeen.get(type) ?? 0) < DEDUPE_MS) return;
  lastSeen.set(type, now);

  count += 1;
  persist(type, detail);
  notify(type, count);
  sendToRenderer('violation', {
    type,
    message: MESSAGES[type],
    count,
    max: EXAM_CONFIG.maxViolations,
  });
}

// Listeners tied to the exam window (call once per window)
function watchWindow(win) {
  win.on('blur', () => report('window-blur'));
  win.on('leave-full-screen', () => {
    if (!isActive()) return;
    report('fullscreen-exit');
    // Put the student back into full screen
    setTimeout(() => {
      const current = getMainWindow();
      if (isActive() && current && !current.isFullScreen()) current.setFullScreen(true);
    }, 600);
  });
}

// Listeners for system-wide events (call once at startup)
function init() {
  screen.on('display-added', () => report('multiple-displays', 'A display was connected'));
  powerMonitor.on('suspend', () => report('system-suspend'));
}

module.exports = { begin, end, report, watchWindow, init, isActive };
