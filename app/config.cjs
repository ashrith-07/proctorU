// Shared constants for the Electron main process
const { app } = require('electron');

// Dev mode = running `electron .` from source (not from a packaged .dmg/.app)
const isDev = !app.isPackaged && !process.env.ATHENA_PROD; // ATHENA_PROD=1 lets you test the built dist/ locally

module.exports = {
  isDev,
  // Vite dev server (see vite.config.js)
  DEV_URL: process.env.ELECTRON_DEV_URL || 'http://localhost:5174',
  // How often the main process pushes events to the renderer
  TIMER_TICK_MS: 1000,
  CAMERA_SNAP_MS: 5000,
  SCREEN_SNAP_MS: 10000,
};
