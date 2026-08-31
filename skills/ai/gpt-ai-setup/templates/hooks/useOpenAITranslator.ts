import { useCallback } from 'react'
import { OPENAI_TRANSLATION_CONFIG } from '../lib/constants/openai'
import { generateText } from '../lib/services/openaiService'

function containsKorean(text: string): boolean {
  return /[\uAC00-\uD7A3]/.test(text)
}

async function translate(text: string, direction: 'ko-en' | 'en-ko', apiKey: string): Promise<string> {
  const instructions =
    direction === 'ko-en'
      ? '한국어를 자연스러운 영어로 번역하세요. 이미지 프롬프트와 기술 용어는 영어 표현을 우선합니다. 번역 결과만 출력하세요.'
      : '영어를 자연스러운 한국어로 번역하세요. 제품명과 기술 용어는 필요하면 원문을 유지합니다. 번역 결과만 출력하세요.'

  return generateText(apiKey, {
    model: OPENAI_TRANSLATION_CONFIG.model,
    instructions,
    input: text,
    reasoning: OPENAI_TRANSLATION_CONFIG.reasoning,
    maxOutputTokens: OPENAI_TRANSLATION_CONFIG.max_output_tokens,
  })
}

export function useOpenAITranslator() {
  const translateToEnglish = useCallback((text: string, apiKey: string) => {
    return translate(text, 'ko-en', apiKey)
  }, [])

  const translateToKorean = useCallback((text: string, apiKey: string) => {
    return translate(text, 'en-ko', apiKey)
  }, [])

  return { translateToEnglish, translateToKorean, containsKorean }
}
