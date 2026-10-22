// Saves proctoring snapshots to disk:  <base>/<sessionId>/<camera|screen>/<timestamp>.jpg
const { app } = require('electron');
const fs = require('fs');
const path = require('path');
const settings = require('./settings.cjs');

const KINDS = ['camera', 'screen'];
const MAX_BYTES = 10 * 1024 * 1024; // refuse absurdly large payloads from the renderer

let sessionId = null;
const counts = { camera: 0, screen: 0 };

// Base folder: the one the student picked (persisted), else <userData>/snapshots
function getBaseFolder() {
  const custom = settings.get('snapshotFolder');
  if (custom && fs.existsSync(custom)) return custom;
  return path.join(app.getPath('userData'), 'snapshots');
}

function setBaseFolder(folder) {
  settings.set('snapshotFolder', folder);
}

function beginSession(id) {
  sessionId = id;
  counts.camera = 0;
  counts.screen = 0;
}

function endSession() {
  sessionId = null;
}

const getCounts = () => ({ ...counts });

// kind: 'camera' | 'screen'; data: ArrayBuffer / Uint8Array holding a JPEG
async function save(kind, data) {
  if (!KINDS.includes(kind)) throw new Error(`Unknown snapshot kind: ${kind}`);
  if (!sessionId) throw new Error('No exam session is being proctored');
  const buffer = Buffer.from(data);
  if (buffer.length === 0 || buffer.length > MAX_BYTES) throw new Error('Invalid snapshot size');

  const dir = path.join(getBaseFolder(), sessionId, kind);
  await fs.promises.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${Date.now()}.jpg`);
  await fs.promises.writeFile(filePath, buffer);
  counts[kind] += 1;
  return filePath;
}

module.exports = { save, getBaseFolder, setBaseFolder, beginSession, endSession, getCounts };
