#!/usr/bin/env bash
# 가로 화면 녹화를 쇼츠용 1080x1920 세로 영상으로 바꾼다(배경은 흐린 확대본).
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "사용법: $0 <입력영상> <출력.mp4> [시작초=0] [길이초=전체] [배속=1] [자르기=w:h:x:y]" >&2
  echo "  자르기: 원본에서 이 영역만 써서 크게 보여 준다(글자가 작은 분할 화면용)" >&2
  exit 2
fi

input="$1"
output="$2"
start="${3:-0}"
duration="${4:-}"
speed="${5:-1}"
crop="${6:-}"

command -v ffmpeg >/dev/null || { echo "오류: ffmpeg가 필요합니다 (brew install ffmpeg)" >&2; exit 1; }

trim_args=(-ss "$start")
[[ -n "$duration" ]] && trim_args+=(-t "$duration")

pre="setpts=PTS/${speed}"
[[ -n "$crop" ]] && pre="crop=${crop},${pre}"

filter="[0:v]${pre},split[a][b];\
[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=20:2,eq=brightness=-0.15[bg];\
[b]scale=1080:1920:force_original_aspect_ratio=decrease[fg];\
[bg][fg]overlay=(W-w)/2:(H-h)/2,fps=30,format=yuv420p[v]"

ffmpeg -y -hide_banner -loglevel error "${trim_args[@]}" -i "$input" \
  -filter_complex "$filter" -map "[v]" -an \
  -c:v libx264 -preset medium -crf 20 -movflags +faststart "$output"

echo "완료: $output"
