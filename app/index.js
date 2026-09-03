import { app, BrowserWindow } from "electron";

function createWindow() {
    const window = new BrowserWindow({
        height: 720,
        width: 1100,
        minWidth: 600,
        minHeight: 500,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#0d0e11',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
        }
    })

    window.loadURL('http://localhost:5173/')
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
})