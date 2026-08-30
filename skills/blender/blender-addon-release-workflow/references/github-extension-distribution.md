# GitHub 기반 Blender Extension 배포

## 1. 식별자와 저장소 이름 확정

- `blender_manifest.toml`의 `id`는 Python 모듈명으로 안전하고 기존 공개 Extension과 겹치지 않게 정한다.
- 공개 저장소는 `zzamjak-cloud/<Project>-Blender`처럼 Blender 프로젝트임을 드러내는 이름을 우선한다.
- `gh repo view`와 로컬 remote를 확인해 유사한 저장소를 새로 만들거나 잘못된 원격에 push하지 않는다.

## 2. 로컬 배포 구조 준비

- 매니페스트, 라이선스, README, 변경 이력, 패키지 빌드 스크립트를 준비한다.
- 패키지에는 실행에 필요한 파일만 포함하고 `.git`, CI 설정, 테스트, 개발 스크립트, 캐시와 빌드 산출물을 제외한다.
- 공식 Blender CLI의 `extension validate`로 소스와 생성 ZIP을 모두 검사한다.
- CI에서 Python 회귀 검사와 Blender 런타임 smoke test를 실행한다.

## 3. 공개 GitHub 저장소 생성

현재 사용자 요청이 생성과 push를 승인했을 때만 진행한다.

1. `gh auth status`로 대상 계정을 확인한다.
2. `zzamjak-cloud/<repo-name>`의 존재 여부와 공개 범위를 확인한다.
3. 존재하지 않을 때만 공개 저장소를 만들고 정확한 `origin`을 설정한다.
4. 보호해야 할 로컬 변경을 섞지 않고 초기 커밋과 기본 브랜치를 push한다.

저장소가 이미 있으면 재생성하지 않고 remote URL과 기본 브랜치만 정합화한다.

## 4. 링크 배포와 자동 업데이트 구축

다음 세 워크플로를 분리한다.

- 검사: push와 pull request에서 정적·Blender 런타임 검사를 수행한다.
- 릴리스: 새 버전 태그에서 `<addon-id>-v<version>.zip` 자산을 생성해 GitHub Release에 첨부한다.
- 원격 저장소: 릴리스 성공 후 모든 호환 ZIP을 모아 Blender의 `extension server-generate`로 `index.json`을 만들고 GitHub Pages에 배포한다.

사용자용 저장소 URL은 기본적으로 다음 형식이다.

```text
https://zzamjak-cloud.github.io/<RepoName>/index.json
```

README에는 Blender의 **Get Extensions > Repositories > Add Remote Repository** 등록법과 **Check for Updates on Startup** 활성화 방법을 적는다. 개발 프로필의 로컬 심링크와 사용자 프로필의 원격 설치를 명확히 구분한다.

“자동 업데이트”는 시작 시 새 버전을 자동 확인해 알리는 기능을 뜻한다. 업데이트 설치에는 사용자의 승인이 필요하며 무인 자동 설치라고 안내하지 않는다.

## 5. 릴리스

릴리스 요청이 명시되었을 때만 다음을 수행한다.

1. 매니페스트, `bl_info`, 테스트 기대값, README와 변경 이력의 버전을 함께 맞춘다.
2. 로컬 테스트, 격리 Blender 런타임 테스트, Extension 검증을 통과한다.
3. 범위가 확인된 파일만 커밋하고 push한다.
4. 원격에 없는 새 버전 태그만 생성해 push한다.
5. 검사, 릴리스, Pages 작업이 성공할 때까지 확인한다.
6. Release 자산의 이름·크기·해시와 Pages `index.json`의 버전·URL을 확인한다.
7. 별도의 깨끗한 배포 인수 프로필에서 Pages 원격 저장소를 등록하고 이전 버전 설치 → 동기화 → 새 버전 업데이트 제공 → 업데이트 완료를 검증한다.

개발 중간 커밋마다 태그나 Release를 만들지 않는다. 배포 전 검사는 항상 격리 개발 프로필에서 수행한다.

프로필은 다음처럼 분리한다.

- 일상 프로필: 기본적으로 변경하지 않는다. 변경이 필요하면 별도의 명시적 승인을 받는다.
- 개발 프로필: 로컬 소스 심링크로 반복 개발과 기능 검증을 수행한다.
- 배포 인수 프로필: GitHub Pages 원격 설치와 버전 업데이트를 검증하며 로컬 소스 심링크를 사용하지 않는다.
