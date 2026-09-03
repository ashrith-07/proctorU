import { useState, useRef, useEffect } from 'react'
import './App.css'

// ─── Provider / model catalog ────────────────────────────────────────────────
// Mirrored here as a fallback when running outside Electron (plain browser dev)
const FALLBACK_PROVIDERS = [
  {
    provider: 'groq',
    label:    'Groq',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B'  },
      { id: 'llama-3.1-8b-instant',    label: 'Llama 3.1 8B'   },
      { id: 'mixtral-8x7b-32768',      label: 'Mixtral 8x7B'   },
      { id: 'gemma2-9b-it',            label: 'Gemma 2 9B'      },
    ],
  },
  {
    provider: 'openai',
    label:    'OpenAI',
    models: [
      { id: 'gpt-4o',      label: 'GPT-4o'      },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ],
  },
]

// ─── IPC bridge (safe even in plain browser) ─────────────────────────────────
const api = window.electronAPI ?? null

export default function App() {
  const [providers, setProviders] = useState(FALLBACK_PROVIDERS)
  const [provider,  setProvider]  = useState(FALLBACK_PROVIDERS[0].provider)
  const [model,     setModel]     = useState(FALLBACK_PROVIDERS[0].models[0].id)

  const [messages, setMessages] = useState([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  const bottomRef = useRef(null)

  // Load provider/model catalog from main process on mount
  useEffect(() => {
    if (!api) return
    api.getProviders().then(list => {
      setProviders(list)
      setProvider(list[0].provider)
      setModel(list[0].models[0].id)
    })
  }, [])

  // Auto-scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // When provider changes, reset model to first of new provider
  const handleProviderChange = (e) => {
    const newProvider = e.target.value
    setProvider(newProvider)
    const found = providers.find(p => p.provider === newProvider)
    setModel(found?.models[0]?.id ?? '')
    setMessages([])
    setError(null)
  }

  const currentModels = providers.find(p => p.provider === provider)?.models ?? []

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || loading) return

    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError(null)

    try {
      let reply

      if (api) {
        // ── Electron path: call via IPC (key stays in main process) ──
        reply = await api.chat({ provider, model, messages: newMessages })
      } else {
        // ── Browser fallback: direct fetch (dev only) ──
        const endpoints = {
          groq:   'https://api.groq.com/openai/v1/chat/completions',
          openai: 'https://api.openai.com/v1/chat/completions',
        }
        const res = await fetch(endpoints[provider], {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ model, messages: newMessages }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error?.message ?? `HTTP ${res.status}`)
        reply = data.choices[0].message.content
      }

      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const currentProviderLabel = providers.find(p => p.provider === provider)?.label ?? provider

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar-title">LLM Chat</span>

        <div className="model-selector">
          {/* Provider picker */}
          <select
            id="provider-select"
            className="selector-dropdown"
            value={provider}
            onChange={handleProviderChange}
            disabled={loading}
            title="Select provider"
          >
            {providers.map(p => (
              <option key={p.provider} value={p.provider}>{p.label}</option>
            ))}
          </select>

          <span className="selector-divider" aria-hidden="true" />

          {/* Model picker */}
          <select
            id="model-select"
            className="selector-dropdown"
            value={model}
            onChange={e => setModel(e.target.value)}
            disabled={loading}
            title="Select model"
          >
            {currentModels.map(m => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>
        </div>
      </header>

      <div className="chat-area">
        {messages.length === 0 && !loading && (
          <div className="empty">
            <p className="empty-title">What can I help you with?</p>
            <p className="empty-sub">{currentProviderLabel} · {currentModels.find(m => m.id === model)?.label}</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message-row ${msg.role}`}>
            <div className="bubble">{msg.content}</div>
          </div>
        ))}

        {loading && (
          <div className="message-row assistant">
            <div className="bubble">
              <span className="typing-dots">
                <span /><span /><span />
              </span>
            </div>
          </div>
        )}

        {error && <p className="error">⚠️ {error}</p>}

        <div ref={bottomRef} />
      </div>

      <div className="input-bar">
        <textarea
          id="chat-input"
          className="chat-input"
          rows={1}
          placeholder={`Message ${currentProviderLabel}…`}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
        />
        <button
          id="send-btn"
          className="send-btn"
          onClick={sendMessage}
          disabled={!input.trim() || loading}
        >
          Send
        </button>
      </div>
    </div>
  )
}
