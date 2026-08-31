import { useCallback, useState } from 'react'
import { CHAT_HISTORY_LIMIT, OPENAI_TEXT_CONFIG } from '../lib/constants/openai'
import { OpenAIMessage, streamResponse } from '../lib/services/openaiService'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface UseOpenAIChatOptions {
  instructions?: string
  model?: string
}

export function useOpenAIChat(options?: UseOpenAIChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [streamingText, setStreamingText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(
    async (userMessage: string, apiKey: string) => {
      if (!userMessage.trim()) return

      setIsLoading(true)
      setError(null)
      setStreamingText('')

      try {
        const input: OpenAIMessage[] = [
          ...messages.slice(-CHAT_HISTORY_LIMIT).map((message) => ({
            role: message.role,
            content: message.content,
          })),
          { role: 'user', content: userMessage },
        ]

        setMessages((current) => [...current, { role: 'user', content: userMessage }])

        const text = await streamResponse(apiKey, {
          input,
          model: options?.model || OPENAI_TEXT_CONFIG.model,
          instructions: options?.instructions,
          reasoning: OPENAI_TEXT_CONFIG.reasoning,
          maxOutputTokens: OPENAI_TEXT_CONFIG.max_output_tokens,
          onDelta: (delta) => setStreamingText((current) => current + delta),
        })

        setMessages((current) => [...current, { role: 'assistant', content: text }])
        setStreamingText('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'OpenAI 응답 생성 중 오류가 발생했습니다.')
      } finally {
        setIsLoading(false)
      }
    },
    [messages, options?.instructions, options?.model]
  )

  const clearHistory = useCallback(() => {
    setMessages([])
    setStreamingText('')
    setError(null)
  }, [])

  return { messages, streamingText, isLoading, error, sendMessage, clearHistory }
}
