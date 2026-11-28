#!/usr/bin/env bash
# 화면 녹화를 README·포럼·X용 GIF로 바꾼다(팔레트 2패스라 색이 깨지지 않음).
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "사용법: $0 <입력영상> <출력.gif> [시작초=0] [길이초=8] [가로폭=960] [fps=15] [배속=1]" >&2
  exit 2
fi

input="$1"; output="$2"
start="${3:-0}"; duration="${4:-8}"; width="${5:-960}"; fps="${6:-15}"; speed="${7:-1}"

command -v ffmpeg >/dev/null || { echo "오류: ffmpeg가 필요합니다 (brew install ffmpeg)" >&2; exit 1; }

base="setpts=PTS/${speed},fps=${fps},scale=${width}:-1:flags=lanczos"
ffmpeg -y -hide_banner -loglevel error -ss "$start" -t "$duration" -i "$input" \
  -filter_complex "[0:v]${base},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" \
  "$output"

size=$(du -h "$output" | cut -f1)
echo "완료: $output ($size) — 10MB 넘으면 가로폭·fps·길이를 줄인다"
