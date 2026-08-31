// Gemini 이미지 생성 훅
// 참조 이미지 기반 이미지 생성 (Gemini Interactions API 사용)
// 500 에러 자동 재시도 로직 포함

import { useState, useCallback } from 'react'
import {
  generateImageInteraction,
  imageToInteractionInput,
} from '../lib/services/geminiService'
import { GEMINI_MODELS, type GeminiImageModel } from '../lib/constants/gemini'
import { devLog } from '../lib/utils/logger'

// ─────────────────────────────────────
// 설정
// ─────────────────────────────────────

/** 모델별 요청 가능한 최대 참조 이미지 수 */
const MAX_REFERENCE_IMAGES_BY_MODEL: Record<GeminiImageModel, number> = {
  [GEMINI_MODELS.IMAGE_FAST]: 10,
  [GEMINI_MODELS.IMAGE_LITE]: 14,
  [GEMINI_MODELS.IMAGE_PRO]: 14,
}

/** 재시도 설정 */
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 5000

// ─────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────

export type AspectRatio =
  | '1:1'
  | '3:2'
  | '2:3'
  | '3:4'
  | '4:3'
  | '4:5'
  | '5:4'
  | '9:16'
  | '16:9'
  | '21:9'
  | '1:4'
  | '4:1'
  | '1:8'
  | '8:1'
export type ImageSize = '0.5K' | '1K' | '2K' | '4K'

export interface ImageGenerationParams {
  /** 이미지 생성 프롬프트 (필수) */
  prompt: string
  /** 참조 이미지 Base64 배열 (최대 10개) */
  referenceImages?: string[]
  /** 이미지 생성 모델 (기본값: GEMINI_MODELS.IMAGE_FAST) */
  model?: GeminiImageModel
  /** 화면 비율 (기본값: '1:1') */
  aspectRatio?: AspectRatio
  /** 이미지 크기 (기본값: '1K') */
  imageSize?: ImageSize
  /** 제외할 요소 (네거티브 프롬프트) */
  negativePrompt?: string
  /** 재현성을 위한 시드값 */
  seed?: number
  /** 창의성 수준 0.0~2.0 (기본값: 1.0) */
  temperature?: number
}

export interface GenerationResult {
  /** 생성된 이미지 Base64 (data URL 포함) */
  imageBase64: string
  /** 텍스트 응답 (있는 경우) */
  text?: string
}

export interface UseImageGeneratorReturn {
  /** 생성 중 상태 */
  isGenerating: boolean
  /** 에러 메시지 */
  error: string | null
  /** 생성 결과 */
  result: GenerationResult | null
  /** 재시도 중인지 여부 */
  isRetrying: boolean
  /** 이미지 생성 실행 */
  generate: (params: ImageGenerationParams, apiKey: string) => Promise<GenerationResult | null>
  /** 결과 초기화 */
  reset: () => void
}

// ─────────────────────────────────────
// 훅 구현
// ─────────────────────────────────────

/**
 * Gemini 이미지 생성 훅
 *
 * 참조 이미지 기반으로 새로운 이미지를 생성합니다.
 * 500 서버 오류 시 자동으로 재시도합니다.
 *
 * 사용 예시:
 * ```tsx
 * const { generate, isGenerating, result, isRetrying } = useGeminiImageGenerator()
 *
 * const handleGenerate = async () => {
 *   const result = await generate({
 *     prompt: '밝고 활기찬 캐릭터, 흰색 배경',
 *     referenceImages: [referenceImageBase64],
 *     aspectRatio: '1:1',
 *     imageSize: '2K',
 *   }, apiKey)
 *
 *   if (result) {
 *     setGeneratedImage(result.imageBase64)
 *   }
 * }
 * ```
 */
export function useGeminiImageGenerator(): UseImageGeneratorReturn {
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<GenerationResult | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  const generate = useCallback(
    async (
      params: ImageGenerationParams,
      apiKey: string
    ): Promise<GenerationResult | null> => {
      if (!params.prompt.trim()) {
        setError('이미지 생성 프롬프트를 입력해주세요.')
        return null
      }
      if (!apiKey.trim()) {
        setError('API 키를 입력해주세요.')
        return null
      }

      setIsGenerating(true)
      setIsRetrying(false)
      setError(null)
      setResult(null)

      try {
        const model = params.model || GEMINI_MODELS.IMAGE_FAST
        const maxReferenceImages = MAX_REFERENCE_IMAGES_BY_MODEL[model]

        // 참조 이미지 수 제한 확인
        const refImages = params.referenceImages?.slice(0, maxReferenceImages) || []
        if (params.referenceImages && params.referenceImages.length > maxReferenceImages) {
          devLog.warn(
            `참조 이미지가 ${maxReferenceImages}개로 제한됩니다.`,
            `(원래: ${params.referenceImages.length}개)`
          )
        }

        // 요청 페이로드 크기 예상 (20MB 제한)
        if (refImages.length > 0) {
          const totalSizeKB = refImages.reduce((sum, img) => sum + img.length / 1024, 0)
          devLog.log(`참조 이미지 총 크기: ${(totalSizeKB / 1024).toFixed(2)}MB`)

          if (totalSizeKB > 15000) {
            // 15MB 이상이면 경고
            devLog.warn('참조 이미지 크기가 너무 큽니다. API 오류가 발생할 수 있습니다.')
          }
        }

        // 전체 프롬프트 구성
        let fullPrompt = params.prompt
        if (params.negativePrompt) {
          fullPrompt += `\n\nNEGATIVE PROMPT (피할 요소): ${params.negativePrompt}`
        }

        const input = [
          ...refImages.map((img) => imageToInteractionInput(img)),
          { type: 'text' as const, text: fullPrompt },
        ]

        devLog.log(`이미지 생성 시작 (참조 이미지: ${refImages.length}개)`)

        let response
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            response = await generateImageInteraction(apiKey, input, {
              model,
              aspectRatio: params.aspectRatio || '1:1',
              imageSize:
                model === GEMINI_MODELS.IMAGE_LITE
                  ? '1K'
                  : params.imageSize || '1K',
              generationConfig: {
                ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
                ...(params.seed !== undefined ? { seed: params.seed } : {}),
              },
            })
            break
          } catch (err) {
            if (attempt >= MAX_RETRIES) throw err
            setIsRetrying(true)
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
          }
        }

        if (!response) throw new Error('이미지 생성 응답이 없습니다.')

        // 응답 파싱
        let imageBase64 = response.output_image?.data
          ? `data:${response.output_image.mime_type || 'image/png'};base64,${response.output_image.data}`
          : ''
        let textResponse = response.output_text || ''

        for (const part of response.output || []) {
          if (part.data || part.image?.data) {
            const mimeType = part.mime_type || part.image?.mime_type || 'image/png'
            imageBase64 = `data:${mimeType};base64,${part.data || part.image?.data}`
          }
          if (part.text) {
            textResponse += part.text
          }
        }

        if (!imageBase64) {
          throw new Error('이미지가 생성되지 않았습니다. 프롬프트를 수정하거나 다시 시도하세요.')
        }

        const generationResult: GenerationResult = {
          imageBase64,
          text: textResponse || undefined,
        }

        setResult(generationResult)
        devLog.log('이미지 생성 완료')
        return generationResult
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : '이미지 생성 중 오류가 발생했습니다'
        setError(errorMessage)
        devLog.error('이미지 생성 오류:', err)
        return null
      } finally {
        setIsGenerating(false)
        setIsRetrying(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { isGenerating, error, result, isRetrying, generate, reset }
}
