---
name: unity-openupm-release
description: "Unity 기능을 com.zzamjak 스코프의 독립 UPM 패키지로 분리해 zzamjak-cloud 공개 레포를 만들고 OpenUPM 레지스트리에 등록·배포할 때 사용한다. 패키지 골격 생성, CAT 네임스페이스·메뉴 정리, Editor/Runtime asmdef 분리, Packages 폴더 미노출 문제 진단, README·CHANGELOG·Samples, v1.0.0 태그 배포까지 다룬다. 일반 Unity 기능 구현이나 이미 배포된 패키지의 코드 수정 자체에는 사용하지 않는다."
---

# Unity 패키지 OpenUPM 배포

Unity 기능을 임베디드 UPM 패키지로 분리하고 OpenUPM 에 등록하는 전 과정을 고정 순서로 수행한다. 매번 반복되는 작업이므로 단계를 건너뛰지 않고, 각 단계마다 검증 스크립트로 증거를 남긴다.

## 불변 조건

- GitHub 소유자는 `zzamjak-cloud`, 레포 이름은 프로젝트 이름과 동일한 **공개** 레포다.
- 패키지 이름은 `com.zzamjak.<소문자프로젝트명>` 이며, 임베디드 경로는 `Packages/com.zzamjak.<소문자프로젝트명>/` 로 정확히 일치시킨다.
- 어셈블리 이름과 루트 네임스페이스는 `CAT.<PascalProjectName>`, 에디터 메뉴 최상위는 `CAT` 이다.
- **외부 패키지 의존성을 두지 않는다.** `package.json` 의 `dependencies` 는 Unity 내장 모듈(`com.unity.modules.*`)과 `com.unity.ugui` 수준까지만 허용하고, 그 외 레지스트리·git 의존성은 넣지 않는다. 선택 기능이 특정 패키지를 쓰면 의존성 대신 README 요구 사항 + asmdef `versionDefines` 분기 + 셰이더 내장 파이프라인 폴백으로 처리한다.
  - **예외 — 렌더 파이프라인 전용 패키지.** 셰이더가 URP 셰이더 라이브러리를 인클루드하고 C# 이 `UnityEngine.Rendering.Universal` 을 쓰는 등 URP 없이는 어떤 기능도 동작하지 않는 패키지는 `com.unity.render-pipelines.universal` 을 `dependencies` 에 선언한다(Water2D·OceanFlow 선례). URP 가 없는 프로젝트에서 패키지가 목록에서 사라지는 것은 그 프로젝트에서 어차피 쓸 수 없으므로 감수한다. 이 경우 검증 스크립트에 `--allow-dependency com.unity.render-pipelines.universal` 을 넘기고 README 요구 사항에도 명시한다. 사용자에게 한 번 확인한 뒤 진행한다.
- 최초 배포 버전은 `1.0.0`, git 태그는 `v1.0.0` 이다. `package.json` 의 `version`, CHANGELOG 최상단 항목, git 태그 세 값은 항상 같아야 한다.
- 기존 원격 태그를 재사용하거나 강제 갱신하지 않는다. 잘못 배포한 버전은 되돌리지 않고 패치 버전을 올린다.
- 공개 레포 생성, push, tag, Release, OpenUPM PR 은 현재 요청이 명시적으로 승인한 범위에서만 실행한다. "나중에", "준비해 달라" 같은 표현은 로컬 준비까지만 승인한다.
- 작업 시작 전 원본 프로젝트와 대상 프로젝트 양쪽의 git 상태를 확인한다.

## 작업 라우팅

