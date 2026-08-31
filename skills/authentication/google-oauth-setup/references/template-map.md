# 템플릿 적용 안내

템플릿은 프로젝트 구조와 의존성을 확인한 뒤 필요한 파일만 복사·병합한다. 기존 파일을 통째로 덮어쓰지 않는다.

| 템플릿 | 용도 | 적용 시 주의 |
| --- | --- | --- |
| `assets/tauri-v2/backend/oauth_loopback.rs.template` | 임의 포트 loopback listener와 PKCE/state/nonce 생성 | token 교환·ID token 검증·보안 저장은 같은 Rust 계층에 추가한다. |
| `assets/tauri-v2/frontend/authService.ts.template` | 민감 값이 없는 최소 프런트엔드 bridge | 공개 사용자 정보만 반환하도록 Rust 명령 타입과 맞춘다. |
| `assets/tauri-v2/capabilities/default.json` | backend opener 구조의 최소 capability 예시 | 기존 window label과 실제 필요한 core/plugin 권한을 병합한다. |
| `assets/tauri-v2/tauri-security.json` | backend 네트워크 구조의 CSP 조각 | 기존 앱의 asset/font/image 요구에 맞춰 좁게 확장한다. |
| `assets/tauri-v2/oauth.env.example` | 공개 client 설정 예시 | `client_secret`이나 토큰 필드를 추가하지 않는다. |

Rust loopback 템플릿 의존성은 프로젝트의 현재 호환 버전으로 추가한다: `base64`, `rand`, `sha2`, `tokio`의 net/io/time 기능, `url`. 버전은 템플릿에 고정하지 말고 프로젝트 lockfile과 각 crate의 현재 문서를 확인한다.

Tauri 통합 시 Rust 명령은 다음 책임을 가진다.

1. 중복 인증 방지 lock을 잡는다.
2. `OAuthAttempt::bind()` 후 authorization URL을 만든다.
3. 공식 opener plugin의 Rust API로 시스템 브라우저를 연다.
4. 전체 timeout과 취소 신호를 두고 callback을 기다린다.
5. Rust HTTP client로 code를 교환한다.
6. OIDC discovery/JWKS 기반으로 ID token을 검증한다.
7. refresh token을 보안 저장소에 기록하고 공개 사용자 정보만 반환한다.

logout 명령과 revoke 명령은 분리한다. revoke는 외부 권한을 변경하므로 사용자 의도를 확인하는 UI 뒤에서만 실행한다.
