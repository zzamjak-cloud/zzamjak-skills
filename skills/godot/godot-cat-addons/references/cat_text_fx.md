# cat_text_fx — 기준 버전 1.0.0

필요: `cat_core >= 1.0.0`. 설치: `addons/cat_core`, `addons/cat_text_fx` 복사 → `--import`.
전체 설명·원본과의 차이: 원본 레포 `addons/cat_text_fx/README.md`. 예제 씬: `demo/cat_text_fx/`(`animation_demo`, `style_gallery`, `mask_flow_demo`, `layout_limiter_demo`, `showcase/NN_*.tscn`).

## 노드 구성

```
CatText (Control, Label 대체)       ← 글자를 직접 그린다
├─ CatTextOutline                   ← 외곽선·드롭섀도·그림자·안쪽 면
├─ CatTextGlow                      ← 글로우 + Inner Glow
├─ CatTextCurve                     ← 곡선 배치
├─ CatTextAnimation                 ← 글자별 Appear → Loop → Disappear + Impact
└─ CatLayoutLimiter                 ← 최대 너비·높이 제한 (Label 자식도 가능)

CatMaskFlow (Control, clip)         ← 전광판 흐름. 첫 자식(Label/CatText)을 템플릿으로 복제
└─ Label 또는 CatText
```

- `CatTextOutline/Glow/Curve/Animation`은 **부모가 `CatText`일 때만** 동작한다(`Label` 자식이면 아무 일도 없다). 기존 `Label`을 이 효과로 바꾸려면 `CatText`로 교체한다(속성 이름 `text`, `font`, `font_size`, `font_color`, `horizontal_alignment`, `vertical_alignment`, `autowrap_mode`, `line_spacing`, `uppercase`가 같다).
- `CatMaskFlow`, `CatLayoutLimiter`는 일반 `Label`에도 쓸 수 있다.

## 최소 코드

```gdscript
var label := CatText.new()
label.text = "STAGE CLEAR"
label.font_size = 48
add_child(label)

var outline := CatTextOutline.new()
outline.set_outline(Color.BLACK, 0.3)          # width 0~1 (1.0 = 0.15em)
label.add_child(outline)

var anim := CatTextAnimation.new()
anim.apply_preset(CatTextAnimationPreset.create_bounce_appear())
anim.animation_finished.connect(_on_title_done)
label.add_child(anim)                           # play_on_ready = true(기본)면 트리에 들어갈 때 자동 재생
# 나중에: anim.trigger_impact()  /  anim.restart()
```

`.tres` 프리셋 사용:
```gdscript
outline.apply_preset(load("res://addons/cat_text_fx/presets/style/Title_Out2_Red_Shadow.tres"))
anim.apply_preset(load("res://addons/cat_text_fx/presets/animation/Title_Notice_Red.tres"))
```

## CatText

| 멤버 | 설명 |
|---|---|
| `signal reshaped` | 텍스트·폰트·줄바꿈 변경으로 배치를 다시 계산한 직후 |
| `get_natural_size()` | 줄바꿈 없는 크기 |
| `get_text_bounds()` | 보이는 글자 전체 사각형 |
| `get_display_text()` | 번역·대문자 변환 후 실제 문자열 |
| `get_cluster_count()` / `get_cluster_rect(k)` / `is_cluster_visible(k)` | 글자 단위 정보 |

번역(`atr`)·테마·크기 변경 시 자동 재배치. 커스텀 효과는 `CatTextModifier` 상속 + `fill_states(text) -> bool`.

## CatTextOutline

| 그룹 | 속성 (범위 / 기본) |
|---|---|
| Underlay | `underlay_color`, `underlay_dilate`(0~1 / 0.15, 두께), `underlay_offset_x/y`(-1~1, 드롭섀도), `underlay_softness`(0~1) |
| Face | `face_dilate`(0~1, 본문 굵기) |
| Shadow | `enable_shadow`, `shadow_offset`(font_size 배율, 기본 (0.1,0.1)), `shadow_alpha`(0.5) |
| Second Face | `enable_second_face`, `second_face_color`, `use_second_face_gradient` + 4색, `second_face_dilate`(-1~0), `second_face_offset_x/y` |

메서드: `set_outline(color, width, softness=0)`, `set_drop_shadow(color, offset_x, offset_y, dilate=0.1)`, `set_outline_with_shadow(color, width, shadow_alpha, shadow_offset: Vector2)`, `apply_preset(CatTextStylePreset)`, `reset_effect()`.

## CatTextGlow

`glow_color`, `glow_range`(0~1), `inner_glow_alpha`(0~1), `face_dilate`. 글로우가 있으면 본문 RGB는 글로우 색을 따른다(알파는 `font_color`).
메서드: `set_glow(color, range)`, `apply_preset(preset)`, `reset_effect()`.

## CatTextCurve

`curve`(Curve: X=가로 위치 0~1, Y=높이 비율 -2~2, 위쪽 +), `curve_scale`(px), `preserve_vertical_center`, `rotate_along_curve`, `rotation_strength`, `enable_dynamic_curve_scale` + `reference_*`.
메서드: `set_arch_curve(height)`, `set_wave_curve(amplitude, frequency=1)`, `reset_curve()`, `refresh()`.
**`curve`가 비어 있으면 평평하다** — 코드로 만들면 `set_arch_curve()` 등을 반드시 호출.

