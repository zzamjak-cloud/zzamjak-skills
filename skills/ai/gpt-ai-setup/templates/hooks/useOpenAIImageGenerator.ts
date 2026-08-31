import { useCallback, useState } from 'react'
import { OPENAI_IMAGE_CONFIG } from '../lib/constants/openai'
import { ImageGenerationResult, generateImage } from '../lib/services/openaiService'

export interface OpenAIImageParams {
  prompt: string
  size?: string
  quality?: 'low' | 'medium' | 'high' | 'auto'
  outputFormat?: 'png' | 'jpeg' | 'webp'
  background?: 'transparent' | 'opaque' | 'auto'
  n?: number
}

export function useOpenAIImageGenerator() {
  const [result, setResult] = useState<ImageGenerationResult | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (params: OpenAIImageParams, apiKey: string) => {
    if (!params.prompt.trim()) {
      setError('이미지 생성 프롬프트를 입력해주세요.')
      return null
    }

    setIsGenerating(true)
    setError(null)

    try {
      const imageResult = await generateImage(apiKey, {
        model: OPENAI_IMAGE_CONFIG.model,
        prompt: params.prompt,
        size: params.size || OPENAI_IMAGE_CONFIG.size,
        quality: params.quality || OPENAI_IMAGE_CONFIG.quality,
        outputFormat: params.outputFormat || OPENAI_IMAGE_CONFIG.output_format,
        background: params.background,
        n: params.n,
      })
      setResult(imageResult)
      return imageResult
    } catch (err) {
      setError(err instanceof Error ? err.message : '이미지 생성 중 오류가 발생했습니다.')
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const reset = useCallback(() => {
    setResult(null)
    setError(null)
  }, [])

  return { generate, result, isGenerating, error, reset }
}
