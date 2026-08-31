---
name: google-ai-setup
description: Tauri + React 프로젝트에 Google Gemini API 기반 텍스트 생성, 스트리밍, 이미지 분석, 이미지 생성, 번역 기능을 통합하거나 최신 모델로 갱신할 때 사용한다.
metadata:
  short-description: Tauri 앱에 Gemini API 기능 통합
---

# Google AI (Gemini) Setup 에이전트

## 에이전트 역할

Tauri + React 프로젝트에 Google Gemini AI API를 통합합니다.
GamePlanner-Tauri와 StyleStudio-Tauri에서 검증된 패턴을 기반으로 합니다.

**핵심 설계 원칙:**
- `@google/generative-ai` SDK **미사용** → REST API 직접 호출 (스트리밍 완전 제어, 번들 최소화)
- 작업 시작 시 Google AI 공식 모델 문서를 확인하고 현재 최신 안정 모델을 반영
- SSE(Server-Sent Events) 방식 스트리밍
- API 키는 Tauri Store에 저장하되, OS 보안 저장소가 필요한 민감 앱은 Stronghold나 네이티브 credential store를 검토
- 기능별 훅 분리 (chat / analyzer / imageGenerator / translator)

---

## 0단계: 기능 선택

사용자에게 필요한 기능을 확인하세요. **핵심 파일은 항상 설치**됩니다.

### 필수 (항상 설치)
- [x] REST API 서비스 (`geminiService.ts`)
- [x] 모델/설정 상수 (`gemini.ts`)
- [x] 에러 처리 유틸리티 (`apiErrorHandler.ts`)
- [x] API 키 관리 컴포넌트 (`ApiKeyInput.tsx`)

### 선택 기능 (사용자에게 확인)
- [ ] **채팅/스트리밍** - 실시간 텍스트 생성, 멀티턴 대화
- [ ] **이미지 분석** - 이미지를 AI가 분석 후 JSON 반환
- [ ] **이미지 생성** - 참조 이미지 기반 새 이미지 생성
- [ ] **번역** - 한↔영 번역 (배치 번역으로 비용 절감)

사용자가 모든 기능이 필요하다면 4개 모두 설치합니다.

---

## 1단계: 사전 조건 확인

### 1-1. Tauri Store 플러그인 확인

```bash
# package.json에서 확인
grep -r "plugin-store" package.json
```

없으면 설치:
```bash
npm install @tauri-apps/plugin-store
```

`src-tauri/Cargo.toml`에 추가 (없을 경우):
```toml
tauri-plugin-store = "2"
```

`src-tauri/src/lib.rs`에 추가 (없을 경우):
```rust
.plugin(tauri_plugin_store::Builder::new().build())
```

### 1-2. Tauri HTTP 권한 확인

`src-tauri/capabilities/default.json`에 Gemini API URL 허용 여부 확인:

```json
{
  "permissions": [
    "http:default",
    {
      "identifier": "http:allow-fetch",
      "allow": [
        { "url": "https://generativelanguage.googleapis.com/**" }
      ]
    }
  ]
}
```

없으면 추가합니다.

### 1-3. devLog 유틸리티 확인

`src/lib/utils/logger.ts` 또는 유사 파일 존재 여부 확인:

```typescript
// 없을 경우 아래 내용으로 src/lib/utils/logger.ts 생성
const isDev = import.meta.env.DEV

export const devLog = {
  log: (...args: unknown[]) => isDev && console.log(...args),
  warn: (...args: unknown[]) => isDev && console.warn(...args),
  error: (...args: unknown[]) => console.error(...args), // 에러는 항상 출력
}
```

---

## 2단계: 디렉토리 구조 생성

```bash
mkdir -p src/lib/services
mkdir -p src/lib/constants
mkdir -p src/lib/utils
mkdir -p src/hooks
mkdir -p src/components
```

---

## 3단계: 핵심 파일 설치 (항상 실행)

아래 3개 파일을 스킬 템플릿에서 프로젝트로 복사합니다.

### 3-1. 모델 상수 및 설정

`SKILL_DIR/templates/lib/constants/gemini.ts` → `src/lib/constants/gemini.ts`

**포함 내용:**
- `GEMINI_MODELS` - 모델 ID 상수 (FLASH, FLASH_LITE, IMAGE_FAST, IMAGE_LITE, IMAGE_PRO)
- `GEMINI_API_BASE_URL`, `getGenerateContentUrl()`, `getStreamContentUrl()`, `getInteractionsUrl()` - API URL 빌더
- `GEMINI_TEXT_CONFIG` - 채팅용 설정 (temperature: 0.7, maxOutputTokens: 32768)
- `GEMINI_ANALYSIS_CONFIG` - 분석용 설정 (temperature: 0.4)
- `GEMINI_TRANSLATION_CONFIG` - 번역용 설정 (temperature: 0.3)
- `CHAT_HISTORY_LIMIT = 8` - 히스토리 제한 (비용 최적화)

