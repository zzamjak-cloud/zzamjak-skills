// Gemini REST API 핵심 서비스
// SDK 대신 직접 REST API를 사용하여 스트리밍 완전 제어 및 번들 크기 최소화

import {
  GEMINI_MODELS,
  GEMINI_TEXT_CONFIG,
  getGenerateContentUrl,
  getInteractionsUrl,
  getStreamContentUrl,
} from '../constants/gemini'
import { parseApiError, checkFinishReason } from '../apiErrorHandler'
import { devLog } from '../utils/logger'

// ─────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────

export interface GeminiPart {
  /** 텍스트 콘텐츠 */
  text?: string
  /** 인라인 이미지 데이터 (Base64) */
  inline_data?: {
    mime_type: string // 'image/png' | 'image/jpeg' | 'image/webp' 등
    data: string // Base64 인코딩 데이터 (data URL prefix 제외)
  }
}

export interface GeminiContent {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

/** 스트리밍 응답의 단일 청크 */
export interface GeminiStreamChunk {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>
    }
    finishReason?: string
  }>
}

/** 비스트리밍 응답 */
export interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
        inline_data?: { mime_type: string; data: string }
      }>
    }
    finishReason?: string
  }>
}

export interface GeminiInteractionImageInput {
  type: 'image'
  mime_type: string
  data: string
}

export interface GeminiInteractionTextInput {
  type: 'text'
  text: string
}

export type GeminiInteractionInput = GeminiInteractionImageInput | GeminiInteractionTextInput

export interface GeminiImageInteractionResponse {
  output_image?: {
    data?: string
    mime_type?: string
  }
  output?: Array<{
    type?: string
    text?: string
    data?: string
    mime_type?: string
    image?: {
      data?: string
      mime_type?: string
    }
  }>
  output_text?: string
}

/** 스트리밍 옵션 */
export interface StreamOptions {
  /** 청크 수신 콜백 */
  onChunk?: (chunk: GeminiStreamChunk) => void
  /** Google Search Grounding 활성화 */
  useGoogleSearch?: boolean
  /** 생성 설정 오버라이드 */
  generationConfig?: Record<string, unknown>
}

// ─────────────────────────────────────
// 이미지 유틸리티
// ─────────────────────────────────────

/**
 * Base64 이미지 문자열을 GeminiPart로 변환
 * data URL prefix(data:image/png;base64,) 자동 제거
 */
export function imageToGeminiPart(imageBase64: string, mimeType?: string): GeminiPart {
  // data URL prefix 제거
  const base64Data = imageBase64.includes(',')
    ? imageBase64.split(',')[1]
    : imageBase64

  // MIME 타입 추출 (없으면 기본값 사용)
  const detectedMime = imageBase64.match(/data:([^;]+);base64/)?.[1]
  const finalMime = mimeType || detectedMime || 'image/png'

  return {
    inline_data: {
      mime_type: finalMime,
      data: base64Data,
    },
  }
}

export function imageToInteractionInput(
  imageBase64: string,
  mimeType?: string
): GeminiInteractionImageInput {
  const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
  const detectedMime = imageBase64.match(/data:([^;]+);base64/)?.[1]

  return {
    type: 'image',
    mime_type: mimeType || detectedMime || 'image/png',
    data: base64Data,
  }
}

// ─────────────────────────────────────
// JSON 파싱 유틸리티 (이미지 분석 결과용)
// ─────────────────────────────────────

/**
 * Gemini 응답에서 JSON을 안전하게 파싱
 * 코드 블록, trailing commas 등 자동 처리
 */
export function parseJsonResponse<T>(text: string): T {
  let jsonText = text.trim()

  // Step 1: ```json ... ``` 또는 ``` ... ``` 코드 블록 제거
  const codeBlockMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    jsonText = codeBlockMatch[1].trim()
  }

  // Step 2: 첫 { 부터 마지막 } 까지 추출
  const jsonStart = jsonText.indexOf('{')
  const jsonEnd = jsonText.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd !== -1) {
    jsonText = jsonText.substring(jsonStart, jsonEnd + 1)
  }

  // Step 3: Trailing commas 제거 (,} 또는 ,])
  jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1')

  return JSON.parse(jsonText) as T
}

// ─────────────────────────────────────
// 핵심 서비스 함수
// ─────────────────────────────────────

/**
 * 비스트리밍 콘텐츠 생성 (이미지 분석, 번역에 사용)
 *
 * @param apiKey Google AI Studio API 키
 * @param contents 대화 내용 배열
 * @param options 선택 옵션
 * @returns 생성된 텍스트 또는 이미지 데이터
 */
