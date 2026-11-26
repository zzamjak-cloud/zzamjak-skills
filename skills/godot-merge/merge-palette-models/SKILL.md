---
name: merge-palette-models
description: "Godot 머지 게임 프로젝트(Civilization_Merge·Hotel_Merge·Zombie_Merge)에서 3D 모델(glb·.blend)을 만들거나 고치거나 내보낼 때 사용한다: 팔레트 셀 색칠·Role UV·공용 머티리얼 규약, 편집용 원본 .blend 루틴, 카탈로그 썸네일, 블럭 크기 비교 파일, 사용자가 .blend를 고치고 「적용해줘」라고 할 때의 절차. 사용자가 수정한 .blend는 기준 원본이라 다시 생성해 덮어쓰지 않는다."
---

# 팔레트 셀 색칠 · 모델 원본(.blend) 루틴

## 색칠: 팔레트 셀 — 모든 3D 모델에 필수
- 모든 glb(장식·건물·생물·머지 블럭)는 **재질 "Palette" 하나 + 면 UV를 팔레트 셀 중앙에 둔 형식**이다. 색마다 재질을 만들지 않는다(재질 하나 = 드로우 콜 하나).
  - 팔레트: Blender 에셋 라이브러리의 고정 팔레트 `D:\Project_Work\Blender\Blender_Asset_Library\Textures\AssetLibrary_Palette_V2.png`와 같은 이미지다. 게임 사본은 `assets/ui/palette/palette.png`(256px, 셀 4×8px, 64열×32행 = 2048색), 셀 → 색 표는 `tools/palette/palette.json`, 라이브러리는 `tools/palette/palette_lib.py`
  - 셀 0 = 좌하단, 행은 아래에서 위로(Blender UV 방향). 팔레트는 **읽기 전용**이라 셀을 추가·변경하지 않는다. 없는 색은 가장 가까운 셀로 맞춘다. 원본 이미지가 바뀌면 `python tools/palette/palette_lib.py --sync`
  - 면의 **역할은 두 번째 UV 맵 "Role"**(glTF TEXCOORD_1, Godot UV2)의 u 칸(0~1을 8칸)으로 정한다: 0 일반 / 1 Primary(체인 주색 자리) / 2 Secondary / 3 Glow(발광) / 4 진영 색 자리 / 5 피부 / 6 머리(주민 색 변형 — `skin_col`·`hair_col`). Role UV가 없는 모델(애드온 모델)은 모두 일반이다
  - 옛 팔레트(V1, 512px 64×64 행 구역 방식)는 `tools/palette/palette_v1.json`에 남아 있다. 옛 파일 이전: glb `weld_glb.py --from-v1`, .blend `tools/blender/migrate_blend_v2.py` (2026-10-12에 전부 옮김)
- 게임: 팔레트 메시는 공용 머티리얼 **둘**만 쓴다 — 월드 모델(장식·건물·생물)은 `LowPoly.palette_mat()`(카툰 음영), 머지 블럭은 `LowPoly.palette_mat_crisp()`(가독성을 위한 각진 음영). `--toon_off`면 둘이 같은 재질 하나가 된다. 물체별 차이는 `instance uniform`(prim_col·sec_col·team_col·skin_col·hair_col·faded·smooth_shade·stone·stone_col·tint)으로만 준다 — 머티리얼 복제·덮어쓰기 금지. `DecorLib.restyle`/`team_tint`가 이 값을 넣는다
- 보드 블럭은 `ItemBatch`가 같은 종류(메시+체인 색)끼리 MultiMesh로 그린다(외곽선 마스크 포함). ItemNode의 팔레트 부위 메시는 숨긴 자리표다. 끄기: `--no_batch`
- 변환: glb는 `python3 tools/blender/weld_glb.py <glb...>`(모든 내보내기 경로가 자동 호출 — 재질별 단색 → 가장 가까운 셀 UV + 역할 UV(재질 이름 Primary*/Secondary*/Glow*, 진영 빨강 `d6383d`), 재질 하나로 합침), .blend 원본은 `Blender -b --python tools/blender/to_palette.py -- [--set=models] [kind...]`
- **사용자가 Blender에서 색을 고치는 법**: UV 편집기에서 UV 맵 "UVMap"을 고르고 `palette.png`(Palette 재질의 이미지)를 띄운 뒤, 바꿀 면을 골라 UV를 원하는 셀 안으로 옮긴다(`S`→`0`으로 한 점에 모은 뒤 셀 중앙으로 `G`). 내보낼 때 셀 중앙으로 정돈된다. 역할을 바꾸려면 UV 맵 "Role"을 고르고 그 면 UV를 해당 u 칸으로 옮긴다

