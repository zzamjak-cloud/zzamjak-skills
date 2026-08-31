# 선택 기능과 최소 권한

## Tailwind CSS

사용자가 요청한 경우에만 [Tailwind의 Vite 설치법](https://tailwindcss.com/docs/installation/using-vite)을 따른다. Tailwind 4의 기본 구성은 다음 두 패키지로 충분하다.

```bash
npm install tailwindcss @tailwindcss/vite
```

기존 `vite.config.ts`의 React 플러그인과 Tauri 서버 설정을 보존하면서 `tailwindcss()`를 플러그인 배열에 추가한다. 앱이 불러오는 CSS 엔트리에는 다음을 추가한다.

```css
@import "tailwindcss";
```

Tailwind 4에서는 기본 설치에 `tailwind.config.js`, PostCSS, Autoprefixer, `npx tailwindcss init -p`, `@tailwind base/components/utilities`가 필요하지 않다. Typography가 실제로 필요할 때만 `@tailwindcss/typography`를 설치하고 CSS에 `@plugin "@tailwindcss/typography";`를 추가한다.

## Tauri 플러그인

기능이 필요한 경우 [Tauri CLI](https://v2.tauri.app/reference/cli/#add)의 공식 추가 명령을 우선한다.

```bash
npm run tauri add <plugin-name>
```

이 명령이 바꾼 프런트엔드 패키지, `Cargo.toml`, `src-tauri/src/lib.rs`, Capability를 함께 검토한다. 플러그인별 공식 문서에서 지원 플랫폼, Rust 요구 버전, 초기화 방식, 기본 권한을 확인한다.

- Store, fs, dialog, HTTP, updater, process, deep-link, opener를 한꺼번에 설치하지 않는다.
- 일반 웹 `fetch`로 충분하면 HTTP 플러그인을 추가하지 않는다. 네이티브 HTTP가 필요하면 허용 URL을 실제 API 호스트로 제한한다.
- 업데이터는 서명 키와 실제 업데이트 엔드포인트가 준비된 별도 배포 작업에서 추가한다.
- OAuth, Gemini 등 특정 기능용 SDK와 Rust 서버 의존성은 해당 기능 작업에서만 추가한다. 프로젝트 초기화가 AI 공급자를 미리 선택하지 않는다.
- 프로젝트 고유 상태 관리·UI 유틸리티·공통 훅은 요구사항이 아니면 생성하지 않는다.

## Capability

[Capabilities](https://v2.tauri.app/security/capabilities/)는 `src-tauri/capabilities`의 JSON·TOML 파일로 창과 WebView별 권한 경계를 만든다. [Permissions](https://v2.tauri.app/security/permissions/)에서 실제 식별자를 확인한다.

- 생성기가 만든 기본 Capability에서 시작한다.
- 권한 세트와 개별 권한을 중복 나열하지 않는다.
- 파일 시스템과 HTTP 권한에는 필요한 경로·URL만 scope로 허용한다.
- 여러 Capability에 포함된 창은 권한이 합쳐지므로 중복 소속을 검토한다.
- remote URL 접근은 기본적으로 추가하지 않는다. 원격 콘텐츠가 필요한 경우 운영체제별 보안 한계를 검토하고 최소 명령만 별도 Capability로 노출한다.
- Capability를 `tauri.conf.json`에 명시하면 그 목록만 활성화된다는 점을 확인한다.

## 검증

플러그인 추가 후 다음을 확인한다.

```bash
npm run build
npm run tauri info
cargo check --manifest-path src-tauri/Cargo.toml
```

권한 누락은 정적 빌드만으로 드러나지 않을 수 있다. 해당 API를 실제 Tauri WebView에서 호출해 성공·거부 동작을 검증하고, 수행하지 못했다면 미검증으로 보고한다.

## 공식 출처

- [Tailwind CSS with Vite](https://tailwindcss.com/docs/installation/using-vite)
- [Tailwind CSS directives](https://tailwindcss.com/docs/functions-and-directives#plugin-directive)
- [Tauri features and plugins](https://v2.tauri.app/plugin/)
- [Tauri CLI add](https://v2.tauri.app/reference/cli/#add)
- [Tauri capabilities](https://v2.tauri.app/security/capabilities/)
- [Tauri permissions](https://v2.tauri.app/security/permissions/)
