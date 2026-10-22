// Registers every ipcMain handler once at startup.
const modules = ['capture', 'timer', 'theme', 'dialogs'];

function registerAll() {
  modules.forEach((name) => require(`./${name}.cjs`).register());
}

module.exports = { registerAll };
