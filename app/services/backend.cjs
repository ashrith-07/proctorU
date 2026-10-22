// Runs the Express exam backend inside the Electron main process.
// Data (sessions.json) lives in the OS per-user app-data folder, which is writable
// even when the app is installed from a read-only .dmg.
const { app } = require('electron');
const { startServer } = require('../../backend/server.cjs');

let server = null;

async function start() {
  if (server) return server;
  server = await startServer({ dataDir: app.getPath('userData') }); // random free port
  return server;
}

function getApiBase() {
  return server ? `http://127.0.0.1:${server.port}` : null;
}

function stop() {
  if (server) server.close();
  server = null;
}

module.exports = { start, stop, getApiBase };