### 3-2. 에러 처리 유틸리티

`SKILL_DIR/templates/lib/apiErrorHandler.ts` → `src/lib/apiErrorHandler.ts`

**포함 내용:**
- `parseApiError(response)` - HTTP 에러 응답 파싱 (400/401/403/429/500/503별 메시지)
- `isRetryableError(message)` - 500/503 에러 재시도 여부 판별
- `validateApiKey(apiKey)` - `AIza` 접두사 + 길이 검증
- `checkFinishReason(reason)` - MAX_TOKENS/SAFETY/RECITATION 경고 메시지

### 3-3. REST API 핵심 서비스

`SKILL_DIR/templates/lib/services/geminiService.ts` → `src/lib/services/geminiService.ts`

**포함 내용:**
- `GeminiContent`, `GeminiPart`, `GeminiStreamChunk`, `GeminiResponse` - 타입 정의
- `imageToGeminiPart(base64)` - Base64 → `inline_data` 변환
- `parseJsonResponse<T>(text)` - JSON 코드블록 자동 파싱 (trailing comma 제거 포함)
- `generateContent()` - 비스트리밍 POST 요청 (번역, 분석)
- `streamGenerateContent()` - SSE 스트리밍 (채팅)
- `generateImageInteraction()` - Gemini 이미지 모델용 Interactions API 호출
- `generateContentWithRetry()` - 500/503 자동 재시도 (2회, 5초 대기)

---

## 4단계: 선택 기능 훅 설치

선택된 기능에 해당하는 훅만 설치합니다.

### 4-1. 채팅/스트리밍 훅 (선택)

`SKILL_DIR/templates/hooks/useGeminiChat.ts` → `src/hooks/useGeminiChat.ts`

**기능:**
- `messages`, `isLoading`, `streamingText`, `error` - 상태
- `sendMessage(userMessage, apiKey)` - 실시간 스트리밍으로 응답 수신
- `clearHistory()` - 대화 초기화
- `buildContents()` - 시스템 프롬프트 + 히스토리 + 현재 메시지 구성

**커스터마이징 포인트:**
```typescript
// SKILL_DIR/templates/hooks/useGeminiChat.ts 상단
const DEFAULT_SYSTEM_PROMPT = `당신은 유능한 AI 어시스턴트입니다.`
const DEFAULT_INITIAL_RESPONSE = '안녕하세요! 무엇을 도와드릴까요?'
```

### 4-2. 이미지 분석 훅 (선택)

`SKILL_DIR/templates/hooks/useGeminiAnalyzer.ts` → `src/hooks/useGeminiAnalyzer.ts`

**기능:**
- `analyze(imageBase64Array, apiKey)` - 1개 이상 이미지 분석 → JSON 반환
- 제네릭 타입: `useGeminiAnalyzer<CustomResultType>()` 으로 결과 타입 지정
- `onProgress` 콜백으로 진행 메시지 전달

**커스터마이징 포인트:**
```typescript
// 분석 프롬프트와 결과 타입을 프로젝트에 맞게 수정
const DEFAULT_ANALYSIS_PROMPT = `이미지를 분석하고 다음 JSON 형식으로 응답하세요:
\`\`\`json
{
  "description": "...",
  "style": "...",
  "colors": [...],
  "mood": "...",
  "tags": [...]
}
\`\`\``

