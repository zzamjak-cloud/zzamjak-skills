import { useEffect, useState } from 'react'
import { Store } from '@tauri-apps/plugin-store'
import { validateOpenAIApiKey } from '../lib/openaiErrorHandler'

const STORE_FILE = 'settings.json'
const API_KEY_STORE_KEY = 'openai_api_key'

export interface OpenAIApiKeyInputProps {
  onApiKeyChange?: (apiKey: string) => void
  title?: string
}

export async function loadOpenAIApiKey(): Promise<string> {
  const store = await Store.load(STORE_FILE)
  return (await store.get<string>(API_KEY_STORE_KEY)) || ''
}

export async function saveOpenAIApiKey(apiKey: string): Promise<void> {
  const store = await Store.load(STORE_FILE)
  await store.set(API_KEY_STORE_KEY, apiKey.trim())
  await store.save()
}

export async function clearOpenAIApiKey(): Promise<void> {
  const store = await Store.load(STORE_FILE)
  await store.delete(API_KEY_STORE_KEY)
  await store.save()
}

export function OpenAIApiKeyInput({
  onApiKeyChange,
  title = 'OpenAI API 키',
}: OpenAIApiKeyInputProps) {
  const [apiKey, setApiKey] = useState('')
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    loadOpenAIApiKey().then((savedKey) => {
      setApiKey(savedKey)
      onApiKeyChange?.(savedKey)
    })
  }, [onApiKeyChange])

  const handleSave = async () => {
    const validation = validateOpenAIApiKey(apiKey)
    if (!validation.valid) {
      setMessage(validation.message || 'API 키를 확인하세요.')
      return
    }

    await saveOpenAIApiKey(apiKey)
    onApiKeyChange?.(apiKey.trim())
    setMessage('저장되었습니다.')
  }

  const handleClear = async () => {
    await clearOpenAIApiKey()
    setApiKey('')
    onApiKeyChange?.('')
    setMessage('삭제되었습니다.')
  }

  return (
    <section>
      <label>
        <span>{title}</span>
        <input
          type={visible ? 'text' : 'password'}
          value={apiKey}
          placeholder="sk-..."
          onChange={(event) => setApiKey(event.target.value)}
        />
      </label>
      <button type="button" onClick={() => setVisible((current) => !current)}>
        {visible ? '숨기기' : '보기'}
      </button>
      <button type="button" onClick={handleSave}>
        저장
      </button>
      <button type="button" onClick={handleClear}>
        삭제
      </button>
      {message ? <p>{message}</p> : null}
    </section>
  )
}
