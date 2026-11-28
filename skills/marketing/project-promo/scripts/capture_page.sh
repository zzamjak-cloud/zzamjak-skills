#!/usr/bin/env bash
# GitHub Pages 소개 페이지 등 웹 페이지를 스크린샷으로 찍는다(카드·갤러리 재료).
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "사용법: $0 <URL> <출력.png> [가로=1440] [세로=900]" >&2
  exit 2
fi

url="$1"; output="$2"; width="${3:-1440}"; height="${4:-900}"
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
[[ -x "$chrome" ]] || chrome="$(command -v chromium || command -v google-chrome || true)"
[[ -n "$chrome" ]] || { echo "오류: Chrome/Chromium을 찾을 수 없습니다." >&2; exit 1; }

mkdir -p "$(dirname -- "$output")"
"$chrome" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=2 \
  --virtual-time-budget=5000 --window-size="${width},${height}" \
  --screenshot="$(cd "$(dirname -- "$output")" && pwd)/$(basename -- "$output")" "$url" >/dev/null 2>&1
echo "완료: $output"
