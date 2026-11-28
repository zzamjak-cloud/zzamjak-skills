---
name: project-promo
description: "zzamjak의 개인 프로젝트(Blender 애드온·Unity 패키지·Godot 애드온·Tauri AI 데스크톱 도구·Claude 스킬/MCP·게임)를 공개·홍보할 때 사용한다. 프로젝트 README·docs·GitHub Pages를 읽어 성격을 판별하고, 어디에 올릴지(채널 지도), 채널별 글 초안(X·LinkedIn·Reddit·GeekNews·디스콰이엇·Show HN·포럼), 영상 기획(YouTube·Shorts·TikTok·Reels 대본·자막·세로 영상 변환), 단계별 게시 일정과 게시 기록을 만든다. 홍보 글, 런칭, 소개, 어디에 올려, 쇼츠 만들어 같은 요청에 쓴다. 자동 게시는 하지 않는다."
---

# 프로젝트 홍보 키트

사용자는 SNS 활동을 거의 하지 않는 1인 개발자다. 목표는 **글쓰기와 채널 선택 부담을 0에 가깝게** 만드는 것이다. 사용자는 초안을 검토해서 복사·게시만 한다.

## 원칙

- **자동 게시 금지.** Reddit 등은 봇·홍보 전용 계정을 차단한다. 초안·링크·체크리스트까지만 만든다.
- **과장 금지.** 문서에 없는 기능·수치·사용자 수를 지어내지 않는다. 모르면 `(확인 필요)`로 남긴다.
- **개인 경험을 지어내지 않는다.** 글은 사용자 이름으로 게시된다. "매일 쓴다", "프로젝트 5개" 같은 경험·숫자는 사용자가 말한 것만 쓰고, 없으면 일반화된 문장으로 쓴 뒤 마지막에 실제 경험을 물어 채운다.
- **채널마다 다른 글.** 같은 문장을 복붙하지 않는다. 채널 문화(→ `references/channels.md`)에 맞춰 길이·톤·언어를 바꾼다.
- **데모가 먼저.** 모든 글은 GIF·영상·스크린샷 1개 이상을 전제로 한다. 시각 자료가 없으면 영상 기획부터 제안한다.
- 커뮤니티 규칙은 바뀐다. 각 초안 위에 "게시 전 사이드바/규칙 확인" 체크 항목을 반드시 넣는다.

## 출력 위치

`~/dev/promo/`에 모은다(프로젝트 저장소·GitHub Pages 소스 폴더에 초안을 넣지 않는다).

```text
~/dev/promo/
├── ledger.md                 전 프로젝트 게시 기록(채널·날짜·링크·반응)
├── calendar.json             정기·런칭 일정 원본
├── promo-calendar.ics        캘린더 가져오기용(make_calendar.py 결과)
└── <ProjectName>/
    ├── brief.md              프로젝트 요약(한 줄 소개·문제·대상·핵심 기능 3개·링크·시각 자료 목록)
    ├── kit.md                채널별 글 초안(복사해서 바로 게시할 완성 문구)
    ├── video.md              영상 기획(Shorts/TikTok/Reels 대본·자막·캡션·해시태그, YouTube 롱폼 구성·설명란)
    ├── schedule.md           게시 일정(2~3주 분할)
    └── assets/               게시용 리소스 일체
        ├── page.png              Pages 소개 페이지 캡처
        ├── card-og.png           링크 미리보기 1200x630 (Pages og:image·Reddit·LinkedIn)
        ├── card-github.png       GitHub Social preview 1280x640
        ├── card-x.png            X 1600x900
        ├── card-linkedin.png     LinkedIn 1200x1200
        ├── thumb-youtube.png     YouTube 썸네일 1280x720
        ├── cover-shorts.png      쇼츠 커버 1080x1920
        ├── demo.gif              README·포럼·X용 GIF
        └── short.mp4             세로 쇼츠 영상(녹화본이 있을 때)
```

## 절차

1. **읽기**: 프로젝트의 README, GitHub Pages 소스(`docs/`·`site/` 등 — `.github/workflows/pages.yml`이나 저장소 Pages 설정에서 실제 경로 확인. 그 안의 데모 영상·스크린샷·`og:image`를 먼저 수집), 매니페스트(`blender_manifest.toml`·`package.json`·`plugin.cfg`·`tauri.conf.json`), 최근 릴리스 태그를 읽는다. Pages URL·저장소 URL·다운로드/설치 경로를 확보한다.
2. **판별**: 성격을 하나 고른다 — `blender` · `unity` · `godot` · `ai-desktop` · `claude-tooling` · `game`. 겹치면 주 성격 1개 + 보조 1개.
3. **brief.md**: 한 줄 소개(한국어·영어), 해결하는 문제, 대상 사용자, 핵심 기능 3개, 차별점, 링크, 가격/라이선스, 있는 시각 자료와 필요한 시각 자료.
   사용자에게 이 brief만 먼저 보여주고 틀린 점을 확인받는다(가장 싼 검증 지점).