export interface AnalysisResult {
  description: string
  style: string
  // TODO: 프로젝트 필요에 맞게 수정
}
```

### 4-3. 이미지 생성 훅 (선택)

`SKILL_DIR/templates/hooks/useGeminiImageGenerator.ts` → `src/hooks/useGeminiImageGenerator.ts`

**기능:**
- `generate(params, apiKey)` - 참조 이미지 기반 이미지 생성
- `ImageGenerationParams` - prompt, referenceImages, aspectRatio, imageSize, negativePrompt, seed, temperature
- 모델별 참조 이미지 제한 확인 후 15MB 초과 경고
- 500 에러 자동 재시도 (2회)
- `isRetrying` 상태로 UI에 재시도 표시 가능

**지원 옵션:**
```typescript
await generate({
  prompt: '밝고 활기찬 캐릭터',
  referenceImages: [base64String],     // 최대 10개
  model: GEMINI_MODELS.IMAGE_FAST,     // 기본값: gemini-3.1-flash-image
  aspectRatio: '1:1',                  // '1:1' | '16:9' | '9:16' | '4:3' | '3:4' 등
  imageSize: '1K',                     // '0.5K' | '1K' | '2K' | '4K'
  negativePrompt: '흐릿한, 저화질',    // 제외 요소
  seed: 42,                            // 재현용 시드
  temperature: 1.0,                    // 창의성 0.0~2.0
}, apiKey)
```

### 4-4. 번역 훅 (선택)

`SKILL_DIR/templates/hooks/useGeminiTranslator.ts` → `src/hooks/useGeminiTranslator.ts`

**기능:**
- `translateToEnglish(text, apiKey)` - 한국어 → 영어 (이미지 생성 프롬프트 최적화)
- `translateToKorean(text, apiKey)` - 영어 → 한국어
- `translateBatchToEnglish(texts, apiKey)` - 배치 번역 (10개 = 1 API 호출, 비용 90% 절감)
- `translateBatchToKorean(texts, apiKey)` - 배치 한 → 영
- `containsKorean(text)` - 한국어 포함 여부 확인 (번역 필요 여부 판단)

**배치 번역 형식:** `[1] 텍스트1\n[2] 텍스트2` 형태로 요청 후 응답 파싱

---

## 5단계: API 키 컴포넌트 설치

`SKILL_DIR/templates/components/ApiKeyInput.tsx` → `src/components/ApiKeyInput.tsx`

**기능:**
- Tauri Store에 API 키 저장/불러오기 (앱 재시작 후에도 유지)
- `AIza` 접두사 및 길이 유효성 검사
- 마스킹/비마스킹 토글
- 변경 감지 (변경 없으면 저장 버튼 비활성화)
- `loadApiKey()` / `saveApiKey()` 독립 유틸 함수 제공

**사용 예시:**
```tsx
const [apiKey, setApiKey] = useState('')

// 마운트 시 저장된 키 로드
useEffect(() => {
  loadApiKey().then(setApiKey)
}, [])

// 설정 UI
<ApiKeyInput
  onApiKeyChange={setApiKey}
  title="Google AI API 키"
  showHelp={true}
/>
```

**커스터마이징 필요 항목:**
- `STORE_FILE` 상수 - 프로젝트의 Tauri Store 파일명으로 변경 (기본: `settings.json`)
- `API_KEY_STORE_KEY` 상수 - Store 내 키 이름
- JSX 스타일 - Tailwind, CSS Module 등 프로젝트 스타일로 수정

---

## 6단계: 통합 확인

### 6-1. import 경로 확인

복사한 파일들의 import 경로가 프로젝트 구조와 일치하는지 확인:

```typescript
// geminiService.ts가 참조하는 경로
import { GEMINI_MODELS, getGenerateContentUrl, getStreamContentUrl } from '../constants/gemini'
import { parseApiError, checkFinishReason } from '../apiErrorHandler'
import { devLog } from '../utils/logger'

// 훅들이 참조하는 경로
import { generateContent, streamGenerateContent, GeminiContent } from '../lib/services/geminiService'
import { GEMINI_MODELS, GEMINI_TEXT_CONFIG } from '../lib/constants/gemini'
import { devLog } from '../lib/utils/logger'
```

경로가 다르다면 각 파일 상단의 import 경로를 수정합니다.

### 6-2. TypeScript 검증

```bash
npx tsc --noEmit
```

오류가 있으면 수정 후 재확인.

### 6-3. 동작 테스트

```typescript
// 간단한 연동 테스트
import { validateApiKey } from './lib/apiErrorHandler'
import { loadApiKey } from './components/ApiKeyInput'

// API 키 유효성 검사
const error = validateApiKey('AIzaSy...') // null이면 유효
console.log(error) // null

// 저장된 키 로드
const key = await loadApiKey()
console.log('저장된 키:', key ? '있음' : '없음')
```

---

## 완료: 통합 가이드

### 기본 사용 패턴

#### 채팅 기능
```tsx
import { useGeminiChat } from '../hooks/useGeminiChat'

function ChatComponent() {
  const [apiKey, setApiKey] = useState('')
  const { messages, isLoading, sendMessage, streamingText } = useGeminiChat({
    systemPrompt: '당신은 전문 게임 기획 컨설턴트입니다.',
  })

  const handleSend = async () => {
    await sendMessage(inputText, apiKey)
  }

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>{msg.role}: {msg.content}</div>
      ))}
      {streamingText && <div>AI: {streamingText}</div>}
      {isLoading && <span>응답 중...</span>}
    </div>
  )
}
```

#### 이미지 분석 기능
```tsx
import { useGeminiAnalyzer } from '../hooks/useGeminiAnalyzer'

// 커스텀 결과 타입
interface StyleAnalysis {
  artStyle: string
  colorPalette: string[]
  characterFeatures: string[]
}

