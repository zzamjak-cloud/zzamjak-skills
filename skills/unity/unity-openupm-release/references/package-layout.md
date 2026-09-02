# 패키지 레이아웃

## 디렉터리 구조

레포지토리는 **개발용 Unity 프로젝트**이고, 패키지 본체는 `Packages/` 에 임베디드된다.

```text
<ProjectName>/                              # git 레포 루트 = Unity 프로젝트 루트
├── .github/workflows/openupm.yml
├── .gitignore
├── README.md                               # OpenUPM 설치법 + 사용법 (정본)
├── LICENSE
├── NOTICE.md                               # GPL 계열일 때만
├── openupm-package.yml                     # OpenUPM 등록 메타데이터 사본 (참고용)
├── Assets/
│   └── .gitkeep                            # 데모/테스트 씬을 두는 곳
├── ProjectSettings/
└── Packages/
    ├── manifest.json
    ├── packages-lock.json
    └── com.zzamjak.<name>/                 # ← 배포 대상. Packages 바로 아래 1단계
        ├── package.json                    (+ .meta)
        ├── README.md                       (+ .meta)
        ├── CHANGELOG.md                    (+ .meta)
        ├── LICENSE.md                      (+ .meta)
        ├── NOTICE.md                       (+ .meta)
        ├── Runtime/                        (+ .meta)
        │   ├── CAT.<Name>.asmdef           (+ .meta)
        │   ├── *.cs                        (+ .meta)
        │   └── Resources/                  (+ .meta)
        │       └── CAT_*.shader, *.mat     (+ .meta)
        ├── Editor/                         (+ .meta)
        │   ├── CAT.<Name>.Editor.asmdef    (+ .meta)
        │   └── *Editor.cs                  (+ .meta)
        └── Samples~/                       (.meta 없음 — 폴더 자체는 Unity 에 안 보임)
            └── <SampleName>/
                ├── *.unity, *.cs           (+ .meta 필요)
```

핵심 제약:

- 패키지 폴더는 `Packages/` **바로 아래 한 단계**여야 한다. `Packages/Custom/com.zzamjak.x` 처럼 한 단계 더 들어가면 Unity 가 인식하지 않는다.
- 폴더 이름 = `package.json` 의 `name`. 대소문자까지 같게 한다.
- 폴더 이름이 `.` 으로 시작하거나 `~` 로 끝나면 Unity 가 숨긴다.

## 네이밍 규약

| 항목 | 규칙 | 예 |
| --- | --- | --- |
| 레포 이름 | 프로젝트 이름 (PascalCase 허용) | `UVPatternFlow` |
| 패키지 `name` | `com.zzamjak.<소문자, 구분자 없음>` | `com.zzamjak.uvpatternflow` |
| 패키지 폴더 | `name` 과 동일 | `Packages/com.zzamjak.uvpatternflow` |
| `displayName` | 프로젝트 이름 | `UVPatternFlow` |
| Runtime asmdef | `CAT.<PascalName>` | `CAT.UVPatternFlow` |
| Editor asmdef | `CAT.<PascalName>.Editor` | `CAT.UVPatternFlow.Editor` |
| `rootNamespace` | `CAT.<PascalName>` | `CAT.UVPatternFlow` |
| C# 네임스페이스 | `CAT.<PascalName>` | `namespace CAT.UVPatternFlow` |
| 에디터 메뉴 | `CAT/...` | `[MenuItem("CAT/UV Pattern Flow/...")]` |
| 컴포넌트 메뉴 | `CAT/<Category>/<Name>` | `[AddComponentMenu("CAT/UI/UV Pattern Flow")]` |
| 셰이더 이름 | `CAT/<Name>` | `Shader "CAT/UVPatternFlowUI"` |
| 셰이더 파일 | `CAT_<Name>.shader` | `CAT_Water2D.shader` |
| git 태그 | `v<semver>` | `v1.0.0` |

`name` 은 소문자·숫자·`.`·`-`·`_` 만 허용되고 전체 길이 50자를 넘기지 않는다.

## Runtime / Editor 분리

빌드 실패의 대부분은 이 경계에서 생긴다.

