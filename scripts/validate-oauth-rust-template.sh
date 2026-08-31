#!/usr/bin/env bash
set -euo pipefail

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
repo_root="$(dirname -- "$script_dir")"
template="$repo_root/skills/authentication/google-oauth-setup/assets/tauri-v2/backend/oauth_loopback.rs.template"
fixture="$(mktemp -d)"
trap 'rm -rf -- "$fixture"' EXIT

cargo init --lib --name oauth_template_check "$fixture" --quiet
cp "$template" "$fixture/src/lib.rs"

cd "$fixture"
cargo add base64 rand sha2 url --quiet
cargo add tokio --features net,io-util,time,macros,rt --quiet
cargo tree --depth 1
cargo fmt --check
cargo test --quiet
