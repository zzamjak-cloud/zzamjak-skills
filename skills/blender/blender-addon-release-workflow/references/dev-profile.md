# 격리 개발 프로필

## 목적

기능을 수정할 때마다 릴리스 ZIP이나 GitHub 배포본을 다시 설치하지 않는다. 저장소 소스를 전용 Blender 사용자 리소스에 심링크하고, 실제 Blender에서 즉시 다시 로드해 검사한다.

## 공통 산출물

Blender 애드온 개발 프로젝트에는 현재 개발 호스트와 관계없이 다음 실행기 세트를 모두 만든다.

```text
scripts/dev_run.sh       macOS 격리 프로필 실행기
scripts/dev_run.ps1      Windows 포터블 프로필 실행기
scripts/dev_run.bat      Windows 명령 프롬프트 래퍼
scripts/dev_bootstrap.py 양쪽 실행기가 공유하는 Extension 활성화 코드
```

- 한 운영체제에서만 개발하더라도 다른 운영체제 파일을 생략하지 않는다.
- README에 macOS와 Windows 실행법을 별도 절로 기록한다.
- 정적 회귀 검사에서 네 파일의 존재, 매니페스트 `id`, 모듈명, 격리 경로, Python 오류 종료 코드와 인자 전달을 확인한다.
- 현재 운영체제 실행기는 실제 Blender에서 검증한다. 다른 운영체제 실행기는 가능한 파서 검사와 인코딩·안전 로직 검사를 수행하고 런타임 미검증을 명시한다.

## Blender 실행 파일 해석

실행기는 Blender 경로를 환경 변수로만 요구하지 않는다. 환경 변수가 비어 있으면 스스로 찾고, 고른 경로와 버전을 로그 첫 부분에 출력한다. 순서는 다음과 같다.

1. 프로젝트 전용 환경 변수(`BLENDER_BINARY` 등). 지정되어 있으면 그 경로를 그대로 쓴다.
2. PATH의 `blender` / `blender.exe`.
3. 흔한 설치 위치.
   - Windows: `%ProgramFiles%\Blender Foundation`, `%ProgramFiles(x86)%\Blender Foundation`, `%LOCALAPPDATA%\Programs\Blender Foundation`, Steam `steamapps\common`, 그리고 각 고정 드라이브의 상단과 `Tools`·`Apps`·`Programs`·`Program Files` 아래 `Blender*` 폴더. 압축을 풀어 쓰는 포터블 설치가 여기 놓인다.
   - macOS: `/Applications`와 `~/Applications`의 `Blender*.app`, `/opt/homebrew/bin`, `/usr/local/bin`, `/opt/blender*`.

**폴더 이름으로 버전을 판단하지 않는다.** 후보마다 `--version`을 실행해 실제 버전을 읽고, 매니페스트 `blender_version_min`을 만족하는 후보 중 가장 높은 버전을 고른다. 개발 머신에는 구버전이 함께 남아 있는 경우가 많고, PATH나 탐색 순서로 낮은 버전이 먼저 잡히면 Extension이 조용히 로드되지 않는다. 이때 나오는 오류는 원인을 가리키지 않으므로 진단 비용이 크다.

- 최소 버전을 만족하는 설치가 없으면 찾은 설치 경로와 버전을 나열하고 환경 변수로 지정하는 방법을 함께 알린다. "찾지 못했습니다"로 뭉개지 않는다.
- 환경 변수로 명시한 경로는 최소 버전보다 낮아도 거부하지 않고 경고만 한다. 의도적으로 낮은 버전에서 동작을 확인하는 경우가 있다.
- 같은 해석 순서를 테스트 러너와 패키징 스크립트에도 적용해 `--blender` 없이 실행되게 한다. 실행기만 고치면 검사 명령에서 같은 문제가 다시 난다.
- CI는 설치 단계에서 환경 변수를 설정하므로 탐색 경로를 타지 않는다. 자동 감지는 개발 머신을 위한 것이며 CI 동작을 바꾸지 않는다.
- 정적 회귀 검사의 실행기 계약 토큰에 최소 버전 키와 탐색 함수 이름을 포함해, 자동 감지가 나중에 조용히 사라지지 않게 한다.

## macOS 구성

프로젝트의 `scripts/dev_run.sh`가 다음 구조를 만들도록 한다.

```text
~/Library/Application Support/Blender/<ProjectName>Dev/<BlenderVersion>/
└── extensions/user_default/<manifest-id> -> <repository-root>
```

