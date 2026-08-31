// API 키 입력 및 관리 컴포넌트
// Tauri Store를 통해 API 키를 안전하게 저장/불러오기
// TODO: 프로젝트의 스타일 시스템(Tailwind, CSS Module 등)에 맞게 수정

import { useState, useEffect } from 'react'
import { Store } from '@tauri-apps/plugin-store'

// ─────────────────────────────────────
// TODO: 아래 상수를 프로젝트에 맞게 수정
// ─────────────────────────────────────

/** Tauri Store 파일명 */
const STORE_FILE = 'settings.json'

/** Store 키 */
const API_KEY_STORE_KEY = 'gemini_api_key'

// ─────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────

export interface ApiKeyInputProps {
  /** API 키 변경 시 콜백 */
  onApiKeyChange?: (apiKey: string) => void
  /** 컴포넌트 제목 */
  title?: string
  /** 안내 링크 표시 여부 */
  showHelp?: boolean
}

// ─────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────

/**
 * Google AI Studio API 키 유효성 검사
 * 올바른 형식: AIzaSy... (39자 이상)
 */
function validateApiKey(key: string): string | null {
  const trimmed = key.trim()
  if (!trimmed) return null
  if (!trimmed.startsWith('AIza')) return '올바르지 않은 API 키 형식입니다 (AIza...로 시작해야 합니다)'
  if (trimmed.length < 39) return 'API 키가 너무 짧습니다'
  return null // 유효
}

// ─────────────────────────────────────
// 컴포넌트
// ─────────────────────────────────────

/**
 * Gemini API 키 입력 및 저장 컴포넌트
 *
 * 사용 예시:
 * ```tsx
 * const [apiKey, setApiKey] = useState('')
 *
 * <ApiKeyInput
 *   onApiKeyChange={setApiKey}
 *   title="Google AI API 키"
 *   showHelp={true}
 * />
 * ```
 */
export function ApiKeyInput({
  onApiKeyChange,
  title = 'Google AI API 키',
  showHelp = true,
}: ApiKeyInputProps) {
  const [apiKey, setApiKey] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [isVisible, setIsVisible] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ─── 마운트 시 저장된 API 키 불러오기
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const store = await Store.load(STORE_FILE)
        const savedKey = await store.get<string>(API_KEY_STORE_KEY)
        if (savedKey) {
          setApiKey(savedKey)
          setInputValue(savedKey)
          onApiKeyChange?.(savedKey)
        }
      } catch (err) {
        console.error('API 키 불러오기 실패:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadApiKey()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── 저장 핸들러
  const handleSave = async () => {
    const trimmed = inputValue.trim()

    // 빈 값이면 삭제
    if (!trimmed) {
      await handleClear()
      return
    }

    // 유효성 검사
    const validationError = validateApiKey(trimmed)
    if (validationError) {
      setSaveMessage({ type: 'error', text: validationError })
      setTimeout(() => setSaveMessage(null), 3000)
      return
    }

    setIsSaving(true)
    try {
      const store = await Store.load(STORE_FILE)
      await store.set(API_KEY_STORE_KEY, trimmed)
      await store.save()

      setApiKey(trimmed)
      onApiKeyChange?.(trimmed)
      setSaveMessage({ type: 'success', text: 'API 키가 저장되었습니다' })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'API 키 저장 중 오류가 발생했습니다' })
      setTimeout(() => setSaveMessage(null), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  // ─── 삭제 핸들러
  const handleClear = async () => {
    try {
      const store = await Store.load(STORE_FILE)
      await store.delete(API_KEY_STORE_KEY)
      await store.save()

      setApiKey('')
      setInputValue('')
      onApiKeyChange?.('')
      setSaveMessage({ type: 'success', text: 'API 키가 삭제되었습니다' })
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (err) {
      setSaveMessage({ type: 'error', text: 'API 키 삭제 중 오류가 발생했습니다' })
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  // ─── 변경 여부 확인
  const hasChanges = inputValue.trim() !== apiKey

  if (isLoading) {
    // TODO: 프로젝트 스타일에 맞는 로딩 UI로 교체
    return <div className="text-sm text-muted-foreground">API 키 불러오는 중...</div>
  }

  // TODO: 아래 JSX를 프로젝트 스타일 시스템(Tailwind/CSS/etc.)에 맞게 수정
  return (
    <div className="api-key-input-container">
      {/* 섹션 헤더 */}
      <div className="api-key-header">
        <label className="api-key-label">{title}</label>
        {apiKey && (
          <span className="api-key-status api-key-status--saved">
            ✓ 저장됨
          </span>
        )}
      </div>

      {/* 입력 필드 */}
      <div className="api-key-input-row">
        <input
          type={isVisible ? 'text' : 'password'}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          placeholder="AIzaSy..."
          className="api-key-input"
          autoComplete="off"
          spellCheck={false}
        />

        {/* 보기/숨기기 토글 */}
        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          className="api-key-toggle-btn"
          title={isVisible ? '숨기기' : '보기'}
        >
          {isVisible ? '🙈' : '👁️'}
        </button>
      </div>

      {/* 버튼 영역 */}
      <div className="api-key-actions">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !hasChanges}
          className="api-key-save-btn"
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>

        {apiKey && (
          <button
            type="button"
            onClick={handleClear}
            className="api-key-clear-btn"
          >
            삭제
          </button>
        )}
      </div>

      {/* 저장 결과 메시지 */}
      {saveMessage && (
        <p
          className={`api-key-message ${
            saveMessage.type === 'success' ? 'api-key-message--success' : 'api-key-message--error'
          }`}
        >
          {saveMessage.text}
        </p>
      )}

      {/* 도움말 링크 */}
      {showHelp && (
        <p className="api-key-help">
          API 키 발급:{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="api-key-help-link"
          >
            Google AI Studio
          </a>
        </p>
      )}
    </div>
  )
}

// ─────────────────────────────────────
// API 키 로드/저장 유틸리티 (훅 없이 사용)
// ─────────────────────────────────────

/**
 * Tauri Store에서 API 키 불러오기
 * 컴포넌트 마운트 시 또는 필요할 때 호출
 */
export async function loadApiKey(): Promise<string> {
  try {
    const store = await Store.load(STORE_FILE)
    return (await store.get<string>(API_KEY_STORE_KEY)) || ''
  } catch {
    return ''
  }
}

/**
 * Tauri Store에 API 키 저장
 */
export async function saveApiKey(apiKey: string): Promise<void> {
  const store = await Store.load(STORE_FILE)
  await store.set(API_KEY_STORE_KEY, apiKey.trim())
  await store.save()
}
