// Gemini 이미지 분석 훅
// 이미지를 API에 전송하여 JSON 형식의 분석 결과를 반환

import { useState, useCallback } from 'react'
import {
  generateContent,
  imageToGeminiPart,
  parseJsonResponse,
  type GeminiContent,
} from '../lib/services/geminiService'
import { GEMINI_MODELS, GEMINI_ANALYSIS_CONFIG } from '../lib/constants/gemini'
import { checkFinishReason } from '../lib/apiErrorHandler'
import { devLog } from '../lib/utils/logger'

// ─────────────────────────────────────
// TODO: 프로젝트에 맞게 분석 프롬프트 커스터마이징
// ─────────────────────────────────────

/**
 * 기본 이미지 분석 프롬프트
 * 응답 형식: JSON (code block 내)
 */
const DEFAULT_ANALYSIS_PROMPT = `이미지를 분석하고 다음 JSON 형식으로 정확히 응답하세요:

\`\`\`json
{
  "description": "이미지에 대한 상세 설명",
  "style": "화풍 또는 스타일",
  "colors": ["주요 색상1", "주요 색상2"],
  "mood": "전반적인 분위기",
  "tags": ["태그1", "태그2", "태그3"]
}
\`\`\`

JSON만 반환하고 다른 설명은 추가하지 마세요.`

// ─────────────────────────────────────
// TODO: 분석 결과 타입을 프로젝트에 맞게 수정
// ─────────────────────────────────────

/** 기본 분석 결과 타입 */
export interface AnalysisResult {
  description: string
  style: string
  colors: string[]
  mood: string
  tags: string[]
  // TODO: 프로젝트 필요에 맞는 필드 추가
}

export interface UseAnalyzerOptions {
  /** 분석 프롬프트 (기본값: DEFAULT_ANALYSIS_PROMPT) */
  prompt?: string
  /** 분석 진행 상황 콜백 */
  onProgress?: (message: string) => void
}

export interface UseAnalyzerReturn<T = AnalysisResult> {
  /** 분석 중 상태 */
  isAnalyzing: boolean
  /** 에러 메시지 */
  error: string | null
  /** 분석 결과 */
  result: T | null
  /** 이미지 분석 실행 */
  analyze: (imageBase64Array: string[], apiKey: string) => Promise<T | null>
  /** 결과 초기화 */
  reset: () => void
}

// ─────────────────────────────────────
// 훅 구현
// ─────────────────────────────────────

/**
 * Gemini 이미지 분석 훅
 *
 * 1개 또는 여러 개의 이미지를 분석하여 JSON 결과를 반환합니다.
 *
 * 사용 예시:
 * ```tsx
 * const { analyze, isAnalyzing, result } = useGeminiAnalyzer({
 *   prompt: '이 이미지의 스타일을 분석해주세요.',
 *   onProgress: (msg) => setProgressMessage(msg),
 * })
 *
 * const handleAnalyze = async () => {
 *   const analysisResult = await analyze(imageBase64Array, apiKey)
 *   if (analysisResult) {
 *     console.log(analysisResult)
 *   }
 * }
 * ```
 */
export function useGeminiAnalyzer<T = AnalysisResult>(
  options?: UseAnalyzerOptions
): UseAnalyzerReturn<T> {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<T | null>(null)

  const prompt = options?.prompt || DEFAULT_ANALYSIS_PROMPT

  const analyze = useCallback(
    async (imageBase64Array: string[], apiKey: string): Promise<T | null> => {
      if (!imageBase64Array.length) {
        setError('분석할 이미지를 선택해주세요.')
        return null
      }
      if (!apiKey.trim()) {
        setError('API 키를 입력해주세요.')
        return null
      }

      setIsAnalyzing(true)
      setError(null)
      options?.onProgress?.('이미지 분석 중...')

      try {
        devLog.log(`이미지 ${imageBase64Array.length}개 분석 시작`)

        // 이미지 parts 구성
        const imageParts = imageBase64Array.map((img) => imageToGeminiPart(img))

        const contents: GeminiContent[] = [
          {
            role: 'user',
            parts: [
              // 이미지들 먼저
              ...imageParts,
              // 분석 프롬프트
              { text: prompt },
            ],
          },
        ]

        const response = await generateContent(apiKey, contents, {
          model: GEMINI_MODELS.FLASH,
          generationConfig: GEMINI_ANALYSIS_CONFIG,
        })

        const candidate = response.candidates?.[0]
        if (!candidate) throw new Error('응답에 후보가 없습니다')

        // finishReason 체크
        if (candidate.finishReason) {
          const warning = checkFinishReason(candidate.finishReason)
          if (warning) {
            setError(warning)
            return null
          }
        }

        const responseText = candidate.content?.parts?.[0]?.text
        if (!responseText) throw new Error('응답 텍스트가 없습니다')

        // JSON 파싱
        const parsed = parseJsonResponse<T>(responseText)
        setResult(parsed)
        options?.onProgress?.('분석 완료')

        devLog.log('이미지 분석 완료:', parsed)
        return parsed
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '분석 중 오류가 발생했습니다'
        setError(errorMessage)
        devLog.error('이미지 분석 오류:', err)
        return null
      } finally {
        setIsAnalyzing(false)
      }
    },
    [prompt, options]
  )

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { isAnalyzing, error, result, analyze, reset }
}