4. **채널 선택**: `references/channels.md`의 성격별 표에서 1순위 3~4곳 + 영상 1~2곳을 고른다. 전부 고르지 않는다.
5. **kit.md**: `references/templates.md` 구조로 채널별 초안을 쓴다. 각 초안 머리에 채널·언어·게시 URL(작성 페이지)·체크리스트를 둔다.
6. **video.md**: `references/video.md`에 따라 쇼츠 대본(장면별 화면·자막·길이), 촬영 목록, 캡션·해시태그, 롱폼 구성안을 쓴다. 녹화 원본이 있으면 `scripts/make_vertical.sh`로 9:16 변환까지 해 준다.
7. **리소스 제작**: 위 `assets/` 목록을 전부 만든다. 사용자가 따로 손대지 않아도 게시할 수 있어야 한다.
   - 페이지 캡처: `scripts/capture_page.sh <PagesURL> assets/page.png`
   - 카드·썸네일: `python3 scripts/render_card.py --preset og|github|x|linkedin|youtube|shorts|producthunt|itch --title --subtitle --tag --url --image assets/page.png --out ...`. 제목은 3~6단어 결과 중심, 썸네일은 더 짧게(2~4단어). 프로젝트 대표색이 있으면 `--accent`.
   - 프로젝트에 이미 있는 스크린샷·GIF(`docs/`·README 이미지)를 먼저 재사용한다. 좋은 시각 자료가 없으면 StyleStudio MCP(`ss_generate_batch`)로 썸네일 배경·키 비주얼을 만들 수 있다(견적 dry_run 먼저).
   - 소개 페이지에 데모 영상(mp4)이 이미 있으면 그것으로 GIF·쇼츠를 바로 만든다. 분할 화면처럼 글자가 작으면 `make_vertical.sh`의 6번째 인자(`w:h:x:y`)로 핵심 영역만 잘라 키운다. 구간별로 만든 뒤 커버 이미지 2~3초를 끝에 붙여 ffmpeg concat으로 잇는다.
   - 쇼츠 자막은 `python3 scripts/burn_captions.py <영상> <자막.json> <출력>`으로 영상에 직접 입힌다(영어·한국어판 각각). 자막 JSON은 `<프로젝트>/video/`에 남겨 수정 가능하게 하고, 자막 없는 판도 함께 남긴다.
   - GIF·쇼츠는 화면 녹화가 필요하다. 녹화본이 없으면 video.md의 촬영 목록을 주고 "녹화 파일 경로를 주면 GIF·쇼츠로 바꿔 줌"이라고 안내한다. 받으면 `scripts/make_gif.sh`, `scripts/make_vertical.sh`로 변환한다.
   - Pages에 `og:image`가 없으면 `card-og.png`를 `docs/`에 넣고 meta 태그 추가를 제안한다(저장소 수정은 사용자 확인 후).
   - 만든 이미지는 Read로 열어 글자 잘림·겹침을 확인하고 고친다.
8. **schedule.md + 캘린더**: 한 번에 다 올리지 않는다. 기본 순서 — 1주차 등록소·awesome 목록(한 번 올리면 끝) → 2주차 성격별 커뮤니티 1~2곳 + 쇼츠 → 3주차 넓은 채널(GeekNews/Show HN/Product Hunt/LinkedIn). 요일·시간은 channels.md 권장치.
   런칭 일정과 `references/cadence.md`의 정기 리듬을 `~/dev/promo/calendar.json`에 합치고 `python3 scripts/make_calendar.py ~/dev/promo/calendar.json ~/dev/promo/promo-calendar.ics`로 만든다. 각 일정 설명에 올릴 내용과 초안·리소스 경로를 넣는다. 정기 일정은 이미 있으면 중복 추가하지 않는다(id 고정).
9. **ledger.md 갱신**: 사용자가 "올렸어"라고 하면 날짜·채널·URL을 기록하고, 나중에 반응(좋아요·댓글·스타·다운로드)을 물어 채운다. 반응이 좋은 채널은 다음 프로젝트의 1순위로 올린다.

## 후속 요청 처리

- "댓글 답 써줘": 받은 댓글을 붙여 주면 짧고 고마움을 표하는 답을 쓴다. 비판엔 방어하지 말고 수용·개선 계획으로 답한다.
- "Reddit 평소 활동": 해당 서브레딧의 최근 질문 중 사용자가 답할 수 있는 것을 찾아 답변 초안을 만든다(홍보 링크 없이). 홍보 대 일반 활동 비율 1:9를 권한다.
- "업데이트 소식": 새 버전은 변경점 중심의 짧은 글로, 이전 게시 스레드/채널에만 올린다.
