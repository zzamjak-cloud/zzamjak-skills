#!/usr/bin/env python3
"""com.zzamjak.* 임베디드 UPM 패키지의 배포 준비 상태를 정적으로 검증한다.

사용법:
    python3 verify_upm_package.py <Unity 프로젝트 경로> [--package com.zzamjak.foo]

종료 코드 0 = 오류 없음. 경고는 종료 코드에 영향을 주지 않는다.
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

ERRORS: list[str] = []
WARNINGS: list[str] = []

# 의존성으로 허용하는 항목. 그 외는 설치자의 프로젝트 구성을 강제하고
# 해석 실패 시 패키지가 Package Manager 목록에서 통째로 사라진다.
ALLOWED_DEPENDENCY_PREFIXES = ("com.unity.modules.",)
ALLOWED_DEPENDENCIES = {"com.unity.ugui"}

REQUIRED_PACKAGE_FIELDS = (
    "name",
    "displayName",
    "version",
    "unity",
    "description",
    "license",
    "author",
    "documentationUrl",
    "changelogUrl",
)

# .meta 가 필요 없는 항목
META_EXEMPT_NAMES = {".DS_Store"}


def err(message: str) -> None:
    ERRORS.append(message)


def warn(message: str) -> None:
    WARNINGS.append(message)


def git(project: Path, *args: str) -> str | None:
    """git 명령을 실행하고 stdout 을 반환한다. 저장소가 아니면 None."""
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=project,
            capture_output=True,
            text=True,
            check=False,
        )
    except FileNotFoundError:
        return None
    if result.returncode != 0:
        return None
    return result.stdout


# --------------------------------------------------------------------------- #
# 프로젝트 골격
# --------------------------------------------------------------------------- #


def check_project_skeleton(project: Path) -> None:
    for relative in ("Assets", "Packages", "ProjectSettings/ProjectVersion.txt"):
        if not (project / relative).exists():
            err(f"Unity 프로젝트 골격이 없습니다: {relative}")


def find_package_dir(project: Path, explicit: str | None) -> Path | None:
    packages = project / "Packages"
    if not packages.is_dir():
        err("Packages 디렉터리가 없습니다.")
        return None

    if explicit:
        candidate = packages / explicit
        if not candidate.is_dir():
            err(f"지정한 패키지 폴더가 없습니다: Packages/{explicit}")
            return None
        return candidate

    candidates = sorted(
        path for path in packages.iterdir() if path.is_dir() and path.name.startswith("com.zzamjak.")
    )
    if not candidates:
        err("Packages/ 바로 아래에 com.zzamjak.* 폴더가 없습니다. 폴더 깊이를 확인하세요.")
        # 한 단계 더 들어간 흔한 실수를 잡아준다.
        for nested in packages.rglob("com.zzamjak.*"):
            if nested.is_dir():
                relative = nested.relative_to(project)
                err(f"패키지가 한 단계 아래에 있습니다: {relative} → Packages/ 바로 아래로 옮기세요.")
        return None
    if len(candidates) > 1:
        warn("com.zzamjak.* 폴더가 여러 개입니다: " + ", ".join(p.name for p in candidates))
    return candidates[0]


# --------------------------------------------------------------------------- #
# package.json
# --------------------------------------------------------------------------- #


def check_package_json(package_dir: Path, allowed_extra: set[str]) -> dict | None:
    path = package_dir / "package.json"
    if not path.is_file():
        err("package.json 이 없습니다. Unity 는 이 폴더를 패키지로 보지 않습니다.")
        return None

    raw = path.read_bytes()
    if raw.startswith(b"\xef\xbb\xbf"):
        err("package.json 에 BOM 이 있습니다. UTF-8 (BOM 없음)으로 저장하세요.")
    try:
        data = json.loads(raw.decode("utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        err(f"package.json 파싱 실패 — Unity 가 패키지를 조용히 건너뜁니다: {error}")
        return None

    for field in REQUIRED_PACKAGE_FIELDS:
        if not data.get(field):
            err(f"package.json 필수 필드 누락: {field}")

    name = data.get("name", "")
    if not re.fullmatch(r"com\.zzamjak\.[a-z0-9][a-z0-9._-]*", name):
        err(f"package.json name 규칙 위반 (com.zzamjak.<소문자>): {name!r}")
    if len(name) > 50:
        err(f"package.json name 이 50자를 초과합니다: {len(name)}자")
    if name and name != package_dir.name:
        err(f"폴더 이름과 package.json name 이 다릅니다: {package_dir.name!r} vs {name!r}")

    version = data.get("version", "")
    if not re.fullmatch(r"\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?", str(version)):
        err(f"version 이 SemVer 형식이 아닙니다: {version!r}")

    unity = str(data.get("unity", ""))
    if not re.fullmatch(r"\d{4}\.\d+", unity):
        err(f"unity 필드는 '메이저.마이너' 두 자리여야 합니다 (예: 6000.0): {unity!r}")

    if not data.get("licensesUrl"):
        warn("licensesUrl 이 없습니다. Package Manager 의 License 링크가 비게 됩니다.")

    dependencies = data.get("dependencies") or {}
    if not isinstance(dependencies, dict):
        err("dependencies 는 객체여야 합니다.")
    else:
        for dep in dependencies:
            if dep in ALLOWED_DEPENDENCIES or dep in allowed_extra:
                continue
            if dep.startswith(ALLOWED_DEPENDENCY_PREFIXES):
                continue
            err(
                f"외부 패키지 의존성이 있습니다: {dep} — 해석 실패 시 패키지가 목록에서 사라집니다. "
                "제거하고 README 요구 사항 + asmdef versionDefines 로 대체하세요."
            )
            if dep.startswith("https://") or ".git" in dep:
                err(f"git URL 의존성은 OpenUPM 배포에서 허용되지 않습니다: {dep}")

    return data


def check_doc_urls(project: Path, data: dict) -> None:
    """documentationUrl / changelogUrl / licensesUrl 이 실재하는 경로를 가리키는지 검사한다.

    GitHub blob URL 은 레포 상대 경로로 환원해 로컬 파일 존재를 확인한다.
    이 값이 틀리면 Package Manager 의 링크가 404 로 죽는다.
    """
    pattern = re.compile(r"^https://github\.com/[^/]+/[^/]+/blob/[^/]+/(.+)$")
    for field in ("documentationUrl", "changelogUrl", "licensesUrl"):
        url = data.get(field)
        if not isinstance(url, str) or not url:
            continue
        match = pattern.match(url)
        if not match:
            continue
        target = project / match.group(1)
        if not target.exists():
            err(f"{field} 이 존재하지 않는 경로를 가리킵니다 (Package Manager 링크 404): {url}")


def check_samples(package_dir: Path, data: dict) -> None:
    samples = data.get("samples") or []
    samples_root = package_dir / "Samples~"

    if samples and not isinstance(samples, list):
        err("samples 는 배열이어야 합니다.")
        return

    for entry in samples:
        path_value = (entry or {}).get("path", "")
        if not path_value.startswith("Samples~/"):
            err(f"samples[].path 는 'Samples~/' 로 시작해야 합니다: {path_value!r}")
            continue
        if not (package_dir / path_value).is_dir():
            err(f"samples[].path 에 해당하는 폴더가 없습니다: {path_value}")

    if samples_root.is_dir() and not samples:
        warn("Samples~ 폴더가 있는데 package.json 의 samples 항목이 없습니다. Import 버튼이 나오지 않습니다.")


# --------------------------------------------------------------------------- #
# 구조 · asmdef · 코드
# --------------------------------------------------------------------------- #


def check_layout(package_dir: Path) -> None:
    for required in ("Runtime", "README.md", "CHANGELOG.md"):
        if not (package_dir / required).exists():
            err(f"패키지 필수 항목 누락: {required}")

    if not any(package_dir.glob("LICENSE*")):
        err("패키지 안에 LICENSE 파일이 없습니다.")

    for junk in (".omc", ".serena", ".idea", ".vscode", ".DS_Store", "obj", "Temp"):
        for found in package_dir.rglob(junk):
            err(f"패키지 안에 작업 산출물이 들어 있습니다: {found.relative_to(package_dir)}")

    nested_git = [p for p in package_dir.rglob(".git") if p.is_dir()]
    for found in nested_git:
        err(
            f"패키지 안에 .git 디렉터리가 있습니다: {found.relative_to(package_dir)} — "
            "이대로 커밋하면 gitlink(서브모듈)가 되어 원격에서는 빈 폴더가 됩니다."
        )


def load_asmdef(path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        err(f"asmdef 파싱 실패: {path.name}: {error}")
        return None


def check_asmdefs(package_dir: Path) -> None:
    runtime_dir = package_dir / "Runtime"
    editor_dir = package_dir / "Editor"

    runtime_files = list(runtime_dir.glob("*.asmdef")) if runtime_dir.is_dir() else []
    editor_files = list(editor_dir.glob("*.asmdef")) if editor_dir.is_dir() else []

    if not runtime_files:
        err("Runtime/ 에 asmdef 가 없습니다.")
    if editor_dir.is_dir() and not editor_files:
        err("Editor/ 에 asmdef 가 없습니다. Editor 코드가 플레이어 빌드에 포함되어 빌드가 깨집니다.")

    runtime_name = None
    for path in runtime_files:
        data = load_asmdef(path)
        if data is None:
            continue
        runtime_name = data.get("name", "")
        if not runtime_name.startswith("CAT."):
            err(f"Runtime asmdef 이름은 CAT. 으로 시작해야 합니다: {runtime_name!r}")
        if data.get("rootNamespace") != runtime_name:
            err(
                f"Runtime asmdef 의 rootNamespace 가 이름과 다릅니다: "
                f"{data.get('rootNamespace')!r} != {runtime_name!r}"
            )
        if data.get("includePlatforms"):
            err(f"Runtime asmdef 의 includePlatforms 는 비어 있어야 합니다: {path.name}")

    for path in editor_files:
        data = load_asmdef(path)
        if data is None:
            continue
        name = data.get("name", "")
        if not name.endswith(".Editor"):
            err(f"Editor asmdef 이름은 .Editor 로 끝나야 합니다: {name!r}")
        if data.get("includePlatforms") != ["Editor"]:
            err(
                f'Editor asmdef 에 includePlatforms: ["Editor"] 가 없습니다: {path.name} — '
                "플레이어 빌드가 깨집니다."
            )
        if runtime_name and runtime_name not in (data.get("references") or []):
            err(f"Editor asmdef 이 Runtime asmdef({runtime_name})을 참조하지 않습니다.")
        if data.get("rootNamespace") != runtime_name:
            warn(f"Editor asmdef 의 rootNamespace 를 {runtime_name!r} 로 맞추는 것을 권장합니다.")


def check_source(package_dir: Path) -> None:
    runtime_dir = package_dir / "Runtime"
    if runtime_dir.is_dir():
        for source in runtime_dir.rglob("*.cs"):
            text = source.read_text(encoding="utf-8", errors="replace")
            if re.search(r"^\s*using\s+UnityEditor", text, re.MULTILINE) and "#if UNITY_EDITOR" not in text:
                err(
                    f"Runtime 코드가 UnityEditor 를 참조합니다 (빌드 실패): "
                    f"{source.relative_to(package_dir)} — #if UNITY_EDITOR 로 감싸세요."
                )

    for source in package_dir.rglob("*.cs"):
        if "Samples~" in source.parts:
            continue
        text = source.read_text(encoding="utf-8", errors="replace")
        namespaces = re.findall(r"^\s*namespace\s+([A-Za-z0-9_.]+)", text, re.MULTILINE)
        if not namespaces:
            err(f"네임스페이스 선언이 없습니다: {source.relative_to(package_dir)}")
        for namespace in namespaces:
            if namespace != "CAT" and not namespace.startswith("CAT."):
                err(f"네임스페이스가 CAT 하위가 아닙니다: {source.relative_to(package_dir)}: {namespace}")

        for attribute in ("MenuItem", "AddComponentMenu", "CreateAssetMenu"):
            for match in re.finditer(rf'{attribute}\s*\(\s*(?:menuName\s*=\s*)?"([^"]+)"', text):
                menu = match.group(1)
                if not menu.startswith("CAT/"):
                    err(
                        f"에디터 메뉴 최상위가 CAT 이 아닙니다: "
                        f"{source.relative_to(package_dir)}: {attribute}(\"{menu}\")"
                    )

    for shader in package_dir.rglob("*.shader"):
        if "Samples~" in shader.parts:
            continue
        text = shader.read_text(encoding="utf-8", errors="replace")
        match = re.search(r'^\s*Shader\s+"([^"]+)"', text, re.MULTILINE)
        if match and not match.group(1).startswith("CAT/"):
            warn(f"셰이더 이름이 CAT/ 로 시작하지 않습니다: {shader.relative_to(package_dir)}: {match.group(1)}")


# --------------------------------------------------------------------------- #
# .meta
# --------------------------------------------------------------------------- #


def check_meta_files(package_dir: Path) -> None:
    missing: list[str] = []
    orphan: list[str] = []

    for path in sorted(package_dir.rglob("*")):
        relative = path.relative_to(package_dir)
        name = path.name

        if name in META_EXEMPT_NAMES:
            continue
        # Samples~ 폴더 자체와 각 샘플 루트 폴더는 Unity 에 보이지 않는다.
        # Import 시 샘플 루트의 '내용'만 Assets 아래로 복사되므로 그 아래부터 .meta 가 필요하다.
        if relative.parts[0] == "Samples~" and len(relative.parts) <= 2 and path.is_dir():
            continue
        if name.endswith(".meta"):
            target = path.with_suffix("")
            if not target.exists():
                orphan.append(str(relative))
            continue
        if any(part.startswith(".") for part in relative.parts):
            continue

        if not path.with_name(name + ".meta").exists():
            missing.append(str(relative))

    for item in missing:
        err(f".meta 파일이 없습니다: {item}")
    for item in orphan:
        warn(f"대상이 없는 .meta 파일: {item}")


# --------------------------------------------------------------------------- #
# 프로젝트 매니페스트 / 잠금 파일
# --------------------------------------------------------------------------- #


def check_manifest(project: Path, package_name: str) -> None:
    manifest_path = project / "Packages" / "manifest.json"
    if manifest_path.is_file():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8-sig"))
        except json.JSONDecodeError as error:
            err(f"Packages/manifest.json 파싱 실패: {error}")
        else:
            dependencies = manifest.get("dependencies") or {}
            if package_name in dependencies:
                err(
                    f"manifest.json 에 {package_name} 잔여 항목이 있습니다: "
                    f"{dependencies[package_name]!r} — 임베디드 패키지와 충돌합니다. 삭제하세요."
                )
            for dep, value in dependencies.items():
                if isinstance(value, str) and (value.startswith("http") or value.endswith(".git")):
                    warn(f"개발 프로젝트가 git URL 의존성을 씁니다: {dep} — 패키지 해석 실패 원인이 될 수 있습니다.")

    lock_path = project / "Packages" / "packages-lock.json"
    if lock_path.is_file():
        try:
            lock = json.loads(lock_path.read_text(encoding="utf-8-sig"))
        except json.JSONDecodeError:
            warn("packages-lock.json 파싱 실패. 삭제하고 Unity 를 다시 열면 재생성됩니다.")
            return
        entry = (lock.get("dependencies") or {}).get(package_name)
        if entry and entry.get("source") != "embedded":
            err(
                f"packages-lock.json 의 {package_name} source 가 {entry.get('source')!r} 입니다. "
                "packages-lock.json 을 삭제하고 Unity 를 다시 여세요."
            )


# --------------------------------------------------------------------------- #
# git
# --------------------------------------------------------------------------- #


def check_git(project: Path, package_dir: Path) -> None:
    if git(project, "rev-parse", "--git-dir") is None:
        warn("git 저장소가 아닙니다. 레포 생성 전이라면 정상입니다.")
        return

    relative = package_dir.relative_to(project).as_posix()

    staged = git(project, "ls-files", "-s", "Packages") or ""
    for line in staged.splitlines():
        if line.startswith("160000"):
            err(f"gitlink(서브모듈)로 등록된 경로가 있습니다 — 원격에서는 빈 폴더가 됩니다: {line}")

    tracked = git(project, "ls-files", relative) or ""
    tracked_count = len([line for line in tracked.splitlines() if line.strip()])
    if tracked_count == 0:
        warn(f"{relative} 에 추적 중인 파일이 없습니다. 아직 add 하지 않았다면 정상입니다.")

    # gitignore 에 걸린 패키지 파일 탐지 (숨김 디렉터리는 별도로 '작업 산출물'로 보고된다)
    candidates = [
        path.relative_to(project).as_posix()
        for path in package_dir.rglob("*")
        if path.is_file()
        and not path.name.endswith(".meta")
        and not any(part.startswith(".") for part in path.relative_to(package_dir).parts)
    ]
    ignored: list[str] = []
    if candidates:
        result = subprocess.run(
            ["git", "check-ignore", "--stdin"],
            cwd=project,
            input="\n".join(candidates),
            capture_output=True,
            text=True,
            check=False,
        )
        ignored = [line for line in result.stdout.splitlines() if line.strip()]
    for item in ignored[:20]:
        err(f".gitignore 가 패키지 파일을 제외합니다: {item}")
    if len(ignored) > 20:
        err(f".gitignore 로 제외된 패키지 파일이 {len(ignored)}개 더 있습니다.")

    if (package_dir / "Samples~").is_dir():
        gitignore = project / ".gitignore"
        text = gitignore.read_text(encoding="utf-8", errors="replace") if gitignore.is_file() else ""
        if "Samples~" not in text:
            warn(
                ".gitignore 에 Samples~ 예외(!**/Samples~/, !**/Samples~/**)가 없습니다. "
                "전역 gitignore 의 *~ 패턴에 걸릴 수 있습니다."
            )


# --------------------------------------------------------------------------- #
# 버전 일관성 · 배포 준비물
# --------------------------------------------------------------------------- #


def check_version_consistency(project: Path, package_dir: Path, data: dict) -> None:
    version = str(data.get("version", ""))
    changelog = package_dir / "CHANGELOG.md"
    if changelog.is_file():
        text = changelog.read_text(encoding="utf-8", errors="replace")
        match = re.search(r"^##\s*\[?(\d+\.\d+\.\d+[^\]\s]*)\]?", text, re.MULTILINE)
        if not match:
            err("CHANGELOG.md 에서 버전 항목을 찾지 못했습니다. '## [1.0.0] - YYYY-MM-DD' 형식으로 작성하세요.")
        elif match.group(1) != version:
            err(
                f"버전 불일치: package.json={version}, CHANGELOG 최상단={match.group(1)}"
            )

    tags = git(project, "tag", "--list", f"v{version}")
    if tags is not None and tags.strip() == "" and version:
        warn(f"git 태그 v{version} 이 아직 없습니다. 배포 단계에서 생성하세요.")


def check_release_assets(project: Path, package_name: str) -> None:
    readme = project / "README.md"
    if not readme.is_file():
        err("레포 루트에 README.md 가 없습니다.")
    else:
        text = readme.read_text(encoding="utf-8", errors="replace")
        if f"openupm add {package_name}" not in text:
            warn(f"루트 README 에 'openupm add {package_name}' 설치 안내가 없습니다.")
        if '"name": "zzamjak"' not in text and "scopedRegistries" in text:
            warn('루트 README 의 스코프 레지스트리 이름을 "zzamjak" 으로 통일하세요.')

    if not any(project.glob("LICENSE*")):
        err("레포 루트에 LICENSE 파일이 없습니다. OpenUPM 등록 조건입니다.")

    workflow = project / ".github" / "workflows" / "openupm.yml"
    if not workflow.is_file():
        warn(".github/workflows/openupm.yml 이 없습니다. 태그 배포 후 색인이 지연됩니다.")
    else:
        text = workflow.read_text(encoding="utf-8", errors="replace")
        if package_name not in text:
            err(f"openupm.yml 의 package 값이 {package_name} 와 다릅니다.")
        if "id-token: write" not in text:
            err("openupm.yml 에 permissions.id-token: write 가 없어 액션 인증이 실패합니다.")

    if not (project / "openupm-package.yml").is_file():
        warn("openupm-package.yml (등록 메타데이터 사본)이 없습니다. 최초 등록 전이라면 정상입니다.")


# --------------------------------------------------------------------------- #


def main() -> int:
    parser = argparse.ArgumentParser(description="com.zzamjak.* UPM 패키지 배포 준비 검증")
    parser.add_argument("project", help="Unity 프로젝트 루트 경로")
    parser.add_argument("--package", help="검사할 패키지 폴더 이름 (기본: 자동 탐지)")
    parser.add_argument(
        "--allow-dependency",
        action="append",
        default=[],
        metavar="PKG",
        help="의도적으로 허용하는 외부 의존성 (여러 번 지정 가능). 남용하지 말 것.",
    )
    args = parser.parse_args()

    project = Path(args.project).expanduser().resolve()
    if not project.is_dir():
        print(f"오류: 경로가 없습니다: {project}", file=sys.stderr)
        return 2

    check_project_skeleton(project)
    package_dir = find_package_dir(project, args.package)

    if package_dir is not None:
        data = check_package_json(package_dir, set(args.allow_dependency))
        check_layout(package_dir)
        check_asmdefs(package_dir)
        check_source(package_dir)
        check_meta_files(package_dir)
        check_git(project, package_dir)
        if data:
            check_doc_urls(project, data)
            check_samples(package_dir, data)
            check_manifest(project, data.get("name", package_dir.name))
            check_version_consistency(project, package_dir, data)
            check_release_assets(project, data.get("name", package_dir.name))

    for message in WARNINGS:
        print(f"경고: {message}")
    for message in ERRORS:
        print(f"오류: {message}", file=sys.stderr)

    target = package_dir.name if package_dir else "(패키지 미검출)"
    print(f"\n검증 대상: {target} — 오류 {len(ERRORS)}건, 경고 {len(WARNINGS)}건")
    return 1 if ERRORS else 0


if __name__ == "__main__":
    raise SystemExit(main())
