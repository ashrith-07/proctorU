const { ipcMain, dialog } = require('electron');
const { getMainWindow } = require('../windows/main-window.cjs');

const RULES =
  '1. Stay on the exam screen.\n' +
  '2. Camera must remain enabled.\n' +
  '3. Do not leave the exam.\n' +
  '4. Do not use external assistance.\n' +
  '5. Click Submit Exam when finished.\n' +
  '6. Five violations submit your exam automatically.';

function register() {
  ipcMain.on('show-rules', () => {
    dialog.showMessageBox(getMainWindow(), {
      type: 'info',
      title: 'Athena Exam Rules',
      message: 'Exam Rules',
      detail: RULES,
    });
  });

  // Checkbox dialog: returns which button was pressed and the checkbox state
  ipcMain.handle('show-checkbox-dialog', async () => {
    const result = await dialog.showMessageBox(getMainWindow(), {
      type: 'question',
      title: 'Exam Preferences',
      message: 'Select your preferences before starting:',
      detail: RULES,
      checkboxLabel: 'I agree to the exam rules and conditions',
      checkboxChecked: false,
      buttons: ['Start Exam', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
    });
    return { buttonIndex: result.response, checkboxChecked: result.checkboxChecked };
  });
}

module.exports = { register, RULES };
