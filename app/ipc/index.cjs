// Registers every ipcMain handler once at startup.
const modules = ['backend', 'proctor', 'system', 'theme', 'dialogs', 'exam'];

function registerAll() {
  modules.forEach((name) => require(`./${name}.cjs`).register());
}

module.exports = { registerAll };
