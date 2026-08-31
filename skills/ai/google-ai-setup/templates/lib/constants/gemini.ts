// Gemini API 모델 및 설정 상수
// 프로젝트 요구사항에 맞게 커스터마이징 가능

// ─────────────────────────────────────
// 사용 가능한 모델 목록
// ─────────────────────────────────────
export const GEMINI_MODELS = {
  /** 텍스트 생성 / 채팅 / 분석 / 번역 기본 모델 */
  FLASH: 'gemini-3.7-flash',
  /** 저비용 대량 작업용 모델 */
  FLASH_LITE: 'gemini-3.5-flash-lite',
  /** 이미지 생성 기본 모델 */
  IMAGE_FAST: 'gemini-3.1-flash-image',
  /** 초저지연/저비용 이미지 생성 모델 */
  IMAGE_LITE: 'gemini-3.1-flash-lite-image',
  /** 고품질 이미지 생성 모델 */
  IMAGE_PRO: 'gemini-3-pro-image',
} as const

export type GeminiModel = (typeof GEMINI_MODELS)[keyof typeof GEMINI_MODELS]
export type GeminiImageModel =
  | typeof GEMINI_MODELS.IMAGE_FAST
  | typeof GEMINI_MODELS.IMAGE_LITE
  | typeof GEMINI_MODELS.IMAGE_PRO

// ─────────────────────────────────────
// API 엔드포인트
// ─────────────────────────────────────
export const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

/**
 * 텍스트/이미지 분석 엔드포인트 생성
 * @param model 사용할 모델
 * @param apiKey Google AI Studio API 키
 */
export const getGenerateContentUrl = (model: string, apiKey: string) =>
  `${GEMINI_API_BASE_URL}/models/${model}:generateContent?key=${apiKey}`

/**
 * 스트리밍 엔드포인트 생성 (SSE)
 * @param model 사용할 모델
 * @param apiKey Google AI Studio API 키
 */
export const getStreamContentUrl = (model: string, apiKey: string) =>
  `${GEMINI_API_BASE_URL}/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`

/**
 * Gemini 이미지 모델용 Interactions API 엔드포인트
 */
export const getInteractionsUrl = () => `${GEMINI_API_BASE_URL}/interactions`

// ─────────────────────────────────────
// 생성 설정 프리셋
// ─────────────────────────────────────

/**
 * 텍스트 생성 / 채팅 기본 설정
 * temperature 0.7 - 창의성과 일관성의 균형
 */
export const GEMINI_TEXT_CONFIG = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 32768, // 긴 응답 지원 (기획서, 보고서 등)
} as const

/**
 * 이미지 분석 설정
 * temperature 0.4 - 일관된 분석 결과
 */
export const GEMINI_ANALYSIS_CONFIG = {
  temperature: 0.4,
  topK: 32,
  topP: 0.95,
  maxOutputTokens: 8192, // JSON 응답 잘림 방지
} as const

/**
 * 번역 설정
 * temperature 0.3 - 높은 일관성
 */
export const GEMINI_TRANSLATION_CONFIG = {
  temperature: 0.3,
  topK: 20,
  topP: 0.8,
} as const

// ─────────────────────────────────────
// 채팅 설정
// ─────────────────────────────────────

/**
 * 채팅 히스토리 최대 유지 개수
 * 비용 최적화를 위해 최근 N개 메시지만 API에 전달
 */
export const CHAT_HISTORY_LIMIT = 8
