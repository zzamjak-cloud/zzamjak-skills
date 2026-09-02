# 템플릿

치환 토큰:

| 토큰 | 의미 | 예 |
| --- | --- | --- |
| `PROJECT_NAME` | 레포·프로젝트 이름 | `UVPatternFlow` |
| `PKG_NAME` | 패키지 이름 | `com.zzamjak.uvpatternflow` |
| `PKG_SHORT` | `com.zzamjak.` 를 뺀 부분 | `uvpatternflow` |
| `ASM_NAME` | 어셈블리·네임스페이스 | `CAT.UVPatternFlow` |

## package.json

```json
{
  "name": "com.zzamjak.PKG_SHORT",
  "displayName": "PROJECT_NAME",
  "version": "1.0.0",
  "unity": "6000.0",
  "description": "한 문단으로 기능을 설명합니다. Package Manager 상세 패널에 그대로 노출됩니다.",
  "documentationUrl": "https://github.com/zzamjak-cloud/PROJECT_NAME",
  "changelogUrl": "https://github.com/zzamjak-cloud/PROJECT_NAME/blob/main/Packages/com.zzamjak.PKG_SHORT/CHANGELOG.md",
  "licensesUrl": "https://github.com/zzamjak-cloud/PROJECT_NAME/blob/main/Packages/com.zzamjak.PKG_SHORT/LICENSE.md",
  "license": "GPL-3.0-only",
  "author": {
    "name": "zzamjak",
    "url": "https://github.com/zzamjak-cloud"
  },
  "dependencies": {},
  "samples": [
    {
      "displayName": "Demo Scene",
      "description": "기본 사용 예시 씬",
      "path": "Samples~/DemoScene"
    }
  ],
  "keywords": ["Unity", "CAT"]
}
```

`samples` 는 실제 `Samples~` 폴더가 있을 때만 넣는다. `dependencies` 는 비우는 것이 기본이고, uGUI 가 필요하면 `"com.unity.ugui": "2.0.0"` 만 추가한다.

## Runtime asmdef — `Runtime/ASM_NAME.asmdef`

```json
{
    "name": "ASM_NAME",
    "rootNamespace": "ASM_NAME",
    "references": [
        "UnityEngine.UI"
    ],
    "includePlatforms": [],
    "excludePlatforms": [],
    "allowUnsafeCode": false,
    "overrideReferences": false,
    "precompiledReferences": [],
    "autoReferenced": true,
    "defineConstraints": [],
    "versionDefines": [],
    "noEngineReferences": false
}
```

uGUI 를 쓰지 않으면 `references` 를 빈 배열로 둔다.

## Editor asmdef — `Editor/ASM_NAME.Editor.asmdef`

```json
{
    "name": "ASM_NAME.Editor",
    "rootNamespace": "ASM_NAME",
    "references": [
        "ASM_NAME",
        "UnityEngine.UI"
    ],
    "includePlatforms": [
        "Editor"
    ],
    "excludePlatforms": [],
    "allowUnsafeCode": false,
    "overrideReferences": false,
    "precompiledReferences": [],
    "autoReferenced": true,
    "defineConstraints": [],
    "versionDefines": [],
    "noEngineReferences": false
}
```

`includePlatforms: ["Editor"]` 가 빠지면 플레이어 빌드가 깨진다.

## 컴포넌트 스켈레톤

```csharp
using UnityEngine;

namespace ASM_NAME
{
    [AddComponentMenu("CAT/UI/PROJECT_NAME")]
    [DisallowMultipleComponent]
    public sealed class PROJECT_NAME : MonoBehaviour
    {
    }
}
```

## 에디터 스켈레톤

```csharp
using UnityEditor;
using UnityEngine;

namespace ASM_NAME
{
    [CustomEditor(typeof(PROJECT_NAME))]
    public sealed class PROJECT_NAMEEditor : Editor
    {
        [MenuItem("CAT/PROJECT_NAME/Documentation")]
        private static void OpenDocumentation()
        {
            Application.OpenURL("https://github.com/zzamjak-cloud/PROJECT_NAME");
        }
    }
}
```

