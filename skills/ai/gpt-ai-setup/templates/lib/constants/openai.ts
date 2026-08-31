export const OPENAI_MODELS = {
  /** 복잡한 추론과 고품질 텍스트 기본 모델 */
  GPT_5_6: 'gpt-5.6',
  /** 품질과 비용 균형 */
  GPT_5_6_TERRA: 'gpt-5.6-terra',
  /** 비용 민감 대량 처리 */
  GPT_5_6_LUNA: 'gpt-5.6-luna',
  /** 이미지 생성과 편집 기본 모델 */
  GPT_IMAGE: 'gpt-image-2',
} as const

export type OpenAITextModel =
  | typeof OPENAI_MODELS.GPT_5_6
  | typeof OPENAI_MODELS.GPT_5_6_TERRA
  | typeof OPENAI_MODELS.GPT_5_6_LUNA

export type OpenAIImageModel = typeof OPENAI_MODELS.GPT_IMAGE

export const OPENAI_API_BASE_URL = 'https://api.openai.com/v1'

export const getResponsesUrl = () => `${OPENAI_API_BASE_URL}/responses`

export const getImageGenerationsUrl = () => `${OPENAI_API_BASE_URL}/images/generations`

export const OPENAI_TEXT_CONFIG = {
  model: OPENAI_MODELS.GPT_5_6,
  reasoning: { effort: 'medium' },
  max_output_tokens: 8192,
} as const

export const OPENAI_FAST_TEXT_CONFIG = {
  model: OPENAI_MODELS.GPT_5_6_LUNA,
  reasoning: { effort: 'low' },
  max_output_tokens: 4096,
} as const

export const OPENAI_TRANSLATION_CONFIG = {
  model: OPENAI_MODELS.GPT_5_6_LUNA,
  reasoning: { effort: 'low' },
  max_output_tokens: 4096,
} as const

export const OPENAI_IMAGE_CONFIG = {
  model: OPENAI_MODELS.GPT_IMAGE,
  size: '1024x1024',
  quality: 'auto',
  output_format: 'png',
} as const

export const CHAT_HISTORY_LIMIT = 12
