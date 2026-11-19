---
name: merge-asset-library
description: "Godot 머지 게임 프로젝트(Civilization_Merge·Hotel_Merge·Zombie_Merge)에서 3D 모델(.blend·.glb)·사운드·UI 아이콘을 찾거나 들이거나, 새로 만든 것을 등록하거나, .blend 수정본을 맞출 때 사용한다. Google Drive 공유 아트 라이브러리(JP_RscAll/AssetLibrary)와 artlib.py의 status·sync·find·use·register 절차를 다룬다. 모델·아이콘을 새로 만들기 전에 반드시 먼저 본다."
---

# 공유 아트 라이브러리

여러 프로젝트(Zombie_Merge·Civilization_Merge·Hotel_Merge …)가 함께 쓰는 모델(.blend·.glb)·사운드·UI 아이콘 원본 보관소(Google Drive, git 아님). 규칙은 라이브러리의 `AGENTS.md`·`README.md`.

- 위치: `/Users/woody/Library/CloudStorage/GoogleDrive-zzamjak@gmail.com/My Drive/JP_RscAll/AssetLibrary` — 경로에 공백이 있어 따옴표로 감싼다: `AL="python3 \"<위 경로>/tools/artlib.py\""`
- 프로젝트 이름(`<proj>`)은 소문자 스네이크: `civilization_merge`, `hotel_merge`, `zombie_merge`
- 카탈로그(자동 생성): `catalog/catalog.json` · `INDEX.md` · 카테고리별 `*.md` · 썸네일 시트 `catalog/sheets/*.png`(6×6, 칸 아래 id) · 사람용 `catalog/index.html`

## 절차
1. 작업을 시작할 때 `$AL status <proj>` 를 보고, pull·push 가 있으면 `$AL sync <proj>` 한다(받은 파일이 있으면 Godot `--import`).
2. 모델·사운드가 필요하면 새로 만들기 전에 라이브러리에서 먼저 찾는다(`$AL find <낱말>` + 카탈로그 시트). 맞는 것이 있으면 `$AL use <id> <proj> [--as=<kind>]` 로 들이고 `--import`. ZM 모델도 팔레트 V2가 같아 그대로 쓴다.
3. 없을 때만 리소스 제작 파이프라인(`merge-resource-pipeline` 스킬)으로 만들고, 만든 뒤 반드시 `$AL register <proj> <decor/kind…> | --all-new` 로 등록한다. 메타에 한국어 이름·한 줄 설명·태그·쓰임(uses)을 채운다.
4. 사용자가 .blend 를 고치면(「적용해줘」 루틴) 끝에 `$AL sync <proj>` 로 라이브러리 원본을 최신으로 맞춘다. 라이브러리 쪽 수정본은 sync 로 내려받는다. 양쪽이 다 바뀐 충돌은 덮어쓰지 않으니 사용자에게 어느 쪽을 쓸지 묻는다(`--prefer=project|library|newer`).
5. UI 아이콘(`assets/ui/icons`·`absence`·`growth`)도 같은 방식으로 관리한다. 새로 만들기 전에 `$AL find <낱말> --kind=icon`(시트 `catalog/sheets/icon_*.png`)으로 찾고 `$AL use <id> <proj>` 후 `--import`. 새 아이콘은 `$AL register <proj> <png> --category=<cat/sub>` 후 라이브러리 `tools/icon_names.json`에 한 줄 추가한다. 고친 아이콘은 `$AL sync <proj>`로 올리며, 다른 프로젝트도 다음 sync 때 받으므로 한 프로젝트만 다르게 쓰려면 다른 이름으로 등록한다. 모델에서 굽는 아이콘(`assets/ui/items`, `assets/ui/growth/mgr_*` 등)과 도감 축소본 같은 파생물은 넣지 않는다. 자세한 규칙은 라이브러리 `AGENTS.md`의 「UI 아이콘」.

## 명령
`status <proj>` · `sync <proj> [--dry-run] [--prefer=…] [--push-only]` · `find <검색어> [--category=]` · `use <id> <proj> [--as=<kind>]` · `register <proj> <path…> | --all-new` · `recategorize` · `history` · `restore` · `verify`

커밋 때 `.githooks/pre-commit` 이 모델·사운드 변경을 라이브러리로 올린다(`sync --push-only`). 사용자가 고친 .blend 가 기준 원본이라는 규칙은 라이브러리에서도 같다.