## .gitignore (레포 루트)

```gitignore
# Unity 생성 폴더
/[Ll]ibrary/
/[Tt]emp/
/[Oo]bj/
/[Bb]uild/
/[Bb]uilds/
/[Ll]ogs/
/[Mm]emoryCaptures/
/[Uu]serSettings/

# IDE
.idea/
.vscode/
*.csproj
*.sln
*.suo
*.user
*.userprefs

# macOS
.DS_Store

# Mono 크래시 덤프
mono_crash.*

# 에이전트 작업 상태 (커밋 금지)
.omc/
.serena/

# UPM 의 Samples~ 폴더는 반드시 커밋되어야 한다.
# 전역 gitignore 의 Emacs 백업 패턴(*~)이 이 폴더를 제외하므로 명시적으로 해제한다.
!**/Samples~/
!**/Samples~/**
```

`Packages/` 와 `ProjectSettings/` 는 절대 무시하지 않는다. `packages-lock.json` 은 커밋한다.

## CHANGELOG.md

```markdown
# Changelog

이 프로젝트의 주요 변경 사항을 기록합니다.

포맷은 [Keep a Changelog](https://keepachangelog.com/ko/1.1.0/)를 따르며,
버전은 [Semantic Versioning](https://semver.org/lang/ko/)을 따릅니다.

## [1.0.0] - YYYY-MM-DD

기능을 독립 UPM 패키지로 분리한 최초 릴리스입니다.

### Added

- 핵심 기능 A
- 핵심 기능 B
```

## 레포 루트 README.md

```markdown
# PROJECT_NAME

[![openupm](https://img.shields.io/npm/v/com.zzamjak.PKG_SHORT?label=openupm&registry_uri=https://package.openupm.com)](https://openupm.com/packages/com.zzamjak.PKG_SHORT/)
[![license](https://img.shields.io/badge/license-GPL--3.0--only-blue.svg)](Packages/com.zzamjak.PKG_SHORT/LICENSE.md)

한 문단 소개.

이 레포지토리는 **개발용 Unity 프로젝트**이며, 패키지 본체는
[`Packages/com.zzamjak.PKG_SHORT`](Packages/com.zzamjak.PKG_SHORT) 에 임베디드되어 있습니다.
버전별 변경 사항은 [CHANGELOG](Packages/com.zzamjak.PKG_SHORT/CHANGELOG.md) 를 참고하세요.

## 요구 사항

- Unity 6000.0 (Unity 6) 이상
- 외부 패키지 의존성 없음

## 설치 방법

### 1. OpenUPM (권장)

    openupm add com.zzamjak.PKG_SHORT

또는 `Packages/manifest.json` 에 스코프 레지스트리를 직접 추가합니다.

    {
      "scopedRegistries": [
        {
          "name": "zzamjak",
          "url": "https://package.openupm.com",
          "scopes": ["com.zzamjak"]
        }
      ],
      "dependencies": {
        "com.zzamjak.PKG_SHORT": "1.0.0"
      }
    }

### 2. Git URL

Package Manager → `Install package from git URL...`

    https://github.com/zzamjak-cloud/PROJECT_NAME.git?path=/Packages/com.zzamjak.PKG_SHORT#v1.0.0

## 사용법

| 컴포넌트 | 대상 | 메뉴 |
|----------|------|------|
| `Foo` | 설명 | `Add Component > CAT > ... ` |

1. 사용 절차
2. 주요 인스펙터 항목 설명

## 샘플

Package Manager → PROJECT_NAME → Samples → `Demo Scene` → Import

## 라이선스

GNU General Public License v3.0 only. [LICENSE](Packages/com.zzamjak.PKG_SHORT/LICENSE.md) 참고.
```

패키지 폴더 안의 `README.md` 는 같은 내용을 유지하거나, 루트를 정본으로 삼고 링크로 연결한다. 두 문서가 갈라지지 않게 한 곳만 고친다.

## .github/workflows/openupm.yml

[레포 및 릴리스](repo-and-release.md#5-배포-자동화) 참고.
