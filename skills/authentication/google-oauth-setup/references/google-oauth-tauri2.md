# Google OAuth와 Tauri 2 보안 기준

2026-08-31에 Google 및 Tauri 공식 문서를 기준으로 검토한 데스크톱 앱용 기준이다. 구현 전 공식 문서의 최신 상태도 다시 확인한다.

## Google 설치형 앱 흐름

- Desktop app OAuth client를 사용한다. 설치형 앱은 비밀을 유지할 수 없는 public client다.
- 시스템 브라우저에서 Authorization Code 흐름을 사용한다. 임베디드 user-agent는 사용하지 않는다.
- loopback은 데스크톱에서 지원되는 권장 방식이다. `127.0.0.1` 또는 `[::1]`의 임의 가용 포트를 사용한다. `localhost`는 방화벽과 이름 해석 문제를 피하기 위해 기본값으로 쓰지 않는다.
- OOB 수동 복사 방식은 지원 종료 상태다. custom URI scheme도 Google의 현재 설치형 앱 문서에서 앱 사칭 위험으로 지원하지 않는 방향이므로 새 데스크톱 기본값으로 삼지 않는다.
- PKCE verifier는 요청마다 43~128자의 고엔트로피 문자열로 생성하고 `S256`을 사용한다.
- `state`는 CSRF 방지용으로 요청마다 생성하고 callback에서 필수로 비교한다.
- `openid` scope를 요청한다면 재생 공격 방지를 위해 `nonce`를 요청마다 만들고 검증된 ID 토큰 claim과 비교한다.

공식 문서:

- https://developers.google.com/identity/protocols/oauth2/native-app
- https://developers.google.com/identity/openid-connect/openid-connect
- https://developers.google.com/identity/protocols/oauth2/policies

## client_secret

Google의 설치형 앱 token endpoint 문서에서 `client_secret`은 선택 사항이며, 설치형 앱은 secret을 기밀로 유지할 수 없다고 명시한다.

- `client_secret`을 `VITE_*`, TypeScript 상수, WebView 저장소, 공개 로그에 넣지 않는다.
- 프로토콜 또는 기존 credential 때문에 값을 전달하더라도 복제 가능한 앱 바이너리에 포함되는 식별 정보일 뿐 인증 보안 경계가 아니다.
- PKCE와 엄격한 redirect/state 검증을 secret으로 대체하지 않는다.
- 외부의 기밀 backend가 실제로 있는 아키텍처라면 Desktop client 흐름과 섞지 말고 Web server client 흐름을 별도로 설계한다.

## callback 서버 수명주기

1. 브라우저를 열기 전에 `127.0.0.1:0`에 bind한다.
2. 실제 포트를 포함한 redirect URI를 authorization 요청과 token 교환에 동일하게 사용한다.
3. `GET`과 지정 callback path만 처리하고 요청 헤더 크기와 연결별 읽기 시간을 제한한다.
4. callback path의 `state`가 없거나 다르면 코드를 교환하지 않는다. 잘못된 선행 요청에는 오류 응답 후 전체 deadline까지 정상 callback을 계속 기다린다.
5. 성공 또는 Google이 반환한 거부 오류에는 코드·토큰을 포함하지 않은 정적 HTML을 응답한다. `Cache-Control: no-store`, 제한적 CSP, `Connection: close`를 사용한다.
6. 성공, 올바른 state와 함께 온 provider 오류, 사용자 취소, 앱 종료, 전체 timeout에서 listener와 인증 상태를 정리한다.
7. 동시 로그인을 하나로 제한하거나 각 시도를 명시적 식별자로 격리한다.
8. authorization code, verifier, state, nonce, token을 로그에 남기지 않는다.

`assets/tauri-v2/backend/oauth_loopback.rs.template`은 이 수명주기의 독립적인 loopback 부분을 제공한다. token exchange와 검증은 프로젝트의 HTTP/OIDC 계층에 연결한다.

## ID 토큰과 사용자 식별

Base64URL payload decode는 검증이 아니다. 프로덕션에서는 Google OIDC discovery의 `jwks_uri`를 사용해 서명을 로컬 검증하고 키를 HTTP cache header에 맞춰 캐시한다.

필수 검증:

- 허용된 서명 알고리즘과 Google 공개키에 대한 서명
- `iss`가 `https://accounts.google.com` 또는 `accounts.google.com`
- `aud`가 이 앱의 client ID
- `exp`가 현재 시각 이후이며 허용 가능한 clock skew만 적용
- 요청에 넣은 `nonce`와 claim이 정확히 일치하고 한 번만 사용됨
- Workspace 제한 시 `hd`가 정확히 허용 도메인과 일치
- 이메일을 권한 판단에 쓰면 `email_verified`도 확인

