// Gemini 번역 훅
// 한국어 ↔ 영어 번역 (단일/배치 지원)
// 이미지 생성 프롬프트 번역에 최적화 (기술 용어 영어 유지)

import { useCallback } from 'react'
import { generateContent, type GeminiContent } from '../lib/services/geminiService'
import { GEMINI_MODELS, GEMINI_TRANSLATION_CONFIG } from '../lib/constants/gemini'
import { devLog } from '../lib/utils/logger'

// ─────────────────────────────────────
// 번역 프롬프트
// ─────────────────────────────────────

const TRANSLATE_TO_ENGLISH_PROMPT = `You are a professional translator specializing in image generation prompts.

IMPORTANT RULES:
1. Translate naturally and fluently
2. Keep technical terms in English (anime style, chibi, pixel art, etc.)
3. Preserve comma-separated format
4. Output ONLY the translation, no explanations

Translate the following Korean text to English:`

const TRANSLATE_TO_KOREAN_PROMPT = `당신은 전문 번역가입니다.

규칙:
1. 자연스럽고 유창하게 번역하세요
2. 기술 용어는 원문 유지 가능 (anime, pixel art 등)
3. 쉼표로 구분된 형식 유지
4. 번역 결과만 출력하고 다른 설명은 추가하지 마세요

다음 영어 텍스트를 한국어로 번역하세요:`

// ─────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────

export interface UseTranslatorReturn {
  /** 영어 → 한국어 번역 */
  translateToKorean: (text: string, apiKey: string) => Promise<string>
  /** 한국어 → 영어 번역 */
  translateToEnglish: (text: string, apiKey: string) => Promise<string>
  /** 배치 한국어 → 영어 번역 (10개 항목 = 1 API 호출) */
  translateBatchToEnglish: (texts: string[], apiKey: string) => Promise<string[]>
  /** 배치 영어 → 한국어 번역 */
  translateBatchToKorean: (texts: string[], apiKey: string) => Promise<string[]>
  /** 텍스트에 한국어가 포함되어 있는지 확인 */
  containsKorean: (text: string) => boolean
}

// ─────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────

/**
 * 한국어 문자가 포함되어 있는지 확인
 * 유니코드 범위: 가-힣 (AC00-D7A3)
 */
function containsKorean(text: string): boolean {
  return /[\uAC00-\uD7A3]/.test(text)
}

/**
 * 단일 텍스트 번역 공통 함수
 */
async function translateText(
  text: string,
  prompt: string,
  apiKey: string
): Promise<string> {
  const contents: GeminiContent[] = [
    {
      role: 'user',
      parts: [{ text: `${prompt}\n\n${text}` }],
    },
  ]

  const response = await generateContent(apiKey, contents, {
    model: GEMINI_MODELS.FLASH,
    generationConfig: GEMINI_TRANSLATION_CONFIG,
  })

  const translated = response.candidates?.[0]?.content?.parts?.[0]?.text
  if (!translated) throw new Error('번역 결과가 없습니다')

  return translated.trim()
}

/**
 * 배치 번역 공통 함수
 * [1] text1\n[2] text2 형식으로 전송 후 파싱
 */
async function translateBatch(
  texts: string[],
  prompt: string,
  apiKey: string
): Promise<string[]> {
  if (texts.length === 0) return []
  if (texts.length === 1) {
    const result = await translateText(texts[0], prompt, apiKey)
    return [result]
  }

  // 배치 형식으로 묶기: [1] text1\n[2] text2\n...
  const batchText = texts.map((text, idx) => `[${idx + 1}] ${text}`).join('\n')

  const batchPrompt = `${prompt}

다음 ${texts.length}개 항목을 각각 번역하고, 반드시 "[숫자] 번역결과" 형식으로 응답하세요:

${batchText}`

  const contents: GeminiContent[] = [
    {
      role: 'user',
      parts: [{ text: batchPrompt }],
    },
  ]

  const response = await generateContent(apiKey, contents, {
    model: GEMINI_MODELS.FLASH,
    generationConfig: GEMINI_TRANSLATION_CONFIG,
  })

  const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text
  if (!responseText) throw new Error('배치 번역 결과가 없습니다')

  // "[숫자] 번역결과" 형식 파싱
  const lines = responseText.split('\n').filter((line) => line.trim())
  const results: string[] = new Array(texts.length).fill('')

  for (let i = 0; i < texts.length; i++) {
    const linePrefix = `[${i + 1}]`
    const matchingLine = lines.find((line) => line.trimStart().startsWith(linePrefix))

    if (matchingLine) {
      // "[숫자] " 부분 제거
      results[i] = matchingLine.replace(/^\[?\d+\]?\s*/, '').trim()
    } else {
      // 매칭 실패 시 원본 유지
      devLog.warn(`배치 번역 ${i + 1}번 항목 파싱 실패, 원본 유지`)
      results[i] = texts[i]
    }
  }

  return results
}