- 새 패키지를 분리·생성한다면 아래 [배포 파이프라인](#배포-파이프라인)을 1단계부터 순서대로 수행하고, 구조 세부는 [패키지 레이아웃](references/package-layout.md)을 읽는다.
- 파일 템플릿(`package.json`, asmdef, README, CHANGELOG, `.gitignore`, GitHub Actions)이 필요하면 [템플릿](references/templates.md)에서 그대로 복사해 치환한다.
- 레포 생성·태그·OpenUPM 등록만 남았다면 [레포 및 릴리스](references/repo-and-release.md)를 읽는다.
- **Unity 에서 `Packages/com.zzamjak.*` 폴더가 보이지 않는다면** 다른 작업보다 먼저 [미노출 진단](references/visibility-troubleshooting.md)을 읽고 원인 표를 위에서부터 소거한다.
- 이미 배포된 패키지에 변경 사항을 반영하는 요청이면 7단계(버전·CHANGELOG)부터 수행한다.

## 배포 파이프라인

### 1. 범위 확정

- 분리할 기능의 파일 목록(스크립트·셰이더·머티리얼·프리팹·리소스)을 확정하고, 원본 프로젝트에서 남길 것과 옮길 것을 구분한다.
- 프로젝트 이름(`UVPatternFlow`), 패키지 이름(`com.zzamjak.uvpatternflow`), 어셈블리 이름(`CAT.UVPatternFlow`)을 한 번에 정한다.
- 대상 경로는 기본 `/Users/woody/dev/AI/<ProjectName>` 이며, 사용자가 경로를 지정하면 그 위치를 사용한다.
- 외부 의존성이 필요한 기능이 섞여 있으면 이 단계에서 잘라낸다. 의존성 제거가 불가능하면 진행 전에 사용자에게 보고한다.

### 2. 대상 Unity 프로젝트 준비

- 대상 경로에 Unity 프로젝트가 없으면 만든다. **`unity` CLI 에는 프로젝트 생성 명령이 없다** (`templates`·`projects` 는 Hub 레지스트리 관리용). 에디터 바이너리를 배치 모드로 직접 호출해 템플릿에서 생성한다. 임의로 `ProjectSettings` 를 손으로 만들지 않는다.

```bash
EDITOR=/Applications/Unity/Hub/Editor/<버전>/Unity.app
TEMPLATE=$(ls "$EDITOR"/Contents/Resources/PackageManager/ProjectTemplates/com.unity.template.3d-cross-platform-*.tgz)
"$EDITOR/Contents/MacOS/Unity" -batchmode -quit -nographics \
  -createProject <프로젝트경로> -cloneFromTemplate "$TEMPLATE" -logFile <로그경로>
```

  - Unity 6 의 URP 3D 템플릿은 `com.unity.template.3d-cross-platform-*.tgz` 다(`3d-high-end` 는 HDRP). 원본 프로젝트와 같은 에디터 버전을 쓴다.
  - 생성 직후 템플릿 잡동사니 `Assets/TutorialInfo/`, `Assets/Readme.asset` 을 `.meta` 와 함께 지운다. `Assets/Settings/` 의 URP 에셋과 `Packages/manifest.json` 은 Unity 가 만든 그대로 둔다.
  - 패키지에 테스트가 있으면 `Packages/manifest.json` 에 `"testables": ["com.zzamjak.<name>"]` 를 추가한다. 없으면 Test Runner 와 `unity test` 가 패키지 테스트를 보지 못한다.
  - 다른 프로젝트에서 Unity 에디터가 열려 있어도 별도 경로의 배치 인스턴스는 문제없이 돈다.
- 최소 골격: `Assets/`, `Packages/manifest.json`, `ProjectSettings/ProjectVersion.txt`.
- `Assets/.gitkeep` 를 두어 빈 `Assets` 가 git 에서 사라지지 않게 한다.

### 3. 패키지 폴더 생성 및 파일 이동

- `Packages/com.zzamjak.<name>/` 아래에 `Runtime/`, `Editor/`, (필요 시) `Samples~/` 를 만든다.
- 파일은 **`.meta` 와 함께** 옮긴다. `.meta` 를 빼면 GUID 가 바뀌어 기존 씬·프리팹 참조가 끊긴다.
- `Runtime/Resources/` 는 런타임에 `Resources.Load` 로 셰이더·머티리얼을 찾을 때만 사용한다. 그 외 에셋은 `Runtime/` 하위 일반 폴더에 둔다.
- 패키지 폴더 안에 `.omc/`, `.serena/`, `.DS_Store` 같은 작업 산출물이 딸려 들어가지 않았는지 확인하고 제거한다. (실제로 발생한 사례가 있다.)

### 4. 코드 정리 (CAT 규약)

- 모든 `.cs` 에 `namespace CAT.<PascalProjectName>` 을 선언한다. 에디터 코드도 같은 네임스페이스를 쓴다.
- `Runtime/` 코드는 `UnityEditor` 를 참조하지 않는다. 불가피하면 `#if UNITY_EDITOR` 로 감싼다. 감싸지 않으면 빌드가 깨진다.
- 에디터 진입점은 모두 `CAT` 하위로 모은다.
  - `[MenuItem("CAT/...")]`
  - `[AddComponentMenu("CAT/<Category>/<Name>")]`
  - `[CreateAssetMenu(menuName = "CAT/...")]`
- `Runtime/CAT.<Name>.asmdef`, `Editor/CAT.<Name>.Editor.asmdef` 를 만든다. Editor asmdef 는 `includePlatforms: ["Editor"]` 와 Runtime asmdef 참조를 반드시 갖는다. 두 asmdef 모두 `rootNamespace` 를 `CAT.<Name>` 으로 채운다.
- 셰이더 이름도 `CAT/<Name>` 으로 통일해 셰이더 드롭다운에서 묶이게 한다.

### 5. 패키지 메타데이터

- `package.json` 을 [템플릿](references/templates.md)대로 작성한다. `documentationUrl`·`changelogUrl`·`licensesUrl` 은 GitHub 절대 URL 로 채우되, **레포 안에 실제로 존재하는 경로**를 가리켜야 한다. 패키지가 서브폴더에 있으므로 `blob/main/CHANGELOG.md` 가 아니라 `blob/main/Packages/com.zzamjak.<name>/CHANGELOG.md` 다. 틀리면 Package Manager 의 링크가 404 로 죽는다.
- `unity` 필드는 `"6000.0"` 형식(메이저.마이너)만 쓴다. 패치까지 적으면 무시되거나 경고가 난다.
- `README.md`, `CHANGELOG.md`, `LICENSE.md`, (라이선스가 GPL 이면) `NOTICE.md` 를 패키지 폴더 안에 둔다.
- 패키지 폴더 안의 모든 파일·폴더에 `.meta` 가 있어야 한다. `Samples~` 폴더 **자체**는 Unity 에 보이지 않으므로 `.meta` 를 만들지 않지만, 그 **내부** 파일은 임포트 시 에셋이 되므로 `.meta` 가 필요하다.
- 샘플이 있으면 `package.json` 의 `samples[].path` 를 `Samples~/<Folder>` 로 정확히 맞춘다.

### 6. 로컬 검증 (Unity 를 열기 전)

```bash
python3 ~/.claude/skills/unity-openupm-release/scripts/verify_upm_package.py <프로젝트경로>
```

- 오류가 하나라도 남으면 다음 단계로 넘어가지 않는다.
- 렌더 파이프라인처럼 의존성 제거가 불가능하다고 사용자가 판단한 경우에만 `--allow-dependency com.unity.render-pipelines.universal` 로 예외를 명시한다. 예외는 README 요구 사항에도 반드시 기록한다.
- 그다음 배치 모드로 컴파일·테스트·플레이어 빌드를 먼저 통과시킨다. 에디터 GUI 를 열지 않고도 세 가지 회귀(컴파일 에러, 패키지 테스트, Editor API 누출)를 잡는다.

```bash
unity test <프로젝트경로> --mode EditMode --filter "CAT.<Name>.Tests" --output <결과.xml> --timeout 900 --non-interactive
unity build <프로젝트경로> --target StandaloneOSX --output-path <출력.app> --log-file <로그> --non-interactive
```

  결과 XML 의 `result="Passed"` 와 빌드 로그의 `Build Finished, Result: Success.` 를 확인한다. 하나라도 실패하면 GUI 확인으로 넘어가지 않는다.
- 그다음 Unity 를 **완전히 종료한 상태에서** 열어 다음을 육안 확인한다.
  1. Project 창 `Packages` 노드에 `<displayName>` 이 보인다.
  2. Package Manager → In Project → Custom 에 패키지가 있다.
  3. Console 에 컴파일 에러·패키지 해석 에러가 없다.
  4. 상단 메뉴 `CAT` 과 `Add Component > CAT` 이 노출된다.
- 보이지 않으면 [미노출 진단](references/visibility-troubleshooting.md)으로 간다.
- 빌드 회귀도 확인한다. Editor 전용 API 누출은 에디터에서는 통과하고 빌드에서만 터진다.

### 7. 버전·문서 확정

- `package.json` 의 `version` 을 `1.0.0` 으로 둔다.
- `CHANGELOG.md` 최상단에 `## [1.0.0] - YYYY-MM-DD` 항목을 Keep a Changelog 형식으로 작성한다.
- 레포 루트 `README.md` 에는 OpenUPM 설치법과 기능 사용법을 핵심으로 쓴다. 패키지 폴더 `README.md` 와 내용이 갈라지지 않게 한쪽을 정본으로 삼고 다른 쪽에서 링크한다.
- 루트 README 의 스코프 레지스트리 예시는 반드시 이름을 `zzamjak` 으로 쓴다. Package Manager 의 My Registries 에 `zzamjak` 그룹으로 묶이게 하기 위한 요구 사항이다.

### 8. 공개 레포 생성 및 push

- `.gitignore` 를 템플릿대로 만든다. `Samples~` 예외 처리를 빠뜨리지 않는다.
- `git init` → 전체 스테이징 → **커밋 전에** 패키지 파일이 전부 추적되는지 확인한다.

```bash
git ls-files Packages/com.zzamjak.<name> | wc -l          # 0 이면 안 된다
git ls-files -s Packages | grep "^160000"             # 출력이 있으면 gitlink 사고
```

- 사용자 승인 후 공개 레포를 만들고 push 한다.

```bash
gh repo create zzamjak-cloud/<ProjectName> --public --source=. --remote=origin --push
```

### 9. 태그 및 릴리스

```bash
git tag v1.0.0
git push origin v1.0.0
gh release create v1.0.0 --title "v1.0.0" --notes-file <CHANGELOG 발췌>
```

### 10. OpenUPM 등록 (필수)

- [레포 및 릴리스](references/repo-and-release.md)의 절차대로 `openupm/openupm` 에 등록 PR 을 만든다. 웹 폼(https://openupm.com/packages/add/) 대신 `gh` 로 fork → `data/packages/com.zzamjak.<name>.yml` 추가 → PR 을 만들 수 있다. 업스트림 기본 브랜치는 `master`, PR 제목은 `chore(data): new package com.zzamjak.<name>` 관례를 따른다.
- PR 의 `Data validation` 체크가 통과하는지 `gh pr checks <번호> --repo openupm/openupm --watch` 로 확인한다. 실패하면 대개 `topics` slug 오류나 `licenseSpdxId` 불일치다.
- 등록 메타데이터 사본을 레포 루트 `openupm-package.yml` 에 남긴다. 이 파일은 참고용이며 실제 등록 정보는 업스트림에 있다.
- `.github/workflows/openupm.yml` 을 추가해 이후 태그 push 시 즉시 스캔이 트리거되게 한다.
- 병합 후 https://openupm.com/packages/com.zzamjak.<name>/ 에서 `1.0.0` 이 실제로 색인됐는지 확인한다. 확인 전에는 완료라고 보고하지 않는다.

### 11. 마무리

- 루트 README 에 OpenUPM 배지를 추가한다.
- 원본 프로젝트에서 분리한 기능을 제거할지 사용자에게 확인한다. 임의로 지우지 않는다.
- 원본 프로젝트가 새 패키지를 다시 소비해야 하면 `manifest.json` 에 git URL 이 아니라 OpenUPM 스코프 레지스트리로 추가한다.

## 완료 기준

- `verify_upm_package.py` 가 오류 0 으로 통과한다.
- 실제로 Unity 를 열어 `Packages` 노드·Package Manager·`CAT` 메뉴 노출을 확인했다.
- 빌드(에디터 아닌 타깃) 컴파일이 통과한다.
- `git ls-files` 로 패키지 전 파일이 추적되고, gitlink 항목이 없다.
- 원격 레포가 공개 상태이며 `v1.0.0` 태그와 Release 가 있다.
- OpenUPM 패키지 페이지에서 `1.0.0` 버전이 색인됐다.
- `package.json` version = CHANGELOG 최상단 = git 태그 세 값이 일치한다.
- 미완료 항목이 있으면 완료로 보고하지 않고 남은 항목을 명시한다.
