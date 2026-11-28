#!/usr/bin/env python3
"""영상에 자막을 직접 입힌다(쇼츠·릴스용). drawtext 없는 ffmpeg에서도 동작하도록 자막을 PNG로 그려 얹는다.

자막 JSON 형식:
{"position": 0.18, "size": 64,
 "captions": [{"start": 0, "end": 2.5, "text": "첫 줄\n둘째 줄"}, ...]}
position: 화면 위에서부터 자막 중심 위치 비율(기본 0.18 — 쇼츠 하단 UI를 피함).
"""
import argparse
import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONT_CANDIDATES = [
    Path.home() / "Library/Fonts/Pretendard-ExtraBold.ttf",
    Path("/Library/Fonts/Pretendard-ExtraBold.ttf"),
    Path.home() / "Library/Fonts/Pretendard-Bold.otf",
    Path("/Library/Fonts/Pretendard-Bold.otf"),
    Path.home() / "Library/Fonts/NotoSansKR-Bold.otf",
    Path("/Library/Fonts/NotoSansKR-Bold.otf"),
    Path("/System/Library/Fonts/AppleSDGothicNeo.ttc"),
]


def load_font(size: int) -> ImageFont.FreeTypeFont:
    for path in FONT_CANDIDATES:
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size)


def probe_size(video: str) -> tuple[int, int]:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
         "-of", "csv=p=0", video], capture_output=True, text=True, check=True).stdout.strip()
    width, height = out.split(",")[:2]
    return int(width), int(height)


def render(text: str, width: int, height: int, center_ratio: float, font) -> Image.Image:
    image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    spacing = int(font.size * 0.25)
    box = draw.multiline_textbbox((0, 0), text, font=font, spacing=spacing, align="center")
    text_w, text_h = box[2] - box[0], box[3] - box[1]
    pad_x, pad_y = int(font.size * 0.55), int(font.size * 0.35)
    x = (width - text_w) // 2
    y = int(height * center_ratio - text_h / 2)
    draw.rounded_rectangle(
        (x - pad_x, y - pad_y, x + text_w + pad_x, y + text_h + pad_y * 1.4),
        radius=int(font.size * 0.35), fill=(0, 0, 0, 185))
    draw.multiline_text((x - box[0], y - box[1]), text, font=font, fill=(255, 255, 255, 255),
                        spacing=spacing, align="center")
    return image


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("video")
    parser.add_argument("captions", help="자막 JSON")
    parser.add_argument("output")
    args = parser.parse_args()

    spec = json.loads(Path(args.captions).read_text(encoding="utf-8"))
    width, height = probe_size(args.video)
    font = load_font(int(spec.get("size", 64)))
    center = float(spec.get("position", 0.18))

    with tempfile.TemporaryDirectory() as tmp:
        inputs, chain, last = ["-i", args.video], [], "0:v"
        for index, caption in enumerate(spec["captions"], start=1):
            png = Path(tmp) / f"cap{index}.png"
            render(caption["text"], width, height, center, font).save(png)
            inputs += ["-i", str(png)]
            label = f"v{index}"
            chain.append(f"[{last}][{index}:v]overlay=0:0:"
                         f"enable='between(t,{caption['start']},{caption['end']})'[{label}]")
            last = label
        subprocess.run(
            ["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", *inputs,
             "-filter_complex", ";".join(chain), "-map", f"[{last}]", "-map", "0:a?",
             "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-pix_fmt", "yuv420p",
             "-movflags", "+faststart", args.output], check=True)
    print(f"완료: {args.output} (자막 {len(spec['captions'])}개)")


if __name__ == "__main__":
    main()
