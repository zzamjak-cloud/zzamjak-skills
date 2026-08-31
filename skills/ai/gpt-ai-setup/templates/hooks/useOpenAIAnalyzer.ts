import { useCallback, useState } from 'react'
import { OPENAI_TEXT_CONFIG } from '../lib/constants/openai'
import { generateText } from '../lib/services/openaiService'

export interface UseOpenAIAnalyzerOptions {
  instructions?: string
  model?: string
}

export function useOpenAIAnalyzer<T>(options?: UseOpenAIAnalyzerOptions) {
  const [result, setResult] = useState<T | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const analyze = useCallback(
    async (prompt: string, apiKey: string): Promise<T | null> => {
      setIsAnalyzing(true)
      setError(null)

      try {
        const text = await generateText(apiKey, {
          model: options?.model || OPENAI_TEXT_CONFIG.model,
          instructions:
            options?.instructions ||
            '응답은 반드시 유효한 JSON 하나만 반환하세요. Markdown 코드블록은 사용하지 마세요.',
          input: prompt,
          reasoning: OPENAI_TEXT_CONFIG.reasoning,
          text: { format: { type: 'json_object' } },
        })
        const parsed = JSON.parse(text) as T
        setResult(parsed)
        return parsed
      } catch (err) {
        setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.')
        return null
      } finally {
        setIsAnalyzing(false)
      }
    },
    [options?.instructions, options?.model]
  )

  return { analyze, result, isAnalyzing, error }
}