## 모델 원본(.blend) 루틴 — 모든 3D 모델에 필수
- **새로 만든 모델은 반드시 편집용 원본을 함께 남긴다.** 어떤 경로(Codex 빌더, LP3D, 수작업)로 만들었든 게임 glb를 넣을 때 편집용 .blend를 같이 만들어 같은 커밋에 넣는다.
  - 장식·건물·생물: `assets/decor/<kind>.glb` ↔ `art_src/decor/<kind>.blend`
  - 머지 블럭(아이템) 모델: `assets/models/<shape>.glb` ↔ `art_src/models/<shape>.blend`. 두 도구 모두 `-- --set=models <shape...>`로 쓴다
  - 원본은 정점을 용접하고, 사각형 위주로 정리한다(꺾이는 면은 합치지 않는다).
  - 부위 계층·이름(Body/Head/Leg*/Tail/Spin*/Smoke*), 관절 원점, 팔레트 UV("UVMap")·역할 UV("Role")는 게임 glb와 같게 둔다. 재질은 공용 "Palette"(이미지 `//../../assets/ui/palette/palette.png`) 하나다.
  - 생성: `/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/glb_to_blend.py -- <kind...>` (kind 생략 시 assets/decor 전부). `art_src/`는 `.gdignore`로 Godot 가져오기에서 뺀다
- **모델을 넣거나 고치면 카탈로그 썸네일도 같은 커밋에 넣는다.** `python tools/catalog/build_catalog.py [세트/이름...]`가 썸네일이 없는 모델과 인자로 준 모델을 먼저 렌더한다. pre-commit 훅(`.githooks/pre-commit`, 클론마다 `git config core.hooksPath .githooks`)이 glb 커밋 때 이를 실행해 썸네일·페이지를 함께 커밋한다
- **블럭 크기 비교 파일** `art_src/blocks_overview.blend`: 모든 머지 블럭 원본을 링크 인스턴스로 카테고리(시대별·전설·축제·전설 동물원·생명의 나무)마다 줄(체인) × 칸(단계) 격자에 둔다. 원본을 고치면 이 파일에 그대로 반영된다. 블럭을 더하거나 빼면 다시 만든다: `$G --headless --path . -s res://tools/catalog/dump_blocks.gd -- <tmp.json>` → `Blender -b --python tools/blender/build_block_grid.py -- <tmp.json>`
- **장식·건물·생물 카테고리별 비교 파일** `art_src/overview/<slug>.blend`: decor 원본을 링크 인스턴스로 카테고리마다 한 파일(legend_people 전설 인물 · legend_props 전설 소품·세트 · zoo 전설 동물원 · characters 캐릭터 · village 마을 · background 배경 · landmark 랜드마크·제단 · war 전쟁 병기 · misc 기타)에 실제 크기로 늘어놓는다. N 패널 「블럭」의 원본 열기·다시 불러오기를 같이 쓴다. decor를 더하거나 빼면 다시 만든다: `Blender -b --python tools/blender/build_decor_grid.py -- [slug...]`(분류 규칙은 그 파일 머리말)
- **게임용 glb는 항상 용접된 정점으로 내보낸다.** 각진 음영은 게임 셰이더(화면 미분 법선)가 만든다. 면 법선 때문에 정점을 쪼개 내보내지 않는다.
  - 내보내기: `/Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/blend_to_glb.py -- <kind...>` → `assets/decor/<kind>.glb`
  - 용접·팔레트 변환은 `tools/blender/weld_glb.py`(표준 파이썬, 제자리)가 한다. `lowpoly_lib.export_glb`(build_decor·build)·`rig_split`·`blend_to_glb`가 자동으로 부르고, 외부 glb는 `python3 tools/blender/weld_glb.py <glb...>`

## 사용자가 .blend를 수정하고 "적용해줘"라고 하면
1. 그 .blend를 `blend_to_glb.py`로 내보내고 `$G --headless --path . --import`를 실행한다.
2. 부위 이름·관절·크기·발바닥 높이(z=0)·정면 −Y가 규약과 맞는지 점검한다.
3. 게임 화면을 한 장 캡처해 확인한다.
4. 테스트를 돌리고 커밋한다.
5. `artlib sync <proj>` 로 라이브러리 원본을 맞춘다(`merge-asset-library`).
- 머지 블럭 모델을 고쳤다면 UI 아이콘도 다시 굽는다: `$G --path . -s res://tools/icons/bake_item_icons.gd` → `--import`

## 기준 원본
- **사용자가 수정한 .blend는 그 모델의 기준 원본이다.** 이후 그 kind를 Codex 빌더 스크립트(`tools/blender/decor/<kind>.py`)나 LP3D로 다시 생성해 덮어쓰지 않는다. 다시 만들어야 하면 먼저 사용자에게 묻는다.
