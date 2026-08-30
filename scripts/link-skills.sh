#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
repo_root="$(dirname -- "$script_dir")"
skills_root="$repo_root/skills"
codex_root="${CODEX_HOME:-${HOME}/.codex}/skills"
claude_root="${CLAUDE_CONFIG_DIR:-${HOME}/.claude}/skills"
install_codex=true
install_claude=true
backup_existing=false
dry_run=false
timestamp="$(date +%Y%m%d-%H%M%S)"

usage() {
  echo "사용법: $0 [--codex-only|--claude-only] [--backup-existing] [--dry-run]"
}

for argument in "$@"; do
  case "$argument" in
    --codex-only)
      install_claude=false
      ;;
    --claude-only)
      install_codex=false
      ;;
    --backup-existing)
      backup_existing=true
      ;;
    --dry-run)
      dry_run=true
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "오류: 알 수 없는 옵션: $argument" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ "$install_codex" == false && "$install_claude" == false ]]; then
  echo "오류: --codex-only와 --claude-only를 함께 사용할 수 없습니다." >&2
  exit 2
fi

"$script_dir/validate.sh" >/dev/null

link_skill() {
  local target_root="$1"
  local skill_dir="$2"
  local skill_name target backup_root existing_target

  skill_name="$(basename -- "$skill_dir")"
  target="$target_root/$skill_name"

  if [[ -L "$target" ]]; then
    existing_target="$(readlink "$target")"
    if [[ "$existing_target" == "$skill_dir" ]]; then
      echo "유지: $target"
      return
    fi
  fi

  if [[ -e "$target" || -L "$target" ]]; then
    if [[ "$backup_existing" != true ]]; then
      echo "오류: 기존 항목을 덮어쓰지 않습니다: $target" >&2
      echo "계속하려면 --backup-existing을 사용하세요." >&2
      return 1
    fi

    backup_root="$target_root/.skill-backups/$timestamp"
    if [[ "$dry_run" == true ]]; then
      echo "백업 예정: $target -> $backup_root/$skill_name"
    else
      mkdir -p "$backup_root"
      mv "$target" "$backup_root/$skill_name"
      echo "백업: $backup_root/$skill_name"
    fi
  fi

  if [[ "$dry_run" == true ]]; then
    echo "연결 예정: $target -> $skill_dir"
  else
    mkdir -p "$target_root"
    ln -s "$skill_dir" "$target"
    echo "연결: $target -> $skill_dir"
  fi
}

install_for_target() {
  local target_root="$1"
  local skill_file skill_dir

  while IFS= read -r skill_file; do
    skill_dir="$(dirname -- "$skill_file")"
    link_skill "$target_root" "$skill_dir"
  done < <(find "$skills_root" -mindepth 3 -maxdepth 3 -type f -name SKILL.md | LC_ALL=C sort)
}

if [[ "$install_codex" == true ]]; then
  install_for_target "$codex_root"
fi

if [[ "$install_claude" == true ]]; then
  install_for_target "$claude_root"
fi

