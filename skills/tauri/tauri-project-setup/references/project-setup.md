# 프로젝트 생성과 기존 프로젝트 통합

## 사전 확인

1. 대상 경로의 존재 여부, 내용, Git 상태를 확인한다. 미커밋 변경이 있으면 사용자 방침 없이 덮어쓰거나 정리하지 않는다.
2. [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)에서 현재 운영체제 의존성을 확인한다. macOS는 Xcode Command Line Tools, Windows는 C++ Build Tools와 WebView2, Linux는 배포판별 WebKitGTK 계열 패키지가 필요하다.
3. `node --version`, `npm --version`, `rustup show active-toolchain`, `rustc --version`, `cargo --version`을 확인한다. Node는 현재 LTS를 우선하고, 최소한 [Vite가 요구하는 범위](https://vite.dev/guide/)인 20.19+ 또는 22.12+를 만족해야 한다. Rust는 stable을 사용하고 실제 요구 버전은 생성된 의존성의 `cargo check`로 판정한다.
4. `npm create tauri-app@latest -- --help`로 지원 옵션을 확인한다. 이 문서 작성 시점의 검증 대상은 Tauri 2와 `react-ts`, npm이다.

도구 설치나 전역 툴체인 업데이트가 필요하면 먼저 사용자 승인 범위인지 확인한다.

## 새 프로젝트

앱 이름은 안전한 npm/Cargo 이름으로, 식별자는 역도메인 형식으로 정한다. 대상 경로가 없을 때 다음 형태를 사용한다.

```bash
npm create tauri-app@latest <app-name> -- \
  --template react-ts \
  --manager npm \
  --identifier <com.example.app> \
  --tauri-version 2 \
  --yes
```

- 기존 경로에는 실행하지 않는다. `--force`로 비어 있지 않은 디렉터리를 덮어쓰지 않는다.
- 생성 후 `npm install`을 실행하고 생성기가 만든 `package.json`, `Cargo.toml`, `tauri.conf.json`, `capabilities`를 기준선으로 유지한다.
- 제품명, 창 제목과 크기 같은 요청값만 스키마에 맞게 편집한다. 업데이터, 딥링크, 네트워크 권한, 임의 번들 타깃은 자동 추가하지 않는다.

## 기존 Vite + React 프로젝트

먼저 `package.json`, `vite.config.*`, 빌드 출력 디렉터리, 개발 서버 포트, `src-tauri` 존재 여부를 확인한다.

- `src-tauri`가 이미 있으면 `tauri init --force`를 실행하지 않는다. 현재 Tauri 버전과 설정을 진단하고 필요한 부분만 수정한다.
- `src-tauri`가 없을 때 [Tauri manual setup](https://v2.tauri.app/start/create-project/#manual-setup-tauri-cli)에 따라 CLI를 추가하고 대화형 초기화를 실행한다.

```bash
npm install -D @tauri-apps/cli@latest
npx tauri init
```

Vite 기본값이면 개발 URL은 `http://localhost:5173`, 프런트엔드 출력은 `../dist`, 명령은 `npm run dev`와 `npm run build`이다. 실제 프로젝트 설정이 다르면 그 값을 사용한다. Vite 감시에서 `**/src-tauri/**`를 제외하되 기존 플러그인과 서버 설정은 보존한다.

## 검증

```bash
npm install
npm run build
npm run tauri info
cargo check --manifest-path src-tauri/Cargo.toml
```

가능하면 대상 OS에서 `npm run tauri build -- --no-bundle` 또는 `npm run tauri dev`까지 확인한다. CI·헤드리스 환경에서 창 실행이나 번들 생성이 불가능하면 프런트엔드 빌드와 `cargo check` 결과까지만 확인했다고 보고한다.

## 공식 출처

- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
- [Create a Tauri project](https://v2.tauri.app/start/create-project/)
- [create-tauri-app](https://github.com/tauri-apps/create-tauri-app)
- [Tauri with Vite](https://v2.tauri.app/start/frontend/vite/)
- [Vite getting started](https://vite.dev/guide/)