function AnalyzerComponent() {
  const { analyze, isAnalyzing, result } = useGeminiAnalyzer<StyleAnalysis>({
    prompt: '이 이미지의 아트 스타일을 분석해주세요...',
    onProgress: (msg) => console.log(msg),
  })

  const handleAnalyze = async () => {
    const analysis = await analyze(imageBase64Array, apiKey)
    if (analysis) console.log(analysis.artStyle)
  }
}
```

#### 이미지 생성 기능
```tsx
import { useGeminiImageGenerator } from '../hooks/useGeminiImageGenerator'

function GeneratorComponent() {
  const { generate, isGenerating, result, isRetrying, error } = useGeminiImageGenerator()

  const handleGenerate = async () => {
    const result = await generate({
      prompt: 'anime style character, white background',
      referenceImages: [referenceImageBase64],
      aspectRatio: '1:1',
      imageSize: '1K',
    }, apiKey)

    if (result) {
      setGeneratedImage(result.imageBase64)
    }
  }

  return (
    <div>
      <button onClick={handleGenerate} disabled={isGenerating}>
        {isRetrying ? '재시도 중...' : isGenerating ? '생성 중...' : '생성'}
      </button>
      {error && <p className="error">{error}</p>}
      {result && <img src={result.imageBase64} alt="생성된 이미지" />}
    </div>
  )
}
```

#### 번역 기능
```tsx
import { useGeminiTranslator } from '../hooks/useGeminiTranslator'

function TranslatorComponent() {
  const { translateToEnglish, translateBatchToEnglish, containsKorean } = useGeminiTranslator()

  // 단일 번역 (이미지 생성 프롬프트)
  const handleTranslate = async () => {
    if (containsKorean(prompt)) {
      const english = await translateToEnglish(prompt, apiKey)
      setPrompt(english)
    }
  }

  // 배치 번역 (태그 목록 등 - 비용 절감)
  const handleBatchTranslate = async () => {
    const englishTags = await translateBatchToEnglish(koreanTags, apiKey)
    setTags(englishTags)
  }
}
```

---

## 사용 모델 정보

| 모델 | 용도 | 특징 |
|------|------|------|
| `gemini-3.7-flash` | 텍스트 생성, 분석, 번역, Google Search Grounding | 최신 안정 Flash 기본값 |
| `gemini-3.5-flash-lite` | 저비용 대량 번역·간단 분석 | 지연 시간·비용 최적화 |
| `gemini-3.1-flash-image` | 이미지 생성·편집 | 빠른 생성, 최대 4K |
| `gemini-3.1-flash-lite-image` | 초저지연/저비용 이미지 생성·편집 | 고빈도 인터랙티브 생성, 1K 전용 |
| `gemini-3-pro-image` | 고품질 이미지 생성·편집 | 전문 에셋 제작용 |

모델 ID는 자주 바뀐다. 이 스킬을 사용할 때는 [Gemini API 모델 문서](https://ai.google.dev/gemini-api/docs/models)와 [이미지 생성 문서](https://ai.google.dev/gemini-api/docs/image-generation)를 먼저 확인하고, 더 최신 안정 모델이 있으면 템플릿 상수와 설명을 함께 갱신한다.

---

## 자주 발생하는 문제

### API 키 오류 (401)
- `AIza`로 시작하는지 확인
- Google AI Studio (aistudio.google.com)에서 키 재발급 고려

### 스트리밍 응답 없음
- `capabilities/default.json`에 `https://generativelanguage.googleapis.com/**` 허용 여부 확인

### 이미지 생성 500 오류
- `generateContentWithRetry()` 함수로 자동 2회 재시도
- 프롬프트가 너무 짧거나 참조 이미지가 없는 경우 발생 가능

### 배치 번역 결과 누락
- `[숫자]` 형식 파싱 실패 시 원본 텍스트 유지 (폴백 처리됨)
- `devLog.warn`으로 경고 출력됨

### TypeScript 오류: `devLog` 없음
- `src/lib/utils/logger.ts` 생성 여부 확인 (1단계 3-3 참조)

---

## 파일 구조 요약

```
src/
├── lib/
│   ├── constants/
│   │   └── gemini.ts              # 모델, 설정 상수
│   ├── services/
│   │   └── geminiService.ts       # REST API 핵심 (스트리밍 포함)
│   ├── utils/
│   │   └── logger.ts              # devLog (기존 없을 경우 생성)
│   └── apiErrorHandler.ts         # HTTP 에러 처리
├── hooks/
│   ├── useGeminiChat.ts           # 채팅/스트리밍 (선택)
│   ├── useGeminiAnalyzer.ts       # 이미지 분석 (선택)
│   ├── useGeminiImageGenerator.ts # 이미지 생성 (선택)
│   └── useGeminiTranslator.ts     # 번역 (선택)
└── components/
    └── ApiKeyInput.tsx            # API 키 관리 UI
```
