import {
  OPENAI_IMAGE_CONFIG,
  OPENAI_TEXT_CONFIG,
  OpenAITextModel,
  getImageGenerationsUrl,
  getResponsesUrl,
} from '../constants/openai'
import { isRetryableOpenAIError, parseOpenAIError } from '../openaiErrorHandler'

export interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'developer'
  content: string
}

export interface ResponseCreateOptions {
  model?: OpenAITextModel | string
  instructions?: string
  input: string | OpenAIMessage[]
  stream?: boolean
  reasoning?: { effort?: 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max' }
  text?: Record<string, unknown>
  maxOutputTokens?: number
}

export interface OpenAIResponse {
  id?: string
  output_text?: string
  output?: Array<{
    type?: string
    content?: Array<{ type?: string; text?: string }>
  }>
}

export interface StreamOptions extends Omit<ResponseCreateOptions, 'stream'> {
  onDelta?: (delta: string) => void
  onEvent?: (event: unknown) => void
}

export interface ImageGenerationOptions {
  prompt: string
  model?: string
  size?: string
  quality?: 'low' | 'medium' | 'high' | 'auto'
  outputFormat?: 'png' | 'jpeg' | 'webp'
  background?: 'transparent' | 'opaque' | 'auto'
  n?: number
}

export interface ImageGenerationResult {
  images: string[]
  revisedPrompt?: string
}

function authHeaders(apiKey: string): HeadersInit {
  const cleanApiKey = apiKey.trim()
  if (!cleanApiKey) throw new Error('API 키가 비어있습니다')

  return {
    Authorization: `Bearer ${cleanApiKey}`,
    'Content-Type': 'application/json',
  }
}

function extractOutputText(response: OpenAIResponse): string {
  if (response.output_text) return response.output_text

  return (
    response.output
      ?.flatMap((item) => item.content || [])
      .map((content) => content.text || '')
      .join('') || ''
  )
}

export async function createResponse(
  apiKey: string,
  options: ResponseCreateOptions
): Promise<OpenAIResponse> {
  const response = await fetch(getResponsesUrl(), {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      model: options.model || OPENAI_TEXT_CONFIG.model,
      input: options.input,
      ...(options.instructions ? { instructions: options.instructions } : {}),
      ...(options.reasoning ? { reasoning: options.reasoning } : {}),
      ...(options.text ? { text: options.text } : {}),
      ...(options.maxOutputTokens ? { max_output_tokens: options.maxOutputTokens } : {}),
    }),
  })

  if (!response.ok) {
    const error = await parseOpenAIError(response)
    throw new Error(error.message)
  }

  return (await response.json()) as OpenAIResponse
}

export async function generateText(
  apiKey: string,
  options: ResponseCreateOptions
): Promise<string> {
  const response = await createResponse(apiKey, options)
  const text = extractOutputText(response)
  if (!text) throw new Error('응답 텍스트가 비어 있습니다.')
  return text
}

export async function streamResponse(apiKey: string, options: StreamOptions): Promise<string> {
  const response = await fetch(getResponsesUrl(), {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      model: options.model || OPENAI_TEXT_CONFIG.model,
      input: options.input,
      stream: true,
      ...(options.instructions ? { instructions: options.instructions } : {}),
      ...(options.reasoning ? { reasoning: options.reasoning } : {}),
      ...(options.text ? { text: options.text } : {}),
      ...(options.maxOutputTokens ? { max_output_tokens: options.maxOutputTokens } : {}),
    }),
  })

  if (!response.ok) {
    const error = await parseOpenAIError(response)
    throw new Error(error.message)
  }

  if (!response.body) throw new Error('응답 스트림을 사용할 수 없습니다.')

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let fullText = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue

        const payload = line.slice(6).trim()
        if (!payload || payload === '[DONE]') continue

        const event = JSON.parse(payload) as Record<string, unknown>
        options.onEvent?.(event)

        if (event.type === 'response.output_text.delta' && typeof event.delta === 'string') {
          fullText += event.delta
          options.onDelta?.(event.delta)
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return fullText
}

export async function generateImage(
  apiKey: string,
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const response = await fetch(getImageGenerationsUrl(), {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      model: options.model || OPENAI_IMAGE_CONFIG.model,
      prompt: options.prompt,
      size: options.size || OPENAI_IMAGE_CONFIG.size,
      quality: options.quality || OPENAI_IMAGE_CONFIG.quality,
      output_format: options.outputFormat || OPENAI_IMAGE_CONFIG.output_format,
      ...(options.background ? { background: options.background } : {}),
      ...(options.n ? { n: options.n } : {}),
    }),
  })

  if (!response.ok) {
    const error = await parseOpenAIError(response)
    throw new Error(error.message)
  }

  const body = (await response.json()) as {
    data?: Array<{ b64_json?: string; revised_prompt?: string }>
  }
  const outputFormat = options.outputFormat || OPENAI_IMAGE_CONFIG.output_format
  const mimeType = outputFormat === 'jpeg' ? 'image/jpeg' : `image/${outputFormat}`
  const images = body.data?.flatMap((item) => (item.b64_json ? [`data:${mimeType};base64,${item.b64_json}`] : [])) || []

  if (!images.length) throw new Error('생성된 이미지가 없습니다.')

  return {
    images,
    revisedPrompt: body.data?.[0]?.revised_prompt,
  }
}

export async function generateTextWithRetry(
  apiKey: string,
  options: ResponseCreateOptions,
  maxRetries = 2,
  retryDelayMs = 1500
): Promise<string> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await generateText(apiKey, options)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      if (!isRetryableOpenAIError(lastError) || attempt >= maxRetries) break
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
    }
  }

  throw lastError
}
