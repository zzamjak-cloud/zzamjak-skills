---
name: tauri-project-setup
description: Tauri 2와 Vite, React, TypeScript로 새 데스크톱 앱을 만들거나 기존 프런트엔드에 Tauri를 안전하게 추가할 때 사용한다. 기능 구현, 일반 React 수정, Tauri 1 마이그레이션에는 사용하지 않는다.
---

# Tauri 프로젝트 설정

공식 생성기를 기준으로 최소 구성부터 만들고, 사용자가 요청한 기능만 추가한다.

## 불변 조건

- 작업 전에 대상 경로와 Git 상태를 확인한다. 기존 파일이나 비어 있지 않은 디렉터리를 덮어쓰지 않으며 `--force`를 사용하지 않는다.
- 명령 실행 직전에 Tauri·Vite·Tailwind 공식 문서와 CLI 도움말을 확인한다. `latest`가 만드는 버전과 스키마를 정적 템플릿으로 재정의하지 않는다.
- 새 프로젝트는 `create-tauri-app`의 `react-ts` 템플릿을 사용한다. 기존 프로젝트는 현재 매니페스트와 빌드 설정을 보존한 채 Tauri CLI로 초기화한다.
- 플러그인, 권한, Tailwind, 상태 관리, UI 라이브러리, AI SDK는 요구가 있을 때만 추가한다.
- Capability는 창·플랫폼·URL 범위를 좁히고 필요한 권한만 허용한다. 원격 콘텐츠에는 Tauri API 접근을 기본 허용하지 않는다.
- 패키지·Rust 크레이트·플러그인 등록을 수동으로 따로 맞추기보다 공식 CLI를 우선 사용한다.
- 완료 전 프런트엔드 빌드와 Rust 검사를 모두 통과시킨다. 플랫폼 번들 검증을 생략하면 그 범위를 명시한다.

## 작업 라우팅

- 새 React 프로젝트 생성 또는 기존 Vite 프로젝트 통합: [references/project-setup.md](references/project-setup.md)를 읽는다.
- Tailwind 추가, Tauri 플러그인, Capability나 보안 설정 변경: [references/extensions-and-security.md](references/extensions-and-security.md)를 추가로 읽는다.

요구사항이 충분하면 질문을 반복하지 않는다. 앱 이름, 번들 식별자, 대상 경로처럼 결과를 바꾸는 값만 확인한다.

## 완료 기준

- 생성·수정 범위가 사용자 요청과 일치한다.
- lockfile을 포함한 의존성이 설치되고 `npm run build`와 `cargo check --manifest-path src-tauri/Cargo.toml`이 성공한다.
- Tauri CLI가 생성한 설정, Rust 진입점, Capability가 서로 일치한다.
- 추가 플러그인은 프런트엔드 패키지, Rust 크레이트, 초기화 코드, 권한이 모두 연결되어 있다.
- 실제 대상 플랫폼의 `tauri build` 또는 `tauri dev`를 실행하지 못했다면 미검증으로 보고한다.
