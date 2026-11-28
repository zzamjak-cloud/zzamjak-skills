---
name: godot-cat-addons
description: "Godot 4.7+ 게임 프로젝트에서 zzamjak의 CAT 애드온(cat_core·cat_text_fx·cat_ocean_flow …)을 설치하거나 사용할 때 사용한다. 텍스트 연출(외곽선·그림자·글로우·곡선·글자별 등장/루프/퇴장 애니메이션·전광판 흐름·최대 크기 제한), 바다·강·호수 같은 카툰 물 표현(물가 포말·깊이 색·셀 거품·파도·하이라이트·수평선 바다), 이징 함수(CatEase)가 필요하면 직접 구현하기 전에 먼저 본다. 프로젝트에 addons/cat_* 폴더가 있거나 Cat으로 시작하는 class_name(CatText, CatTextAnimation, CatOceanFlowSurface, CatEase 등)을 다룰 때도 사용한다. 애드온 자체를 개발·수정하는 작업은 원본 레포의 CLAUDE.md를 따른다."
---

# CAT Godot 애드온 사용

Unity CAT 패키지를 Godot으로 옮긴 GDScript 애드온 모음이다. 런타임 노드는 `class_name`으로 등록되어 플러그인을 켜지 않아도 동작한다.

- 원본 레포(개발·데모): `/Users/woody/dev/Godo_Project/Godot_Addon` · GitHub `https://github.com/zzamjak-cloud/Godot_Addon`
- 기능 소개 페이지(영상): `https://zzamjak-cloud.github.io/Godot_Addon/<addon_id>/`
- 데모 씬: 원본 레포 `demo/<addon_id>/` — 사용 예가 더 필요하면 여기를 읽는다.

## 애드온 목록

| addon_id | 최신 | 용도 | 주요 class_name | 사용법 |
|---|---|---|---|---|
| `cat_core` | 1.0.0 | 공용 이징 함수(31종) | `CatEase` | [references/cat_core.md](references/cat_core.md) |
| `cat_text_fx` | 1.0.0 (cat_core ≥ 1.0.0) | Label 대체 텍스트 + 외곽선·그림자·글로우·곡선·글자 애니메이션·전광판·크기 제한 | `CatText`, `CatTextOutline`, `CatTextGlow`, `CatTextCurve`, `CatTextAnimation`, `CatMaskFlow`, `CatLayoutLimiter` | [references/cat_text_fx.md](references/cat_text_fx.md) |
| `cat_ocean_flow` | 1.0.0 (cat_core ≥ 1.0.0) | 카툰 3D 바다·강·호수(접경 포말·깊이 색·셀 거품·난류·Gerstner 파도·하이라이트·UV 흐름·수평선 세트) | `CatOceanFlowSurface`, `CatOceanFlowRiver`, `CatOceanFlowBase`, `CatFlowChannel` | [references/cat_ocean_flow.md](references/cat_ocean_flow.md) |

사용할 애드온의 references 파일만 읽는다.

## 절차

1. **설치 여부·버전 확인**: 대상 프로젝트의 `addons/<addon_id>/plugin.cfg`의 `version`을 본다.
   - 위 표의 최신 버전과 다르면 references 내용이 맞지 않을 수 있다. 설치된 `addons/<addon_id>/*.gd`의 공개 함수·`@export`를 직접 확인하고 쓰거나, 사용자에게 업데이트할지 묻는다.
2. **설치**(없을 때). 의존하는 `cat_core`도 함께 설치한다.
   - 복사: 원본 레포의 `addons/cat_core`, `addons/<addon_id>` 폴더를 대상 프로젝트 `addons/`에 그대로 복사한다(태그 버전을 쓰려면 `git -C <원본 레포> archive <addon_id>/vX.Y.Z addons/<addon_id> | tar -x -C <대상 프로젝트>`).
   - GodotEnv를 쓰는 프로젝트면 `addons.json`에 `subfolder`로 추가한다.
     ```json
     "cat_core":    { "url": "https://github.com/zzamjak-cloud/Godot_Addon.git", "checkout": "cat_core/v1.0.0", "subfolder": "addons/cat_core" },
     "cat_text_fx": { "url": "https://github.com/zzamjak-cloud/Godot_Addon.git", "checkout": "cat_text_fx/v1.0.0", "subfolder": "addons/cat_text_fx" },
     "cat_ocean_flow": { "url": "https://github.com/zzamjak-cloud/Godot_Addon.git", "checkout": "cat_ocean_flow/v1.0.0", "subfolder": "addons/cat_ocean_flow" }
     ```
   - 설치 후 `--import`를 한 번 실행해야 `class_name`이 등록된다.
3. **사용**: references의 노드 구성·코드 예시대로 붙인다. 공개 API는 Unity 원본 메서드의 snake_case다(`Play()` → `play()`).
4. **검증**: 오류 출력을 반드시 grep한다(Godot 헤드리스는 오류가 있어도 종료 코드 0인 경우가 많다).
   ```bash
   $GODOT --headless --path <프로젝트> --import 2>&1 | grep -E "SCRIPT ERROR|Parse Error|ERROR:"   # 아무것도 안 나와야 함
   ```
   그리기 결과는 헤드리스로 확인되지 않으니 창 모드로 실행해 캡처를 직접 본다.

## 주의

- 애드온 파일을 게임 프로젝트 안에서 고치지 않는다. 버그·기능 부족은 원본 레포에서 고치고 버전을 올려 다시 설치한다(사용자에게 먼저 알린다).
- 같은 `class_name`이 두 곳에 있으면 Godot이 오류를 낸다. 애드온 폴더를 두 번 복사하거나 코드를 프로젝트에 옮겨 붙이지 않는다.

## 이 스킬 갱신(애드온 개발 세션용)

원본 레포에 애드온을 추가하거나 공개 API·기본값·버전이 바뀌면 같은 작업 안에서 이 스킬을 갱신한다.
1. 위 「애드온 목록」 표에 행 추가 또는 버전 수정.
2. `references/<addon_id>.md` 작성·수정(기준 버전 명시). 형식은 `references/cat_text_fx.md`를 따른다: 설치 조건 → 노드 구성 → 최소 코드 → 노드별 속성·메서드·신호 → 프리셋 → 흔한 실수.
3. description의 키워드(기능·class_name)에 새 애드온을 반영한다.
4. zzamjak-skills 레포에서 `./scripts/validate.sh` 후 커밋·푸시.