export async function generateContent(
  apiKey: string,
  contents: GeminiContent[],
  options?: {
    model?: string
    generationConfig?: Record<string, unknown>
  }
): Promise<GeminiResponse> {
  const cleanApiKey = apiKey.trim()
  if (!cleanApiKey) throw new Error('API 키가 비어있습니다')

  const model = options?.model || GEMINI_MODELS.FLASH
  const url = getGenerateContentUrl(model, cleanApiKey)

  // 요청 본문 구성
  const requestBody: Record<string, unknown> = {
    contents,
    generationConfig: options?.generationConfig || GEMINI_TEXT_CONFIG,
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const error = await parseApiError(response)
    throw new Error(error.message)
  }

  return (await response.json()) as GeminiResponse
}

export async function generateImageInteraction(
  apiKey: string,
  input: GeminiInteractionInput[],
  options?: {
    model?: string
    aspectRatio?: string
    imageSize?: string
    generationConfig?: Record<string, unknown>
  }
): Promise<GeminiImageInteractionResponse> {
  const cleanApiKey = apiKey.trim()
  if (!cleanApiKey) throw new Error('API 키가 비어있습니다')

  const response = await fetch(getInteractionsUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': cleanApiKey,
    },
    body: JSON.stringify({
      model: options?.model || GEMINI_MODELS.IMAGE_FAST,
      input,
      response_format: {
        type: 'image',
        aspect_ratio: options?.aspectRatio || '1:1',
        image_size: options?.imageSize || '2K',
      },
      ...(options?.generationConfig ? { generation_config: options.generationConfig } : {}),
    }),
  })

  if (!response.ok) {
    const error = await parseApiError(response)
    throw new Error(error.message)
  }

  return (await response.json()) as GeminiImageInteractionResponse
}

/**
 * 스트리밍 콘텐츠 생성 (채팅, 실시간 텍스트 생성에 사용)
 * SSE(Server-Sent Events) 방식으로 청크 단위 수신
 *
 * @param apiKey Google AI Studio API 키
 * @param contents 대화 내용 배열
 * @param options 스트리밍 옵션
 * @returns 완성된 전체 응답 텍스트
 */
export async function streamGenerateContent(
  apiKey: string,
  contents: GeminiContent[],
  options?: StreamOptions
): Promise<string> {
  const cleanApiKey = apiKey.trim()
  if (!cleanApiKey) throw new Error('API 키가 비어있습니다')

  const model = GEMINI_MODELS.FLASH
  const url = getStreamContentUrl(model, cleanApiKey)

  const requestBody: Record<string, unknown> = {
    contents,
    generationConfig: options?.generationConfig || GEMINI_TEXT_CONFIG,
  }

  // Google Search Grounding 도구 추가
  if (options?.useGoogleSearch) {
    requestBody.tools = [{ google_search: {} }]
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  })

  if (!response.ok) {
    const error = await parseApiError(response)
    throw new Error(error.message)
  }

  if (!response.body) {
    throw new Error('응답 스트림을 사용할 수 없습니다')
  }

  // SSE 스트림 읽기
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullResponse = ''
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })

      // 줄 단위로 파싱 (불완전한 마지막 줄은 buffer에 보관)
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue

        const jsonStr = line.slice(6).trim()
        if (!jsonStr || jsonStr === '[DONE]') continue

        try {
          const chunk = JSON.parse(jsonStr) as GeminiStreamChunk

          // finishReason 체크
          const finishReason = chunk.candidates?.[0]?.finishReason
          if (finishReason) {
            const warning = checkFinishReason(finishReason)
            if (warning) devLog.warn(warning)
          }

          // 청크 콜백 실행
          options?.onChunk?.(chunk)

          // 텍스트 누적
          const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text
          if (text) fullResponse += text
        } catch (e) {
          // JSON 파싱 실패해도 계속 진행 (불완전한 청크일 수 있음)
          devLog.warn('스트림 청크 파싱 오류 (무시):', e)
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  devLog.log(`✅ 스트리밍 완료 (${fullResponse.length}자)`)
  return fullResponse
}

/**
 * 재시도 로직이 포함된 generateContent
 * 500/503 에러 시 지정된 횟수만큼 재시도
 *
 * @param maxRetries 최대 재시도 횟수 (기본값: 2)
 * @param retryDelayMs 재시도 대기 시간 ms (기본값: 5000)
 */
export async function generateContentWithRetry(
  apiKey: string,
  contents: GeminiContent[],
  options?: Parameters<typeof generateContent>[2],
  maxRetries = 2,
  retryDelayMs = 5000
): Promise<GeminiResponse> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await generateContent(apiKey, contents, options)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // 500/503 에러면 재시도, 그 외는 즉시 throw
      const isRetryable =
        lastError.message.includes('500') ||
        lastError.message.includes('503') ||
        lastError.message.includes('자동으로 재시도')

      if (!isRetryable || attempt >= maxRetries) break

      devLog.warn(`API 오류 발생, ${retryDelayMs / 1000}초 후 재시도 (${attempt + 1}/${maxRetries})...`)
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
    }
  }

  throw lastError
}
