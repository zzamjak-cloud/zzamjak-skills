export interface OpenAIError {
  message: string
  code?: string
  type?: string
  status?: number
  details?: unknown
}

export async function parseOpenAIError(response: Response): Promise<OpenAIError> {
  let errorText = response.statusText || `HTTP ${response.status}`
  let errorCode = ''
  let errorType = ''
  let details: unknown

  try {
    const body = await response.json()
    details = body
    errorText = body?.error?.message || errorText
    errorCode = body?.error?.code || ''
    errorType = body?.error?.type || ''
  } catch {
    details = errorText
  }

  const statusMessages: Record<number, string> = {
    400: `요청 형식이 올바르지 않습니다. 입력값을 확인하세요. (${errorText})`,
    401: 'OpenAI API 키가 유효하지 않습니다.',
    403: 'OpenAI API 키 또는 프로젝트 권한이 부족합니다.',
    404: '요청한 모델 또는 엔드포인트를 찾을 수 없습니다.',
    408: '요청 시간이 초과되었습니다. 다시 시도하세요.',
    409: '요청 충돌이 발생했습니다. 잠시 후 다시 시도하세요.',
    429: '요청 한도 또는 결제 한도에 도달했습니다. 잠시 후 다시 시도하세요.',
    500: 'OpenAI 서버 오류가 발생했습니다. 잠시 후 다시 시도하세요.',
    503: 'OpenAI 서비스를 일시적으로 사용할 수 없습니다.',
  }

  return {
    message: statusMessages[response.status] || `OpenAI API 오류 (${response.status}): ${errorText}`,
    code: errorCode,
    type: errorType,
    status: response.status,
    details,
  }
}

export function validateOpenAIApiKey(apiKey: string): { valid: boolean; message?: string } {
  const trimmed = apiKey.trim()

  if (!trimmed) return { valid: false, message: 'API 키를 입력해주세요.' }

  if (!trimmed.startsWith('sk-')) {
    return { valid: false, message: 'OpenAI API 키는 일반적으로 "sk-"로 시작합니다.' }
  }

  if (trimmed.length < 40) {
    return { valid: false, message: 'API 키가 너무 짧습니다. 올바른 키를 입력하세요.' }
  }

  return { valid: true }
}

export function isRetryableOpenAIError(error: OpenAIError | Error): boolean {
  const status = 'status' in error ? error.status : undefined
  if (status === 408 || status === 409 || status === 429 || status === 500 || status === 503) {
    return true
  }

  return error.message.includes('서버 오류') || error.message.includes('일시적으로')
}
