'use strict'

const { ipcMain }                    = require('electron')
const { getAdapter, getAllProviders } = require('../adapters/registry.cjs')

function registerChatHandler() {
  /** Main chat channel — renderer sends { provider, model, messages } */
  ipcMain.handle('chat', async (_event, { provider, model, messages }) => {
    const adapter = getAdapter(provider)
    // Returns the assistant reply string (throws on API error)
    return adapter.chat(messages, model)
  })

  /** Lets the renderer fetch the full provider/model list on startup */
  ipcMain.handle('get-providers', () => getAllProviders())
}

module.exports = { registerChatHandler }