// ─────────────────────────────────────
// 훅 구현
// ─────────────────────────────────────

/**
 * Gemini 번역 훅
 *
 * 사용 예시:
 * ```tsx
 * const { translateToEnglish, translateBatchToEnglish, containsKorean } = useGeminiTranslator()
 *
 * // 단일 번역
 * const handleTranslate = async () => {
 *   if (containsKorean(inputText)) {
 *     const english = await translateToEnglish(inputText, apiKey)
 *     setPrompt(english)
 *   }
 * }
 *
 * // 배치 번역 (90% 비용 절감)
 * const handleBatchTranslate = async () => {
 *   const results = await translateBatchToEnglish(koreanTexts, apiKey)
 * }
 * ```
 */
export function useGeminiTranslator(): UseTranslatorReturn {
  const translateToKorean = useCallback(
    async (text: string, apiKey: string): Promise<string> => {
      if (!text.trim()) return text
      if (!apiKey.trim()) throw new Error('API 키를 입력해주세요.')

      devLog.log('영어 → 한국어 번역:', text.slice(0, 50))
      const result = await translateText(text, TRANSLATE_TO_KOREAN_PROMPT, apiKey)
      devLog.log('번역 완료:', result.slice(0, 50))
      return result
    },
    []
  )

  const translateToEnglish = useCallback(
    async (text: string, apiKey: string): Promise<string> => {
      if (!text.trim()) return text
      if (!apiKey.trim()) throw new Error('API 키를 입력해주세요.')
      if (!containsKorean(text)) {
        devLog.log('한국어 없음, 번역 건너뜀')
        return text
      }

      devLog.log('한국어 → 영어 번역:', text.slice(0, 50))
      const result = await translateText(text, TRANSLATE_TO_ENGLISH_PROMPT, apiKey)
      devLog.log('번역 완료:', result.slice(0, 50))
      return result
    },
    []
  )

  const translateBatchToEnglish = useCallback(
    async (texts: string[], apiKey: string): Promise<string[]> => {
      if (texts.length === 0) return []
      if (!apiKey.trim()) throw new Error('API 키를 입력해주세요.')

      // 한국어가 없는 텍스트는 건너뜀
      const needsTranslation = texts.some((t) => containsKorean(t))
      if (!needsTranslation) {
        devLog.log('한국어 없음, 배치 번역 건너뜀')
        return texts
      }

      devLog.log(`한국어 → 영어 배치 번역: ${texts.length}개 항목`)
      const results = await translateBatch(texts, TRANSLATE_TO_ENGLISH_PROMPT, apiKey)
      devLog.log('배치 번역 완료')
      return results
    },
    []
  )

  const translateBatchToKorean = useCallback(
    async (texts: string[], apiKey: string): Promise<string[]> => {
      if (texts.length === 0) return []
      if (!apiKey.trim()) throw new Error('API 키를 입력해주세요.')

      devLog.log(`영어 → 한국어 배치 번역: ${texts.length}개 항목`)
      const results = await translateBatch(texts, TRANSLATE_TO_KOREAN_PROMPT, apiKey)
      devLog.log('배치 번역 완료')
      return results
    },
    []
  )

  return {
    translateToKorean,
    translateToEnglish,
    translateBatchToEnglish,
    translateBatchToKorean,
    containsKorean,
  }
}
