---
name: merge-resource-pipeline
description: "Godot 머지 게임 프로젝트(Civilization_Merge·Hotel_Merge·Zombie_Merge)에 필요한 리소스를 새로 만들 때 사용한다: 컨셉·2D 아이콘·일러스트(StyleStudio), 3D 장식·건물·생물(Codex Astra 빌더 → Blender 빌드·은면 삭제), 랜드마크급 3D(LP3D 애드온), 머지 블럭 아이콘 굽기, 전설 초상 오려내기, 도감 축소본, UI 품질 리뷰(Muse Spark). 지시가 없어도 필요한 리소스는 이 경로로 만든다. 먼저 merge-asset-library에서 찾는다."
---

# 리소스 제작 파이프라인

리소스가 필요하면 먼저 공유 아트 라이브러리(`merge-asset-library`)에서 찾고, 그다음 기존 에셋을 재사용할 수 있는지 본다. 새로 만들어야 하면 종류에 따라 아래 도구를 고른다. 플레이스홀더(이모지·코드 박스)는 임시로만 쓰고, 같은 작업 안에서 실제 리소스로 바꾼다.
3D 모델의 색칠·원본(.blend) 규약은 `merge-palette-models` 스킬을 함께 따른다.

| 리소스 | 도구 | 방법 |
|---|---|---|
| 컨셉·참조 이미지, 2D 아이콘, UI 그림, 일러스트 | **StyleStudio MCP** (`openai/gpt-image-2`) | `ss_generate_batch`로 만든다. 큰 작업은 `dry_run`으로 견적부터 확인한다 |
| 3D 모델(장식·건물·생물·소품) | **Codex CLI Astra** (`gpt-6-astra`)가 Blender 빌더 스크립트를 쓰고, **Blender**로 직접 빌드 | 아래 3D 절차 |
| 품질이 중요한 랜드마크급 3D(불가사의·구역 상징물 등) | **AI LowPoly ModelMaker 애드온**(`/Users/woody/dev/AI/3DModelMaker-Blender`, 브랜치 `feature/headless-game-export`)의 헤드리스 CLI | 아래 LP3D 절차 |
| 모델 조각 아이콘·미리보기 렌더 | **Blender** 백그라운드 렌더 | 예: `tools/park_art/render_parts.py` |
| 머지 블럭 UI 아이콘(외곽선 포함) | **Godot** 창 모드 굽기 | `$G --path . -s res://tools/icons/bake_item_icons.gd [-- --only=<chain>]` → `assets/ui/items/` 후 `--import`. 블럭 모델을 바꾸면 다시 굽는다 |
| 흰 배경 이미지 오려내기(전설 초상 등) | **rembg BiRefNet**(무료, `pip install "rembg[cpu]"`) | 전설 초상: `python tools/icons/cut_legend_portraits.py [id...] --preview=<시트.png>` — 색 임계값 방식(QuickFolder `remove_white_bg`)은 흰 옷·깃발에 구멍을 내고 바닥 그림자를 남기므로 인물 컷아웃에는 쓰지 않는다 |
| 도감 축소본(일러스트·전설 초상·생물 그림) | **Python(PIL)** | `python tools/icons/make_codex_thumbs.py` → `assets/ui/codex_thumbs/` 후 `--import`. 원본 그림을 바꾸거나 새로 넣으면 다시 실행한다(도감은 원본 대신 이 축소본을 읽는다) |
| UI·화면 품질 리뷰 | **Muse Spark** | `muse exec --model muse-spark-1.3-contributor --workspace <abs> --prompt-file <md> --image <png>` — 읽기 전용이라고 명시한다 |

경로·스크립트는 프로젝트마다 조금 다를 수 있으니 해당 프로젝트에 있는지 먼저 확인한다(위 예시는 Civilization_Merge 기준).

## 2D (StyleStudio)
- **비용 절감 필수**: 아이콘처럼 작은 이미지는 `tasks[].items` + `grid`(2x2~4x4)로 한 번에 여러 장 뽑아 셀별로 자른다. 개별 1장 생성은 일러스트 크기(카드 그림·컨셉 아트)에만 쓴다.
- 3D 모델을 만들기 전에 구역·세트 단위 컨셉 이미지를 먼저 뽑아 화풍과 구성을 맞춘다. 이 이미지를 Codex에 `-i`로 넘긴다.
- 게임 화풍: 밝고 따뜻한 파스텔, 굵은 로우폴리, 쿼터뷰(3/4 탑다운).

