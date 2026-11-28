#!/usr/bin/env python3
"""홍보 일정 JSON을 Apple·Google 캘린더에서 가져올 수 있는 .ics로 바꾼다.

JSON 형식:
{
  "events": [
    {"id": "weekly-screenshot-saturday", "title": "...", "start": "2026-12-05T10:00",
     "minutes": 20, "rrule": "FREQ=WEEKLY;BYDAY=SA", "description": "...", "alarm_minutes": 30},
    {"id": "quickfolder-launch-geeknews", "title": "...", "start": "2026-12-09T09:00"}
  ]
}
start는 Asia/Seoul 기준. rrule·description·minutes(기본 30)·alarm_minutes(기본 30)는 선택.
"""
import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

TZID = "Asia/Seoul"
VTIMEZONE = """BEGIN:VTIMEZONE
TZID:Asia/Seoul
BEGIN:STANDARD
DTSTART:19700101T000000
TZOFFSETFROM:+0900
TZOFFSETTO:+0900
TZNAME:KST
END:STANDARD
END:VTIMEZONE"""


def escape(text: str) -> str:
    return (text.replace("\\", "\\\\").replace(";", "\\;")
            .replace(",", "\\,").replace("\n", "\\n"))


def fold(line: str) -> str:
    # RFC 5545: 75옥텟마다 줄을 접는다(UTF-8 글자 중간에서 자르지 않음).
    out, current = [], b""
    for char in line:
        encoded = char.encode("utf-8")
        if len(current) + len(encoded) > (75 if not out else 74):
            out.append(current.decode("utf-8"))
            current = b""
        current += encoded
    out.append(current.decode("utf-8"))
    return "\r\n ".join(out)


def build(events: list[dict]) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//zzamjak//project-promo//KO",
             "CALSCALE:GREGORIAN", "X-WR-CALNAME:프로젝트 홍보", *VTIMEZONE.splitlines()]
    seen = set()
    for event in events:
        uid = event["id"]
        if uid in seen:
            sys.exit(f"오류: id 중복: {uid}")
        seen.add(uid)
        start = datetime.fromisoformat(event["start"])
        end = start + timedelta(minutes=int(event.get("minutes", 30)))
        lines += [
            "BEGIN:VEVENT",
            f"UID:{uid}@project-promo",
            f"DTSTAMP:{stamp}",
            f"DTSTART;TZID={TZID}:{start:%Y%m%dT%H%M%S}",
            f"DTEND;TZID={TZID}:{end:%Y%m%dT%H%M%S}",
            f"SUMMARY:{escape(event['title'])}",
        ]
        if event.get("description"):
            lines.append(f"DESCRIPTION:{escape(event['description'])}")
        if event.get("rrule"):
            lines.append(f"RRULE:{event['rrule']}")
        lines += ["BEGIN:VALARM", "ACTION:DISPLAY", f"DESCRIPTION:{escape(event['title'])}",
                  f"TRIGGER:-PT{int(event.get('alarm_minutes', 30))}M", "END:VALARM", "END:VEVENT"]
    lines.append("END:VCALENDAR")
    return "\r\n".join(fold(line) for line in lines) + "\r\n"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("input", help="calendar.json")
    parser.add_argument("output", help="출력 .ics")
    args = parser.parse_args()
    data = json.loads(Path(args.input).expanduser().read_text(encoding="utf-8"))
    out = Path(args.output).expanduser()
    out.write_text(build(data["events"]), encoding="utf-8", newline="")
    print(f"완료: {out} ({len(data['events'])}개 일정)")


if __name__ == "__main__":
    main()