사용자의 영구 식별자는 `sub`다. 이메일 suffix 검사는 `hd` 검증의 대체가 아니며, `hd` authorization 파라미터는 계정 선택 UI 힌트일 뿐이다. `tokeninfo` endpoint는 디버깅용이며 프로덕션 검증 경로로 사용하지 않는다.

## 토큰 교환, 갱신, 저장, 폐기

- token endpoint 호출은 Rust에서 수행하고, 응답의 `expires_in`, `scope`, `token_type`, 선택적 `refresh_token_expires_in`을 처리한다. 알 수 없는 응답 필드는 무시한다.
- access token은 가능하면 메모리에만 두고 만료 전에 refresh한다. refresh token은 Rust 전용 secret backend나 운영체제 보안 credential 저장소처럼 위협 모델에 맞는 장기 보안 저장소에 둔다.
- 일반 Tauri Store는 설정 영속화 도구이지 refresh token 보안 저장소로 간주하지 않는다.
- 공식 Stronghold 문서의 사용 예시는 JavaScript API이므로 그대로 적용하면 secret이 WebView 경계를 지난다. backend-only 기본 구조와 충돌하는지 먼저 평가하고, Stronghold를 선택하면 Rust 전용 adapter 또는 매우 좁은 전용 window/capability를 설계한다. vault 암호를 소스에 하드코딩하지 않는다.
- refresh 응답에 새 refresh token이 없으면 기존 값을 유지한다. 새 값이 있으면 원자적으로 교체한다.
- `invalid_grant` 또는 폐기·만료된 refresh token은 저장소에서 지우고 재인증을 요구한다. refresh token 수명을 고정된 기간으로 가정하지 않는다.
- 로컬 로그아웃은 로컬 토큰 삭제다. 연결 해제는 `https://oauth2.googleapis.com/revoke`를 호출하는 별도 사용자 의도이며 프로젝트의 다른 client token에도 영향을 줄 수 있음을 알린다.
- Google의 현재 설치형 앱 문서는 DPoP를 선택적 강화로 권장한다. 채택한다면 장치 전용 개인키, 요청별 proof, nonce 재시도, refresh 경로까지 완결되게 구현하고 일부 요청에만 섞지 않는다.

공식 문서:

- https://developers.google.com/identity/protocols/oauth2/native-app#exchange-authorization-code
- https://developers.google.com/identity/protocols/oauth2/native-app#offline
- https://developers.google.com/identity/protocols/oauth2/native-app#tokenrevoke
- https://v2.tauri.app/plugin/stronghold/

## Tauri 2 경계

- 인증 명령은 `#[tauri::command]`로 만들고 `tauri::generate_handler!`에 등록한다. 민감 값은 명령 반환값이나 event payload에 포함하지 않는다.
- 시스템 브라우저는 공식 opener plugin을 Rust에서 호출할 수 있다. 이 경우 frontend capability에 `opener:*`를 허용할 이유가 없다.
- 프런트엔드가 정말 `openUrl`을 호출해야 한다면 `opener:allow-open-url`을 `https://accounts.google.com/*`로 scope하고 임의 URL 권한을 주지 않는다.
- capability는 `src-tauri/capabilities/`의 별도 JSON/TOML 파일로 관리하고 해당 window/webview만 지정한다. 여러 capability에 속한 window는 권한 합집합을 얻는다는 점을 점검한다.
- token endpoint와 JWKS 호출을 Rust에서 하면 WebView CSP의 `connect-src`에 Google 도메인이나 loopback 주소를 추가하지 않는다.
- CSP를 앱에 맞춰 활성화하고 최소화한다. 원격 script/CDN을 인증 구현 편의를 위해 허용하지 않는다.

공식 문서:

- https://v2.tauri.app/develop/calling-rust/
- https://v2.tauri.app/plugin/opener/
- https://v2.tauri.app/security/capabilities/
- https://v2.tauri.app/security/permissions/
- https://v2.tauri.app/security/csp/

## 검증 기준

- `cargo fmt --check`, `cargo check`, 프런트엔드 타입 검사, 프로젝트 테스트, `tauri build --debug` 또는 동등한 비파괴 빌드를 실행한다.
- mock 테스트에서 정상 code, provider error, state 누락·불일치, 잘못된 path, timeout, 취소, 중복 시작을 다룬다.
- ID token verifier에는 변조 서명, 잘못된 issuer/audience, 만료, nonce 불일치, 허용되지 않은 `hd` fixture를 넣는다.
- 저장·갱신 테스트는 실제 토큰 값을 출력하지 않고 저장소 키의 존재와 삭제만 확인한다.
- 실제 Google login은 사용자 자격증명과 Cloud Console 설정이 필요한 별도 검증으로 보고한다.
