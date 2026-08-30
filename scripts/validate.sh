#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
repo_root="$(dirname -- "$script_dir")"
skills_root="$repo_root/skills"

if [[ ! -d "$skills_root" ]]; then
  echo "오류: skills 디렉터리가 없습니다." >&2
  exit 1
fi

skill_files=()
while IFS= read -r skill_file; do
  relative_path="${skill_file#"$skills_root/"}"
  if [[ ! "$relative_path" =~ ^[a-z0-9]+(-[a-z0-9]+)*/[a-z0-9]+(-[a-z0-9]+)*/SKILL\.md$ ]]; then
    echo "오류: SKILL.md는 skills/<category>/<skill-name>/SKILL.md 깊이에만 둘 수 있습니다: $relative_path" >&2
    exit 1
  fi
  skill_files+=("$skill_file")
done < <(find "$skills_root" -name SKILL.md | LC_ALL=C sort)

if [[ ${#skill_files[@]} -eq 0 ]]; then
  echo "오류: 등록된 스킬이 없습니다." >&2
  exit 1
fi

skill_names=()
for skill_file in "${skill_files[@]}"; do
  skill_dir="$(dirname -- "$skill_file")"
  category_dir="$(dirname -- "$skill_dir")"
  skill_name="$(basename -- "$skill_dir")"
  category_name="$(basename -- "$category_dir")"

  if [[ ! "$category_name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
    echo "오류: 잘못된 카테고리 이름: $category_name" >&2
    exit 1
  fi

  if [[ ! "$skill_name" =~ ^[a-z0-9]+(-[a-z0-9]+)*$ ]]; then
    echo "오류: 잘못된 스킬 이름: $skill_name" >&2
    exit 1
  fi

  declared_name="$(grep -m 1 '^name:' "$skill_file" | cut -d: -f2-)"
  declared_name="${declared_name#"${declared_name%%[![:space:]]*}"}"
  declared_name="${declared_name%"${declared_name##*[![:space:]]}"}"
  declared_name="${declared_name#\"}"
  declared_name="${declared_name%\"}"
  declared_name="${declared_name#\'}"
  declared_name="${declared_name%\'}"
  if [[ "$declared_name" != "$skill_name" ]]; then
    echo "오류: 폴더 이름과 SKILL.md name이 다릅니다: $skill_file" >&2
    exit 1
  fi

  if ! grep -q '^description:[[:space:]]*.' "$skill_file"; then
    echo "오류: description이 없습니다: $skill_file" >&2
    exit 1
  fi

  skill_names+=("$skill_name")
done

duplicates="$(printf '%s\n' "${skill_names[@]}" | LC_ALL=C sort | uniq -d)"
if [[ -n "$duplicates" ]]; then
  echo "오류: 저장소 전체에서 중복된 스킬 이름이 있습니다:" >&2
  printf '%s\n' "$duplicates" >&2
  exit 1
fi

echo "검증 완료: ${#skill_files[@]}개 스킬"
