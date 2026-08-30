#!/usr/bin/env python3
"""저장소의 모든 스킬 frontmatter를 검증한다."""

from __future__ import annotations

import re
import sys
from collections import Counter
from pathlib import Path

import yaml


MAX_SKILL_NAME_LENGTH = 64
ALLOWED_PROPERTIES = {"name", "description", "license", "allowed-tools", "metadata"}
SKILL_PATH_PATTERN = re.compile(
    r"^[a-z0-9]+(?:-[a-z0-9]+)*/[a-z0-9]+(?:-[a-z0-9]+)*/SKILL\.md$"
)


def validate_skill(skill_file: Path, skills_root: Path) -> tuple[list[str], str | None]:
    """단일 SKILL.md의 경로와 canonical frontmatter 규칙을 검사한다."""
    errors: list[str] = []
    relative_path = skill_file.relative_to(skills_root).as_posix()

    if not SKILL_PATH_PATTERN.fullmatch(relative_path):
        return (
            [
                "SKILL.md는 skills/<category>/<skill-name>/SKILL.md 깊이에만 "
                f"둘 수 있습니다: {relative_path}"
            ],
            None,
        )

    content = skill_file.read_text(encoding="utf-8")
    match = re.match(r"^---\n(.*?)\n---", content, re.DOTALL)
    if not match:
        return [f"YAML frontmatter 형식이 잘못됐습니다: {relative_path}"], None

    try:
        frontmatter = yaml.safe_load(match.group(1))
    except yaml.YAMLError as error:
        return [f"YAML frontmatter를 읽을 수 없습니다: {relative_path}: {error}"], None

    if not isinstance(frontmatter, dict):
        return [f"frontmatter는 YAML 매핑이어야 합니다: {relative_path}"], None

    unexpected_keys = set(frontmatter) - ALLOWED_PROPERTIES
    if unexpected_keys:
        errors.append(
            f"허용되지 않은 frontmatter 키가 있습니다: {relative_path}: "
            + ", ".join(sorted(unexpected_keys))
        )

    name = frontmatter.get("name")
    description = frontmatter.get("description")

    normalized_name: str | None = None
    if not isinstance(name, str) or not name.strip():
        errors.append(f"name은 비어 있지 않은 문자열이어야 합니다: {relative_path}")
    else:
        normalized_name = name.strip()
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", normalized_name):
            errors.append(f"name은 올바른 하이픈 표기여야 합니다: {relative_path}")
        if len(normalized_name) > MAX_SKILL_NAME_LENGTH:
            errors.append(
                f"name은 {MAX_SKILL_NAME_LENGTH}자를 초과할 수 없습니다: {relative_path}"
            )
        if normalized_name != skill_file.parent.name:
            errors.append(f"name과 스킬 폴더 이름이 다릅니다: {relative_path}")

    if not isinstance(description, str) or not description.strip():
        errors.append(f"description은 비어 있지 않은 문자열이어야 합니다: {relative_path}")
    else:
        description = description.strip()
        if description.startswith("[TODO:"):
            errors.append(f"description에 미완성 TODO가 있습니다: {relative_path}")
        if "<" in description or ">" in description:
            errors.append(f"description에 꺾쇠괄호를 사용할 수 없습니다: {relative_path}")
        if len(description) > 1024:
            errors.append(f"description은 1024자를 초과할 수 없습니다: {relative_path}")

    body = content[match.end() :]
    fence_marker: str | None = None
    fence_length = 0
    for line in body.splitlines():
        fence = re.match(r"^[ \t]*(?:(?:[-+*]|\d+[.)])[ \t]+)?(`{3,}|~{3,})(.*)$", line)
        if fence:
            marker = fence.group(1)
            if fence_marker is None:
                fence_marker = marker[0]
                fence_length = len(marker)
            elif marker[0] == fence_marker and len(marker) >= fence_length and not fence.group(2).strip():
                fence_marker = None
                fence_length = 0
            continue

        if fence_marker is None and re.fullmatch(r"[ ]{0,3}\[TODO:[^\n]*\][ \t]*", line):
            errors.append(f"본문에 미완성 TODO가 있습니다: {relative_path}")
            break

    return errors, normalized_name


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    skills_root = repo_root / "skills"
    skill_files = sorted(skills_root.rglob("SKILL.md"))

    if not skill_files:
        print("오류: 등록된 스킬이 없습니다.", file=sys.stderr)
        return 1

    errors: list[str] = []
    names: list[str] = []
    for skill_file in skill_files:
        skill_errors, name = validate_skill(skill_file, skills_root)
        errors.extend(skill_errors)
        if name:
            names.append(name)

    duplicate_names = sorted(name for name, count in Counter(names).items() if count > 1)
    if duplicate_names:
        errors.append("저장소 전체에서 중복된 스킬 이름이 있습니다: " + ", ".join(duplicate_names))

    if errors:
        for error in errors:
            print(f"오류: {error}", file=sys.stderr)
        return 1

    print(f"frontmatter 검증 완료: {len(skill_files)}개 스킬")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
