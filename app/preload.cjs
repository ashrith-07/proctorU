'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  /** Send a chat request to the main process
   * @param {{ provider: string, model: string, messages: Array }} payload
   * @returns {Promise<string>} assistant reply
   */
  chat: (payload) => ipcRenderer.invoke('chat', payload),

  /** Fetch all available providers and their models
   * @returns {Promise<Array<{ provider: string, label: string, models: Array }>>}
   */
  getProviders: () => ipcRenderer.invoke('get-providers'),
})
