'use strict'

const groqAdapter   = require('./groq.cjs')
const openaiAdapter = require('./openai.cjs')

/** Map of provider id → adapter { chat(messages, model), models[] } */
const registry = {
  groq:   groqAdapter,
  openai: openaiAdapter,
}

/**
 * Get the adapter for a given provider.
 * @param {string} provider
 * @returns {{ chat: Function, models: Array }}
 */
function getAdapter(provider) {
  const adapter = registry[provider]
  if (!adapter) throw new Error(`Unknown LLM provider: "${provider}"`)
  return adapter
}

/**
 * Returns all providers and their available models for the UI selector.
 * @returns {Array<{ provider: string, label: string, models: Array }>}
 */
function getAllProviders() {
  return [
    { provider: 'groq',   label: 'Groq',   models: groqAdapter.models   },
    { provider: 'openai', label: 'OpenAI', models: openaiAdapter.models  },
  ]
}

module.exports = { getAdapter, getAllProviders }
