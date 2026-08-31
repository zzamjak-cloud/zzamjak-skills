# zzamjak-skills

`zzamjak-cloud`에서 관리하는 Codex·Claude Code 공용 스킬 저장소다. 스킬 원본은 이 저장소에서만 관리하고, 각 도구의 스킬 디렉터리에는 링크로 연결한다.

## 구조

```text
skills/
└── <category>/
    └── <skill-name>/
        ├── SKILL.md
        ├── agents/       선택 사항
        ├── references/   선택 사항
        ├── scripts/      선택 사항
        └── assets/       선택 사항
scripts/
├── link-skills.sh        macOS·Linux 연결
├── link-skills.ps1       Windows 연결
└── validate.sh           저장소 구조 검증
```

현재 카테고리는 다음과 같다.

| 카테고리 | 스킬 | 용도 |
| --- | --- | --- |
| `ai` | `google-ai-setup` | Gemini API 기반 AI 기능 통합 |
| `authentication` | `google-oauth-setup` | Google OAuth 2.0 PKCE 인증 구성 |
| `blender` | `blender-addon-release-workflow` | Blender 애드온·Extension 개발 및 배포 |
| `tauri` | `tauri-project-setup` | Tauri 2 프로젝트 생성 및 기존 프런트엔드 통합 |

카테고리는 소문자 영문·숫자·하이픈으로 만들고, 스킬 이름은 저장소 전체에서 고유하게 유지한다. 각 스킬 폴더 이름은 `SKILL.md`의 `name`과 같아야 한다.

## 설치

macOS·Linux에서는 저장소를 clone한 뒤 다음을 실행한다.

```bash
git clone https://github.com/zzamjak-cloud/zzamjak-skills.git
cd zzamjak-skills
./scripts/link-skills.sh
```

Windows에서는 PowerShell 7(`pwsh`)에서 다음을 실행한다. Windows PowerShell 5.1은 UTF-8 스크립트 처리 차이 때문에 지원하지 않는다.

```powershell
git clone https://github.com/zzamjak-cloud/zzamjak-skills.git
cd zzamjak-skills
./scripts/link-skills.ps1
```

기본 대상은 Codex 공식 개인 스킬 경로 `~/.agents/skills`와 Claude Code 개인 스킬 경로 `~/.claude/skills`다. 설치 스크립트는 카테고리에 관계없이 저장소의 모든 중앙 스킬을 두 경로에 연결한다. 같은 이름의 기존 파일이나 디렉터리가 있으면 덮어쓰지 않고 중단한다. 기존 항목을 타임스탬프 백업으로 옮긴 뒤 연결하려면 `--backup-existing` 또는 `-BackupExisting`을 사용한다.

구버전 경로 `~/.codex/skills`에 같은 스킬이 남아 있으면 Codex에서 중복 노출될 수 있다. 새 경로 연결을 확인한 뒤 구버전 링크를 직접 확인하고 제거한다.

Codex만 연결하려면 `--codex-only`, Claude Code만 연결하려면 `--claude-only`를 사용한다. Windows에서는 각각 `-CodexOnly`, `-ClaudeOnly`다.

이후 macOS·Linux 업데이트는 다음처럼 실행한다. 기존 스킬 수정은 링크된 두 도구에 즉시 반영되고, 연결 스크립트의 멱등 재실행으로 새로 추가된 중앙 스킬도 모두 연결된다.

```bash
cd zzamjak-skills
git pull --ff-only
./scripts/link-skills.sh
```

Windows에서는 PowerShell 7에서 다음처럼 실행한다.

```powershell
cd zzamjak-skills
git pull --ff-only
./scripts/link-skills.ps1
```

## 스킬 추가

1. 용도에 맞는 `skills/<category>/<skill-name>` 폴더를 만든다.
2. `SKILL.md`의 `name`을 폴더 이름과 동일하게 작성한다.
3. 처음 한 번 `python -m pip install -r requirements-ci.txt`로 검증 의존성을 설치한 뒤 `./scripts/validate.sh`와 `python scripts/validate_skills.py`로 구조와 frontmatter를 검사한다.
4. 연결 스크립트를 다시 실행해 새 스킬 링크를 추가한다.
