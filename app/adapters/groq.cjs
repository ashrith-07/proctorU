'use strict'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'

const models = [
  { id: 'openai/gpt-oss-20b',       label: 'GPT OSS 20B'     },
  { id: 'llama-3.3-70b-versatile',  label: 'Llama 3.3 70B'   },
  { id: 'llama-3.1-8b-instant',     label: 'Llama 3.1 8B'    },
  { id: 'mixtral-8x7b-32768',       label: 'Mixtral 8x7B'    },
  { id: 'gemma2-9b-it',             label: 'Gemma 2 9B'      },
]

async function chat(messages, model) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY is not set in .env')

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? `Groq HTTP ${res.status}`)
  return data.choices[0].message.content
}

module.exports = { chat, models }