## CatTextAnimation

글자 i 시작 시각 = `initial_delay + i * character_delay` (i는 공백 포함 원문 인덱스).

| 그룹 | 주요 속성 |
|---|---|
| 공통 | `play_on_ready`(true), `clamp_overshoot`(false: OutBack 등 튀는 동작 유지) |
| Timing | `character_delay`, `initial_delay`, `pivot`((0.5,0)=중앙·베이스라인) |
| Appear | `enable_appear`, `appear_relative`, `appear_position/scale/rotation/alpha`, `appear_duration`, `appear_ease`(CatEase.Type) / `appear_curve`(우선), `appear_to_loop_blend` |
| Loop | `enable_loop`, `loop_position/scale/rotation`, `loop_duration`(한 방향), `loop_count`(-1=무한), `loop_type`(`CatTextAnimationPreset.LoopType.YOYO/RESTART`) |
| Disappear | `enable_disappear`, `disappear_position/scale/rotation/alpha`, `disappear_duration`, `disappear_ease` |
| Impact | `enable_impact`, `impact_scale`(곱), `impact_position/rotation`(더하기), `impact_duration`, `impact_character_delay` |

- 메서드: `play()`, `stop()`, `pause()`, `resume()`, `restart()`, `trigger_impact()`, `apply_preset(preset)`, `advance(dt)`(수동 진행·테스트용).
- 상태: `is_playing`, `is_impact_playing`. 신호: `animation_finished`, `impact_finished`.
- 회전은 z축(도)만, 좌표는 Godot 기준(y 아래 +, 회전 + = 시계 방향).
- `loop_count = -1`이면 Disappear는 실행되지 않고 `animation_finished`도 오지 않는다 → 퇴장이 필요하면 유한 `loop_count`.
- 텍스트가 바뀌면 자동 재시작. 같은 문자열 재배치(리사이즈·테마)는 재시작하지 않는다.

## CatMaskFlow

`clip_contents` 컨테이너. 첫 자식을 템플릿으로 복제해 흘린다(복제본은 씬에 저장 안 됨).

| 속성 | 설명 |
|---|---|
| `direction` | `CatMaskFlow.FlowDirection.LEFT/RIGHT`(이어지는 마퀴), `TOP/BOTTOM`(한 줄씩 교체) |
| `velocity`(80 px/s), `gap`(80), `interval`(TOP/BOTTOM), `delay` | 속도·간격·교체 후 대기·시작 대기 |
| `static_mode` | 영역 안에 들어가면 멈춰 표시, 넘칠 때만 흐름 |
| `text_entries` | 순서대로 보여줄 문자열(번역 키 가능). 비면 템플릿 텍스트 |
| `play_on_ready`, `use_unscaled_time`, `max_sequence_copy_count` | |

메서드: `play()`, `stop()`, `restart()`, `refresh()`(템플릿 폰트·크기 변경 후 필수), `set_text_entries(entries, restart_flow=false)`, `set_text_resolver(callable)`. 신호: `turn_changed(index)`.

## CatLayoutLimiter

`Label`/`CatText` 자식. `max_width`(300) 이상이면 부모 autowrap을 켜고 너비 고정, `max_height`(0=무제한) 도달 시 높이 고정·잘라냄. **실행 중에만 동작**(에디터에서는 변화 없음). 런타임 변경 후 `refresh()`.

## 프리셋

- 스타일 `.tres`(`res://addons/cat_text_fx/presets/style/`): `Desc_Black`, `Desc_Black_Shadow`, `Title_Extrude_Brown`, `Title_Out1_Purple_Shadow`, `Title_Out2_Red_Shadow`, `Glow_Green` — `CatTextOutline`/`CatTextGlow.apply_preset()`.
- 애니메이션 `.tres`(`.../presets/animation/`): `Title_Notice_Red`, `Appear_RB_Loop_1`, `Preset_A`, `Description_Loop` — `CatTextAnimation.apply_preset()`.
- 코드 팩토리: `CatTextStylePreset.create_simple_outline() / create_drop_shadow() / create_title()`, `CatTextAnimationPreset.create_bounce_appear() / create_wave_loop() / create_scale_disappear() / create_rotate_appear() / create_fade_in_out()`.
- 새 프리셋은 `CatTextStylePreset.new()` / `CatTextAnimationPreset.new()` 후 `copy_from(node)`로 현재 값을 담고 `ResourceSaver.save()`.

## 흔한 실수

- 효과 노드를 `Label` 자식에 붙임 → 동작 안 함. `CatText`로 바꾼다.
- 외곽선·글로우 크기를 매 프레임 트윈 → 폰트 글리프 캐시가 커진다. 단계적으로만 바꾼다(움직임은 `CatTextAnimation`으로).
- 글자 수가 많고 외곽선이 두꺼우면 폰트를 MSDF로 임포트한다.
- 음수 `face_dilate`(가늘게), `HORIZONTAL_ALIGNMENT_FILL`(양쪽 맞춤)은 지원하지 않는다(각각 0, 왼쪽 정렬로 처리).
- `enable_second_face`를 켜면 오프스크린 버퍼 + `_process`가 돈다. 모바일에서 많이 쓰지 않는다.