실행 시 `BLENDER_USER_RESOURCES`를 위 버전 디렉터리로 설정한다. Blender 실행 파일은 위 **Blender 실행 파일 해석** 순서로 찾고, `BLENDER_BINARY` 같은 프로젝트 전용 환경 변수로 재정의할 수 있게 한다. 버전 비교는 `sort -V` 동작이 플랫폼마다 달라 점으로 나눈 세 자리를 `awk`로 직접 비교한다. 탐색 결과를 명령 치환으로 받으면 서브셸이라 누적한 후보 목록이 사라지므로, 탐색 함수는 결과를 전역 변수로 돌려준다.

스크립트는 다음을 보장해야 한다.

1. 저장소 루트와 `blender_manifest.toml`을 확인한다.
2. 전용 프로필과 `extensions/user_default`를 만든다.
3. 매니페스트 `id`와 같은 이름으로 소스 심링크를 원자적으로 갱신한다.
4. `bl_ext.user_default.<manifest-id>`를 활성화하는 짧은 부트스트랩 Python을 먼저 실행한다.
5. 최초 활성화 때만 사용자 설정을 전용 프로필에 저장한다.
6. GUI 실행과 `--background --python <test>` 같은 추가 Blender 인자를 모두 전달한다.
7. 시작 Python 예외가 성공으로 오인되지 않도록 자동 검사에서는 `--python-exit-code 1`을 적용한다.

`--factory-startup`은 개발 Extension 저장소나 저장된 활성화 상태를 무효화할 수 있으므로 격리 프로필 테스트의 기본값으로 사용하지 않는다. 완전한 초기 상태가 필요한 별도 회귀 검사에서만 목적을 명시해 사용한다.

## Windows 구성

포터블 Blender를 사용하는 프로젝트라면 Blender 실행 파일 옆 `portable` 리소스 또는 프로젝트 전용 사용자 리소스를 사용하고, `extensions/user_default/<manifest-id>`를 디렉터리 정션으로 연결한다. 일반 Blender 사용자 설정 디렉터리에 개발 링크를 만들지 않는다.

- 실제 로직은 `scripts/dev_run.ps1`에 두고, 명령 프롬프트용 `scripts/dev_run.bat`은 모든 인자와 종료 코드를 PowerShell 실행기에 그대로 전달한다.
- Windows PowerShell 5.1에서 한국어 오류 메시지가 깨지지 않도록 `.ps1`은 UTF-8 BOM을 사용하고, `.bat`은 코드페이지 영향을 받는 비 ASCII 주석을 넣지 않는다.
- BOM은 스크립트를 읽을 때의 인코딩만 정한다. 출력이 파이프나 리다이렉트를 타면 PowerShell 5.1이 콘솔 코드페이지로 쓰므로 한국어가 그대로 깨진다. 스크립트 앞부분에서 `$OutputEncoding`과 `[Console]::OutputEncoding`을 BOM 없는 UTF-8로 맞추고, 콘솔이 없는 환경을 위해 `try/catch`로 감싼다.
- 프로젝트마다 별도의 포터블 Blender 디렉터리를 사용하고 그 아래 `portable/extensions/user_default/<manifest-id>`만 개발 소스 Junction으로 연결한다.
- 실행 파일 옆에 `portable/`이 있는 포터블 설치라도 `BLENDER_USER_RESOURCES`가 우선한다. 즉 포터블 바이너리를 자동 감지로 골라도 프로젝트 전용 프로필 격리는 유지된다. `bpy.utils.resource_path('USER')`가 지정한 프로필을 가리키는지 확인하는 헤드리스 검사로 이를 실측한다.
- Junction 자리에 실제 폴더나 파일이 있으면 삭제하지 않고 중단한다. 기존 Junction 또는 심링크의 대상이 다를 때만 링크 자체를 제거하고 다시 연결한다.
- GUI, 연결 전용, 백그라운드, Python 표현식과 Python 파일 실행을 지원하며 Python 오류 종료 코드를 호출자에게 전달한다.

## 검증

헤드리스 검사는 최소한 다음을 확인한다.

- 실행기가 고른 Blender 실행 파일 경로와 버전이 로그에 남고, 의도한 설치와 같다.
- `BLENDER_USER_RESOURCES`와 `bpy.utils.resource_path('USER')`가 프로젝트 전용 프로필을 가리킨다.
- 개발 Extension 링크가 저장소 루트로 해석된다.
- `bl_ext.user_default.<manifest-id>`가 활성화되고 import된다.
- 매니페스트 버전, `bl_info` 또는 등록 메타데이터가 소스와 일치한다.
- 대표 연산자 또는 핵심 기능이 실제 데이터에서 동작하고 등록 해제 후 오류가 없다.

검사 중인 Blender 프로세스와 사용자의 일상 Blender 프로세스를 혼동하지 않도록 프로필 경로를 로그 첫 부분에 출력한다.
