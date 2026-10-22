// Native application menu (macOS menu bar / Windows & Linux window menu).
// There is deliberately no Edit menu: Copy / Paste are not allowed during the exam.
const { app, Menu, dialog, shell } = require('electron');
const { isDev } = require('./config.cjs');
const { getMainWindow } = require('./windows/main-window.cjs');
const snapshots = require('./services/snapshots.cjs');
const { RULES } = require('./ipc/dialogs.cjs');

function build() {
  const template = [
    {
      label: app.name,
      submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }],
    },
    {
      label: 'Exam',
      submenu: [
        {
          label: 'Exam Rules',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => dialog.showMessageBox(getMainWindow(), { type: 'info', title: 'Athena Exam Rules', message: 'Exam Rules', detail: RULES }),
        },
        { label: 'Open Snapshots Folder', click: () => shell.openPath(snapshots.getBaseFolder()) },
        { label: 'Open Data Folder', click: () => shell.openPath(app.getPath('userData')) },
      ],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'togglefullscreen' }],
    },
  ];

  // Reload / DevTools only when running from source
  if (isDev) {
    template.push({ label: 'Dev', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }] });
  }

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

module.exports = { build };