- `Runtime/` 어셈블리는 `includePlatforms` 를 비워 모든 플랫폼에 포함시킨다.
- `Editor/` 어셈블리는 `includePlatforms: ["Editor"]` 를 **반드시** 넣는다. 빠지면 플레이어 빌드에 에디터 코드가 섞여 `UnityEditor` 참조로 컴파일이 깨진다.
- `Runtime/` 코드에서 `using UnityEditor;` 나 `[CustomEditor]` 를 쓰지 않는다. 런타임 코드에 에디터 전용 분기가 꼭 필요하면 이렇게만 쓴다.

```csharp
#if UNITY_EDITOR
using UnityEditor;
#endif
```

- 반대 방향(Editor → Runtime) 참조는 Editor asmdef 의 `references` 에 Runtime asmdef 이름을 넣어 연결한다.
- asmdef 를 두면 자동 참조가 끊기므로, uGUI 를 쓰면 `references` 에 `"UnityEngine.UI"` 를 명시한다.
- `Runtime/Resources/` 에 넣은 셰이더는 빌드에 항상 포함된다. 반대로 `Resources` 밖의 셰이더는 씬에서 참조되지 않으면 스트립되므로, 런타임에 `Shader.Find` 로 찾는 셰이더는 `Resources` 에 두거나 Always Included Shaders 로 안내한다.

## 의존성 정책

`dependencies` 는 비우는 것을 기본으로 하고, 아래 수준까지만 허용한다.

```json
"dependencies": {
  "com.unity.ugui": "2.0.0"
}
```

- Unity 내장 모듈(`com.unity.modules.*`)과 `com.unity.ugui` 는 모든 프로젝트에 사실상 존재하므로 허용한다.
- URP·Input System·Cinemachine 등 선택 패키지는 `dependencies` 에 넣지 않는다. 넣으면 설치자의 프로젝트 구성을 강제하고, 버전이 안 맞을 때 **패키지 해석 자체가 실패해 패키지가 목록에서 사라진다.**
- 선택 패키지 기능이 필요하면 이렇게 처리한다.
  1. README 요구 사항에 명시한다.
  2. asmdef `versionDefines` 로 심볼을 만들고 `#if` 로 코드 경로를 분기한다.
  3. 셰이더는 내장 파이프라인 폴백 서브셰이더를 함께 둔다.

```json
"versionDefines": [
  {
    "name": "com.unity.render-pipelines.universal",
    "expression": "17.0.0",
    "define": "CAT_URP"
  }
]
```

## Samples~

- 폴더 이름 끝의 `~` 때문에 Unity 는 이 폴더를 임포트하지 않는다. 그래서 `Samples~.meta` 는 만들지 않는다.
- 반면 사용자가 Package Manager 에서 Import 하면 내용이 `Assets/Samples/...` 로 복사된다. 그때 GUID 가 유지되도록 **내부 파일에는 `.meta` 가 있어야 한다.**
- 전역 gitignore 의 Emacs 백업 패턴 `*~` 가 이 폴더를 통째로 제외한다. `.gitignore` 에 예외를 넣는다.

```gitignore
!**/Samples~/
!**/Samples~/**
```

- `package.json` 의 `samples[].path` 는 `Samples~/<Folder>` 형식이며 실제 경로와 정확히 같아야 한다. 다르면 Package Manager 의 Samples 탭에 Import 버튼이 나타나지 않는다.

## .meta 규칙 요약

| 대상 | `.meta` 필요 | 비고 |
| --- | --- | --- |
| 패키지 루트 폴더 자체 | 불필요 | `Packages/` 바로 아래 항목은 Unity 가 관리 |
| 패키지 안의 모든 폴더 | 필요 | `Runtime/`, `Editor/`, `Resources/` |
| 패키지 안의 모든 파일 | 필요 | `package.json`, `README.md`, `LICENSE.md`, `NOTICE.md` 포함 |
| `Samples~` 폴더 | 불필요 | 이름에 `~` 가 있어 임포트 대상이 아님 |
| `Samples~` 내부 | 필요 | 임포트 시 에셋이 됨 |
| `.meta` 파일 | 해당 없음 | |

문서 파일의 `.meta` 를 빠뜨리면 설치본(읽기 전용 폴더)에서 Unity 가 해당 에셋을 무시하며 경고를 낸다. Water2D 는 이 문제로 1.0.2 패치를 냈다.
