'use strict'

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

const models = [
  { id: 'gpt-4o',       label: 'GPT-4o'       },
  { id: 'gpt-4o-mini',  label: 'GPT-4o Mini'  },
  { id: 'gpt-4-turbo',  label: 'GPT-4 Turbo'  },
]

async function chat(messages, model) {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is not set in .env')

  const res = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? `OpenAI HTTP ${res.status}`)
  return data.choices[0].message.content
}

module.exports = { chat, models }
