#!/usr/bin/env python3
"""홍보용 이미지 카드(OG·X·YouTube 썸네일·쇼츠 커버 등)를 headless Chrome으로 렌더링한다."""
import argparse
import base64
import html
import mimetypes
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

PRESETS = {
    "og": (1200, 630),          # GitHub Pages·링크 미리보기·Reddit·LinkedIn 링크
    "x": (1600, 900),           # X 이미지 게시
    "linkedin": (1200, 1200),   # LinkedIn 정사각형 이미지 게시
    "youtube": (1280, 720),     # YouTube 썸네일
    "shorts": (1080, 1920),     # Shorts·TikTok·Reels 커버
    "producthunt": (1270, 760), # Product Hunt 갤러리
    "itch": (630, 500),         # itch.io 커버
    "github": (1280, 640),      # GitHub 저장소 Social preview
}

CHROME_CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "google-chrome",
    "chromium",
]


def find_chrome() -> str:
    for candidate in CHROME_CANDIDATES:
        if Path(candidate).exists() or shutil.which(candidate):
            return candidate
    sys.exit("오류: Chrome/Chromium을 찾을 수 없습니다.")


def image_tag(path: str | None) -> str:
    if not path:
        return ""
    data = Path(path).read_bytes()
    mime = mimetypes.guess_type(path)[0] or "image/png"
    return f'<img src="data:{mime};base64,{base64.b64encode(data).decode()}">'


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--preset", choices=PRESETS, required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--subtitle", default="")
    parser.add_argument("--tag", default="", help="예: Blender Add-on / Free & Open Source")
    parser.add_argument("--url", default="")
    parser.add_argument("--image", help="오른쪽(세로면 아래)에 넣을 스크린샷")
    parser.add_argument("--accent", default="#ffb000")
    parser.add_argument("--bg", default="linear-gradient(135deg, #15151c 0%, #232336 100%)")
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    width, height = PRESETS[args.preset]
    portrait = height > width
    square = height == width
    unit = min(width, height) / 100 * (1.6 if portrait else 1.0)

    template = (Path(__file__).parent.parent / "assets" / "card.html").read_text(encoding="utf-8")
    values = {
        "WIDTH": str(width),
        "HEIGHT": str(height),
        "UNIT": f"{unit:.2f}px",
        "DIRECTION": "column" if portrait or square else "row",
        "BG": args.bg,
        "ACCENT": args.accent,
        "TAG": html.escape(args.tag),
        "TITLE": html.escape(args.title),
        "SUBTITLE": html.escape(args.subtitle),
        "URL": html.escape(args.url),
        "IMAGE": image_tag(args.image),
    }
    for key, value in values.items():
        template = template.replace("{{" + key + "}}", value)
    if not args.tag:
        template = template.replace('<span class="tag"></span>', "")

    out = Path(args.out).expanduser().resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        page = Path(tmp) / "card.html"
        page.write_text(template, encoding="utf-8")
        subprocess.run(
            [
                find_chrome(), "--headless=new", "--disable-gpu", "--hide-scrollbars",
                "--force-device-scale-factor=1", f"--window-size={width},{height}",
                f"--screenshot={out}", page.as_uri(),
            ],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
    print(f"완료: {out} ({width}x{height})")


if __name__ == "__main__":
    main()
