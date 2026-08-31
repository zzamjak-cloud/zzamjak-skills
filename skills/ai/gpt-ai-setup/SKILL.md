---
name: gpt-ai-setup
description: Tauri + React 프로젝트에 OpenAI GPT 기반 텍스트 생성, 스트리밍, 비전 분석, 이미지 생성, 번역 기능을 통합하거나 최신 OpenAI 모델로 갱신할 때 사용한다.
metadata:
  short-description: Tauri 앱에 OpenAI GPT API 기능 통합
---

# GPT AI Setup

## 역할

Tauri + React 프로젝트에 OpenAI API 기반 AI 기능을 통합한다. 기본 통합은 Responses API를 우선 사용하고, 단일 이미지 생성·편집은 Images API를 사용한다.

## 먼저 확인할 것

- 작업 시작 시 OpenAI 공식 문서의 모델 목록과 Responses API 문서를 확인한다.
- 새 프로젝트라면 OpenAI API 키를 프런트엔드 번들에 넣지 않는다. Tauri 앱에서는 Rust command나 로컬 백엔드에서 API를 호출하는 구조를 우선 검토한다.
- 사용자가 명시적으로 로컬 개인용 앱의 클라이언트 직접 호출을 원할 때만 템플릿의 TypeScript REST 호출을 그대로 쓴다.
- 기존 프로젝트에 `OpenAI`, `Responses API`, `Chat Completions`, `Assistants API` 구현이 있으면 현재 구조를 먼저 확인하고, 신규 템플릿을 덮어쓰지 않는다.

## 모델 기준

기본 모델 상수는 템플릿에 포함되어 있지만, 사용 시점의 공식 문서가 우선이다.

- `gpt-5.6` 또는 `gpt-5.6-sol`: 복잡한 추론, 코딩, 고품질 텍스트 기본값
- `gpt-5.6-terra`: 품질과 비용 균형
- `gpt-5.6-luna`: 비용 민감·대량 처리
- `gpt-image-2`: 이미지 생성·편집 기본값

참고 문서:

- [OpenAI Models](https://developers.openai.com/api/docs/models)
- [Text generation](https://developers.openai.com/api/docs/guides/text)
- [Responses API](https://developers.openai.com/api/reference/responses/overview)
- [Image generation](https://developers.openai.com/api/docs/guides/image-generation)

## 기능 선택

핵심 파일은 항상 설치한다.

- `templates/lib/constants/openai.ts`
- `templates/lib/openaiErrorHandler.ts`
- `templates/lib/services/openaiService.ts`
- `templates/components/OpenAIApiKeyInput.tsx`

선택 기능은 요청된 것만 설치한다.

- 채팅/스트리밍: `templates/hooks/useOpenAIChat.ts`
- 비전 분석/JSON 추출: `templates/hooks/useOpenAIAnalyzer.ts`
- 이미지 생성: `templates/hooks/useOpenAIImageGenerator.ts`
- 번역: `templates/hooks/useOpenAITranslator.ts`

## Tauri 권장 구조

프로덕션 앱에서는 다음 구조를 우선한다.

1. 프런트엔드는 사용자 입력, 진행 상태, 결과 표시만 담당한다.
2. API 키는 Tauri Store보다 OS 보안 저장소 또는 Stronghold를 우선 검토한다.
3. OpenAI API 호출은 Rust command 또는 로컬 백엔드에서 수행한다.
4. 프런트엔드가 직접 호출해야 한다면 개인용 로컬 앱인지 확인하고, API 키 노출 위험을 사용자에게 알린다.

Tauri HTTP 플러그인을 직접 사용할 경우 `https://api.openai.com/**`만 최소 허용한다.

## 통합 절차

1. `package.json`, `src-tauri`, 기존 `src/lib/services` 구조를 확인한다.
2. 프로젝트 구조에 맞춰 템플릿 파일을 복사한다.
3. import 경로와 UI 스타일을 기존 코드 스타일에 맞춘다.
4. 모델 상수는 공식 문서 기준으로 최신 안정 모델을 확인해 갱신한다.
5. TypeScript 검증을 실행한다.

```bash
npx tsc --noEmit
```

## 검증 기준

- `OPENAI_API_KEY`, `VITE_OPENAI_API_KEY` 같은 빌드 타임 공개 키가 추가되지 않았는지 확인한다.
- Responses API 요청은 `model`, `input`, 필요 시 `stream` 또는 `text.format`을 명시한다.
- 이미지 생성은 단일 생성이면 Images API, 대화형 이미지 편집이면 Responses API image generation tool을 검토한다.
- 오류 처리는 401, 403, 429, 500, 503을 구분한다.
- 실제 API 호출 검증은 사용자의 키와 비용 승인이 있을 때만 진행한다.
