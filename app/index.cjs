'use strict'

// Load .env before anything else so process.env has all keys
require('dotenv').config()

const { app, BrowserWindow } = require('electron')
const path                   = require('path')
const { registerChatHandler } = require('./ipc/chat.cjs')

// Register all IPC handlers before any window opens
registerChatHandler()

function createWindow() {
  const win = new BrowserWindow({
    height:         720,
    width:          1100,
    minWidth:       600,
    minHeight:      500,
    titleBarStyle:  'hiddenInset',
    backgroundColor: '#0d0e11',
    webPreferences: {
      nodeIntegration:  false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  })

  win.loadURL('http://localhost:5173/')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
