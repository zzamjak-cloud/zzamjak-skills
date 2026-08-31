---
name: google-oauth-setup
description: Tauri 2 데스크톱 앱의 Google OAuth 2.0·OpenID Connect 로그인을 구현, 감사, 마이그레이션한다. 웹 서버 앱이나 Android/iOS 인증에는 사용하지 않는다.
---

# Google OAuth for Tauri 2

Tauri 2 데스크톱 앱에 Google의 설치형 앱 Authorization Code 흐름을 적용한다. 인증 UI는 시스템 브라우저에서 열고, OAuth 코드·토큰·검증 로직은 Rust 백엔드에 둔다.

## 먼저 확인할 것

- 대상이 Tauri 2의 macOS, Linux, Windows 데스크톱 앱인지 확인한다. 모바일 또는 웹 서버 앱이면 해당 플랫폼의 공식 흐름을 사용한다.
- 프로젝트의 패키지 관리자, Tauri 버전, 기존 명령·플러그인·CSP·capability·비밀 저장 방식을 먼저 조사한다.
- 변경 전에 [Google OAuth와 Tauri 2 보안 기준](references/google-oauth-tauri2.md)을 읽는다.
- 템플릿을 적용할 때만 [템플릿 적용 안내](references/template-map.md)를 읽는다.

## 구현 원칙

- Google Cloud에서 OAuth 클라이언트 유형을 `Desktop app`으로 만든다.
- `127.0.0.1:0`에 먼저 bind하고 운영체제가 고른 임의 포트를 실제 `redirect_uri`에 사용한다. `localhost`, 고정 포트, 외부 인터페이스 bind를 기본값으로 삼지 않는다.
- 요청마다 고엔트로피 PKCE verifier, `S256` challenge, `state`, OIDC `nonce`를 새로 만든다.
- callback의 `state`가 반드시 존재하고 정확히 일치한 뒤에만 코드를 교환한다. ID 토큰은 서명과 `iss`, `aud`, `exp`, `nonce`를 검증하고, Workspace 제한이 있으면 `hd`도 검증한다.
- 사용자 키는 이메일이 아니라 검증된 `sub`를 사용한다. `hd` 요청값은 힌트일 뿐 접근 제어가 아니다.
- 토큰 교환, 갱신, 폐기와 refresh token 저장은 Rust에서 처리한다. 토큰을 WebView, `VITE_*`, localStorage, 일반 Tauri Store, 프런트엔드 로그로 보내지 않는다.
- 데스크톱 앱은 비밀을 지킬 수 없는 public client다. `client_secret`을 보안 경계로 취급하거나 프런트엔드 번들에 넣지 않는다.
- 브라우저는 임베디드 WebView가 아니라 시스템 기본 브라우저로 연다.
- callback 서버는 성공, 사용자 거부, 명시적 취소, 전체 제한시간 도달 시 종료한다. 잘못된 state의 선행 요청 하나가 정상 인증을 중단시키지 않게 한다.
- Tauri capability는 실제 프런트엔드 호출에 필요한 권한만 준다. Rust에서 opener를 호출하면 프런트엔드 `opener` 권한을 추가하지 않는다.
- CSP를 `null`로 두거나 `https:` 전체를 허용하지 않는다. Google 네트워크 호출이 Rust에만 있으면 WebView `connect-src`에 Google 도메인을 추가하지 않는다.

## 작업 흐름

1. 기존 구현을 보안 기준표와 대조해 위험한 토큰·secret 노출, 고정 포트, 단순 JWT decode, 느슨한 state 검증을 제거한다.
2. 프로젝트의 기존 아키텍처를 보존하면서 Rust 백엔드에 인증 시도 상태, loopback listener, 토큰 교환·검증·보안 저장을 통합한다.
3. `tauri::generate_handler!`에 명령을 등록하고, 필요한 공식 플러그인만 초기화한다. 프런트엔드는 공개 사용자 정보와 성공·실패 상태만 받는다.
4. Google Cloud Console에서 Desktop client, 동의 화면, 테스트 사용자, 최소 scope를 설정하도록 사용자에게 남은 수동 단계를 정확히 안내한다.
5. 프로젝트의 포매터, 타입 검사, Rust 검사, Tauri 빌드를 실행한다.

## 완료 검증

- listener가 브라우저보다 먼저 준비되고 매 시도 포트가 동적으로 정해지는지 확인한다.
- 정상 callback, state 누락·불일치, provider 거부, 무관한 loopback 요청, 취소, timeout을 테스트한다.
- PKCE verifier/challenge와 state/nonce가 시도마다 달라지고 재사용되지 않는지 확인한다.
- 변조·오류 audience·만료·오류 nonce의 ID 토큰이 거부되는지 검증한다. `tokeninfo`는 디버깅에만 사용한다.
- refresh 성공, `invalid_grant` 후 보안 저장소 삭제와 재로그인, 로컬 로그아웃, 명시적 Google 권한 폐기를 구분해 테스트한다.
- 저장소와 빌드 산출물에서 `client_secret`, access token, refresh token이 노출되지 않는지 검색한다.
- capability와 CSP가 필요한 최소 범위인지 확인한다.
- 실제 Google 로그인이 자격증명 때문에 불가능하면 mock callback과 정적·빌드 검증 결과를 보고하고, 미검증 항목을 명시한다.
