// Gemini API 에러 처리 유틸리티
// HTTP 상태 코드 및 Gemini 특정 에러 코드를 사용자 친화적 메시지로 변환

export interface ApiError {
  /** 사용자에게 표시할 에러 메시지 */
  message: string
  /** Gemini API 에러 코드 */
  code?: string
  /** HTTP 상태 코드 */
  status?: number
  /** 원본 에러 정보 */
  details?: unknown
}

/**
 * HTTP 응답을 ApiError로 변환
 * @param response fetch Response 객체
 */
export async function parseApiError(response: Response): Promise<ApiError> {
  let errorText = ''
  let errorCode = ''

  try {
    const errorBody = await response.json()
    errorText = errorBody?.error?.message || response.statusText
    errorCode = errorBody?.error?.code || errorBody?.error?.status || ''
  } catch {
    errorText = response.statusText || `HTTP ${response.status}`
  }

  // HTTP 상태 코드별 사용자 메시지
  const statusMessages: Record<number, string> = {
    400: `잘못된 요청입니다. 입력값을 확인하세요. (${errorText})`,
    401: 'API 키가 유효하지 않습니다. 설정에서 API 키를 확인하세요.',
    403: 'API 키에 필요한 권한이 없습니다. Google AI Studio에서 API 키 권한을 확인하세요.',
    429: 'API 할당량이 초과되었습니다. 잠시 후 다시 시도하세요.',
    500: 'Gemini 서버 오류가 발생했습니다. 자동으로 재시도합니다.',
    503: 'Gemini 서비스를 사용할 수 없습니다. 잠시 후 다시 시도하세요.',
  }

  // Gemini 에러 코드별 메시지
  const codeMessages: Record<string, string> = {
    INVALID_ARGUMENT: `요청 형식이 올바르지 않습니다: ${errorText}`,
    PERMISSION_DENIED: 'API 키 권한이 없습니다. Google AI Studio를 확인하세요.',
    RESOURCE_EXHAUSTED: 'API 할당량이 초과되었습니다. 잠시 후 다시 시도하세요.',
    UNAUTHENTICATED: 'API 키 인증에 실패했습니다. 올바른 API 키를 입력하세요.',
    DEADLINE_EXCEEDED: '요청 시간이 초과되었습니다. 다시 시도하세요.',
    INTERNAL: 'Gemini 내부 오류가 발생했습니다. 자동으로 재시도합니다.',
    UNAVAILABLE: '서비스를 일시적으로 사용할 수 없습니다.',
  }

  const message =
    (errorCode && codeMessages[errorCode]) ||
    statusMessages[response.status] ||
    `API 오류 (${response.status}): ${errorText}`

  return {
    message,
    code: errorCode,
    status: response.status,
    details: errorText,
  }
}

/**
 * 재시도 가능한 에러인지 확인
 * 500, 503 등 일시적 서버 오류는 재시도 가능
 */
export function isRetryableError(error: ApiError): boolean {
  if (error.status === 500 || error.status === 503) return true
  if (error.code === 'INTERNAL' || error.code === 'UNAVAILABLE') return true
  return false
}

/**
 * API 키 유효성 검사
 * Google AI Studio API 키는 'AIza'로 시작하는 39자 이상의 문자열
 */
export function validateApiKey(apiKey: string): { valid: boolean; message?: string } {
  const trimmed = apiKey.trim()

  if (!trimmed) {
    return { valid: false, message: 'API 키를 입력해주세요.' }
  }

  if (!trimmed.startsWith('AIza')) {
    return {
      valid: false,
      message: 'Google AI Studio API 키는 "AIza"로 시작해야 합니다.',
    }
  }

  if (trimmed.length < 35) {
    return {
      valid: false,
      message: 'API 키가 너무 짧습니다. 올바른 API 키를 입력하세요.',
    }
  }

  return { valid: true }
}

/**
 * finishReason 체크 및 경고 메시지 반환
 * @returns 경고 메시지 (없으면 null)
 */
export function checkFinishReason(finishReason: string): string | null {
  switch (finishReason) {
    case 'MAX_TOKENS':
      return '⚠️ 최대 토큰 수에 도달하여 응답이 잘렸습니다. "계속 작성해줘"라고 요청하세요.'
    case 'SAFETY':
      return '⚠️ 안전 필터에 의해 응답이 차단되었습니다. 다른 방식으로 요청해보세요.'
    case 'RECITATION':
      return '⚠️ 저작권 관련 이유로 응답이 차단되었습니다.'
    case 'STOP':
    case 'END_TURN':
      return null // 정상 완료
    default:
      return null
  }
}
