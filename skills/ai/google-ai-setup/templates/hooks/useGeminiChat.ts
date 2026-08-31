// Gemini 채팅/스트리밍 훅
// 텍스트 생성, 채팅 히스토리 관리, 실시간 스트리밍 지원

import { useState, useCallback, useRef } from 'react'
import {
  streamGenerateContent,
  type GeminiContent,
  type GeminiStreamChunk,
} from '../lib/services/geminiService'
import { CHAT_HISTORY_LIMIT, GEMINI_TEXT_CONFIG } from '../lib/constants/gemini'
import { devLog } from '../lib/utils/logger'

// ─────────────────────────────────────
// TODO: 프로젝트에 맞게 시스템 프롬프트 커스터마이징
// ─────────────────────────────────────
const DEFAULT_SYSTEM_PROMPT = `당신은 유능한 AI 어시스턴트입니다.
사용자의 질문에 친절하고 정확하게 답변하세요.
답변은 한국어로 작성하세요.`

const DEFAULT_INITIAL_RESPONSE = '안녕하세요! 무엇을 도와드릴까요?'

// ─────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export interface UseChatOptions {
  /** 시스템 프롬프트 (기본값: DEFAULT_SYSTEM_PROMPT) */
  systemPrompt?: string
  /** AI의 초기 응답 메시지 */
  initialResponse?: string
  /** Google Search Grounding 활성화 */
  useGoogleSearch?: boolean
  /** 각 청크 수신 시 콜백 */
  onChunk?: (chunk: GeminiStreamChunk) => void
}

export interface UseChatReturn {
  /** 채팅 히스토리 */
  messages: ChatMessage[]
  /** 로딩 상태 */
  isLoading: boolean
  /** 에러 메시지 */
  error: string | null
  /** 메시지 전송 */
  sendMessage: (userMessage: string, apiKey: string) => Promise<void>
  /** 히스토리 초기화 */
  clearHistory: () => void
  /** 스트리밍 중 부분 응답 */
  streamingText: string
}

// ─────────────────────────────────────
// 훅 구현
// ─────────────────────────────────────

/**
 * Gemini 채팅 훅
 *
 * 사용 예시:
 * ```tsx
 * const { messages, isLoading, sendMessage, streamingText } = useGeminiChat({
 *   systemPrompt: '당신은 게임 기획 전문가입니다.',
 * })
 *
 * const handleSend = async () => {
 *   await sendMessage(inputText, apiKey)
 * }
 * ```
 */
export function useGeminiChat(options?: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamingText, setStreamingText] = useState('')

  // 스트리밍 중 중단 방지용 ref
  const abortRef = useRef(false)

  const systemPrompt = options?.systemPrompt || DEFAULT_SYSTEM_PROMPT
  const initialResponse = options?.initialResponse || DEFAULT_INITIAL_RESPONSE

  /**
   * GeminiContent 배열 구성
   * - 시스템 프롬프트 (user 메시지)
   * - AI 초기 동의 응답 (model 메시지)
   * - 이전 히스토리 (최근 N개)
   * - 현재 사용자 메시지
   */
  const buildContents = useCallback(
    (userMessage: string): GeminiContent[] => {
      const contents: GeminiContent[] = []

      // 시스템 프롬프트
      contents.push({
        role: 'user',
        parts: [{ text: systemPrompt }],
      })

      // AI 초기 응답
      contents.push({
        role: 'model',
        parts: [{ text: initialResponse }],
      })

      // 이전 채팅 히스토리 (최근 N개만)
      const recentMessages = messages.slice(-CHAT_HISTORY_LIMIT)
      for (const msg of recentMessages) {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }],
        })
      }

      // 현재 사용자 메시지
      contents.push({
        role: 'user',
        parts: [{ text: userMessage }],
      })

      return contents
    },
    [messages, systemPrompt, initialResponse]
  )

  const sendMessage = useCallback(
    async (userMessage: string, apiKey: string) => {
      if (!userMessage.trim()) return
      if (!apiKey.trim()) {
        setError('API 키를 입력해주세요.')
        return
      }

      setIsLoading(true)
      setError(null)
      setStreamingText('')
      abortRef.current = false

      // 사용자 메시지 추가
      const userMsg: ChatMessage = {
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMsg])

      let fullResponse = ''

      try {
        const contents = buildContents(userMessage)

        await streamGenerateContent(apiKey, contents, {
          useGoogleSearch: options?.useGoogleSearch,
          generationConfig: GEMINI_TEXT_CONFIG,
          onChunk: (chunk) => {
            if (abortRef.current) return

            const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text
            if (text) {
              fullResponse += text
              setStreamingText(fullResponse)

              // 외부 청크 콜백 실행
              options?.onChunk?.(chunk)
            }
          },
        })

        // 스트리밍 완료 후 메시지 추가
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: fullResponse,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMsg])
        setStreamingText('')

        devLog.log('채팅 완료:', fullResponse.length, '자')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다'
        setError(errorMessage)
        devLog.error('채팅 오류:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [buildContents, options]
  )

  const clearHistory = useCallback(() => {
    setMessages([])
    setStreamingText('')
    setError(null)
  }, [])

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearHistory,
    streamingText,
  }
}