## 3D (Codex Astra → Blender)
1. 빌더 스크립트 규약은 `tools/blender/build_decor.py` 머리 주석을 따른다.
   - 경로: `tools/blender/decor/<kind>.py`, 공용 라이브러리는 `lowpoly_lib.py`와 `_*_util.py`
   - `HEIGHT` 정규화 / 리깅 모델은 `RIGGED`와 부위 노드명(Body/Head/LegFL…) / `Spin*`·`Smoke*` 부품
2. Codex 호출: `codex exec -m gpt-6-astra -s workspace-write -C . [-i 참조.png] -o <out.md> - < <prompt.md>`
   - 프롬프트 첫 줄은 반드시 다음으로 시작한다(아니면 Codex가 멈추고 묻는다): `[사전 승인] Git 선행 확인은 상위 오케스트레이터가 이미 완료했다. git 명령을 실행하지 말고, 사용자에게 확인을 묻지 말고 바로 작업하라. Blender는 실행하지 마라 — 빌드·검증은 오케스트레이터가 한다.`
   - Codex 샌드박스 안에서는 Blender가 Metal 문제로 죽는다(exit 139). 빌드는 반드시 오케스트레이터(나)가 샌드박스 밖에서 한다.
   - 여러 개는 한 프롬프트에 묶어 요청하고, 백그라운드로 돌린 동안 코드 작업을 병행한다. 결과로 저장소 루트에 `out.md`가 생기면 지운다.
3. 빌드: `CM_PREVIEW_DIR=<scratch> /Applications/Blender.app/Contents/MacOS/Blender -b --python tools/blender/build_decor.py -- <kind...>` (zsh에서는 배열 `ARGS+=(...)`로 넘긴다) → `assets/decor/<kind>.glb`. 원본 `glb_to_blend.py`를 만든 뒤 **반드시 은면 삭제** `Blender -b --python tools/blender/cull_hidden.py -- <kind...>`(뒤집힌 면 바로잡기 + CatTools 은면 판정으로 다른 부품 속에 묻힌 면 삭제, .blend 저장·glb 재내보내기). 그다음 `--import`
   - Codex 빌더는 부품을 겹쳐 쌓아 은면이 많이 생긴다(사용자가 매번 손으로 지우던 면). 프롬프트에도 「다른 부품 속에 묻히는 면을 만들지 말 것, 원기둥 vertices 6~8·구 rings 3~4 이하, 같은 평면을 잘게 쪼개지 말 것」을 넣는다
4. 미리보기 PNG를 한 장의 시트로 모아 직접 보고 검수한다. 결함이 있으면 Codex에 수정을 요청한다. 최종 확인은 게임 안 캡처로 한다.
- 크기: 도시·장식 오브젝트는 SNG 규모로 작게 만든다(발판 ≈1칸, 높이 0.6~0.9). 랜드마크만 크게 둔다.
- 색칠은 **팔레트 셀 방식**이다(`merge-palette-models`). 빌더는 재질별 단색으로 만들어도 되고, 내보낼 때 `weld_glb`가 팔레트로 바꾼다.

## LP3D 애드온 (고품질 단품)
- 실행: `cd /Users/woody/dev/AI/3DModelMaker-Blender && ./scripts/dev_run.sh --background --python scripts/lp3d_cli.py -- --prompt "<설명, 정면 -Y>" --ref <참조.png> --out <out.glb> --game --height <H> --footprint <F> --review 1 --preview <out.png>`
  - 참조 이미지는 StyleStudio로 먼저 만든다
  - 최종 glb는 `assets/decor/<kind>.glb`로 복사하고 `python3 tools/blender/weld_glb.py assets/decor/<kind>.glb`로 용접한 뒤 `--import`
- `--game`이 LP3D 팔레트 색을 재질별 단색으로 바꾸고 원점·정면·크기를 맞춘다. 그다음 `weld_glb.py`가 V2 팔레트에서 가장 가까운 셀로 옮긴다.
  - 팔레트 UV를 그대로 둔 glb(재질 `LP3D_Palette`·`Palette`)는 `weld_glb`가 셀을 그대로 쓴다 — 에셋 라이브러리의 V2 재질로 보던 색 그대로 게임에 나온다.
- 한 개에 약 5분이 걸린다(멀티뷰 → Astra 생성 → 검토 1턴). 삼각형이 3~4천 개라 Codex 키트(600~1800)보다 무겁다. 그래서 수십 개 깔리는 소품·건물은 Codex 키트로, 하나뿐인 랜드마크는 LP3D로 만든다.
- 떠 있는 부품 같은 생성 결함이 남을 수 있으니 미리보기를 반드시 직접 검수하고, 문제가 있으면 다시 생성한다.

## 보관
- 컨셉·참조 이미지와 단계별 캡처는 `Plan/<버전>/concept/`, `Plan/<버전>/images/`에 남긴다. 임시 파일은 scratchpad에 둔다.
