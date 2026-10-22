// Saves proctoring snapshots (camera / screen) to disk.
const { app } = require('electron');
const fs = require('fs');
const path = require('path');

let customFolder = null; // folder picked by the student, overrides the default

function setCustomFolder(folder) {
  customFolder = folder;
}

function getFolder(kind) {
  const base = customFolder || path.join(app.getPath('userData'), 'snapshots');
  return path.join(base, kind);
}

// kind: 'camera' | 'screen'; data: ArrayBuffer/Uint8Array of a JPEG
async function save(kind, data) {
  const dir = getFolder(kind);
  await fs.promises.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${Date.now()}.jpg`);
  await fs.promises.writeFile(filePath, Buffer.from(data));
  return filePath;
}

module.exports = { save, setCustomFolder, getFolder };
