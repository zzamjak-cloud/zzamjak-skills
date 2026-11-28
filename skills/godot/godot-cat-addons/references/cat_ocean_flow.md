# cat_ocean_flow — 기준 버전 1.0.0

필요: `cat_core >= 1.0.0`. 설치: `addons/cat_core`, `addons/cat_ocean_flow` 복사 → `--import`.
전체 설명·원본(Unity OceanFlow)과의 차이: 원본 레포 `addons/cat_ocean_flow/README.md`. 예제 씬: `demo/cat_ocean_flow/`(`ocean_demo`, `river_demo`, `horizon_demo`, `showcase/NN_*.tscn`, 절차 지형 `demo_terrain.gd`).

카툰 스타일 3D 물(바다·호수·강). 접경 포말, 깊이 색, 셀 거품, 노이즈 난류, Gerstner 파도, 셀 톤 하이라이트, UV 흐름. 물 노드는 `MeshInstance3D`를 상속하며 메쉬·머티리얼을 스스로 만든다(씬 파일에 저장 안 됨). 값은 바꾸면 다음 프레임에 한 번만 반영된다.

## 노드 구성

| class_name | 역할 |
|---|---|
| `CatOceanFlowSurface` | 바다·호수(XZ 그리드, 구멍, 카메라 추적, 먼 바다 동기화) |
| `CatOceanFlowRiver` | 강(`Curve3D` 경로 리본, 다음 강 동기화). 에디터에서 자식 `EditPath`(Path3D)를 편집하면 물길이 따라온다 |
| `CatOceanFlowBase` | 둘의 추상 베이스 |
| `CatFlowChannel` | UV 레이어 하나의 흐름 `Resource` (`channel0` = 포말, `channel1` = 수면 거품) |

## 최소 코드

```gdscript
var sea := CatOceanFlowSurface.new()        # 호수·작은 바다 한 장
sea.size_x = 60.0
sea.size_z = 60.0
sea.subdiv_x = 96
sea.subdiv_z = 96
sea.foam_distance = 0.8
add_child(sea)

add_child(CatOceanFlowSurface.create_ocean_set())   # 수평선 바다: 근거리 추적 패치 + 먼 바다

var river := CatOceanFlowRiver.new()        # 기본 S자 경로 + 강 전용 파동으로 시작
river.width = 6.0
river.curve.add_point(Vector3(0, 0, 30), Vector3(0, 0, -4), Vector3(0, 0, 4))   # pos, in, out
add_child(river)
```

에디터: 프로젝트 > 도구 > `CAT Ocean Flow: 바다 세트 만들기` / `강 세트 만들기`(플러그인을 켜야 함). **물 아래에 불투명 지형이 있어야 포말·깊이 색이 보인다.** 배경이 단색이면 같은 색 안개를 켠다(바다 끝이 직선으로 잘림).

## 속성(기본값) — 그룹별

- **형상(Surface)**: `size_x`·`size_z`(20), `subdiv_x`·`subdiv_z`(24, ≤256), `uv_tiling`(1,1), `hole_size`(0=없음), `follow_camera`(false), `follow_target`(비면 뷰포트 현재 카메라, 에디터에서는 추적 안 함), `follow_look_at`(true: 카메라 시선이 수면과 만나는 점 추적), `follow_snap`, `wave_edge_fade`(0~0.5).
- **형상(River)**: `curve`, `loop_path`, `width`(4), `width_curve`(Curve, 위치별 폭 배율), `length_samples`(64, ≤512), `width_segments`(4), `uv_length_scale`(8), `uv_start_v`.
- **물 색**: `shallow_color`(0.45,0.90,0.92)·`deep_color`(0.06,0.28,0.55), `shallow_alpha`(0.5)·`deep_alpha`(0.95), `depth_fade_distance`(3).
- **접경 포말**: `shore_foam_enabled`(true), `foam_color`, `foam_distance`(0.6, 두께), `foam_cutoff`(0.6, 높을수록 포말 감소), `foam_softness`(0.04), `foam_noise_amount`(0.35), `foam_alpha`, `foam_fade_start`(0)·`foam_fade_end`(300, 먼 물가 깜빡임 제거), `channel0`.
- **수면 노이즈**: `noise_texture`(비우면 기본), `channel1`, 난류 `noise_churn_enabled`(true)·`churn_speed`(0.12)·`churn_jitter`(0.5)·`churn_warp`(0.06)·`churn_rotation`(0.6), 셀 거품 `cell_foam_enabled`(true)·`cell_color`·`cell_cutoff`(0.72, 낮을수록 거품 많음)·`cell_softness`(0.03)·`cell_intensity`(0.5).
- **파동**: `wave_enabled`(true), `wave_a`=(dirx, dirz, 가파름, 파장)(1,0,0.25,8), `wave_b`(0.7,0.7,0.15,4), `ripple`=(진폭, 주파수, 속도)(0.04,3,1.5).
- **하이라이트**: `highlight_enabled`(true), `highlight_color`, `highlight_power`(64), `highlight_cutoff`(0.5, 낮을수록 넓음), `highlight_intensity`(0.8), `main_light`(비면 씬의 첫 `DirectionalLight3D`).
- **시간**: `use_unscaled_time`. 동기화: `far_surface`(Surface), `next_river`(River).
- 기능 토글을 끄면 그 기능이 셰이더에서 빠진다(켠 조합마다 셰이더를 만들어 공유). 토글 변경 시 셰이더가 바뀌므로 매 프레임 토글하지 않는다.

## CatFlowChannel

| 속성 | 설명 |
|---|---|
| `mode` | `CatFlowChannel.Mode.LOOP`(한 방향 무한) / `PING_PONG` |
| `direction`, `speed` | 방향(Vector2) / Loop = 초당 UV 이동량, PingPong = 1왕복 초(기본 0.05) |
| `range` | PingPong 왕복 폭(0.2) |
| `ease` | `CatEase.Type`(1~31) 또는 `CatFlowChannel.EASE_CUSTOM`(32, `custom_curve` 사용) |
| `tiling` | 레이어 UV 타일링(채널 0 = 4, 채널 1 = 7) |

```gdscript
var ch := sea.channel1
ch.mode = CatFlowChannel.Mode.PING_PONG
ch.range = 0.3
ch.speed = 2.0
ch.ease = CatEase.Type.OUT_BOUNCE
```

## 큰 바다·긴 강

- 바다: `CatOceanFlowSurface.create_ocean_set()` = 근거리(80m, 분할 80, `follow_camera`, `wave_edge_fade` 0.15) + 먼 바다(1000m, 분할 8, 파도·하이라이트 끔). 근거리의 `far_surface`로 연결되어 **근거리만 조정하면 먼 바다가 따라온다**(색·포말·노이즈·파동 값 복사, `uv_tiling`·`hole_size`·카메라 추적 자동). 기능 on/off 토글과 크기·분할은 동기화되지 않는다.
- 강: `length_samples` 상한 512라 긴 강은 여러 `CatOceanFlowRiver`를 `next_river`로 이어 붙인다(`create_river_set()`). 뒤 구간 `uv_start_v`가 앞 `uv_end_v`로 자동 설정되고 `width`·`width_curve`가 복사된다.
- 기타 공개 API: `rebuild_mesh()`, `mark_properties_dirty()`, `advance_preview_time(dt)`/`externally_driven`, `get_path_end()`, `apply_river_wave_defaults()`, `create_default_path()`.

## 흔한 실수

- **Compatibility 렌더러에서는 깊이 기반 포말이 약하다/안 보일 수 있다.** Forward+ 또는 Mobile을 쓴다(녹화·캡처도 동일).
- 물 아래 지형이 없거나 투명이면 포말·깊이 색이 안 보인다.
- **노드 스케일은 1로 둔다**(파도 변위가 월드 단위라 컬링 팝핑). Gerstner 가파름 합 > 1이면 수면이 접힌다. 파장은 정점 간격 × 4 이상.
- 먼 물가는 깊이 분해능 때문에 포말이 깜빡인다. `foam_fade_start/end`로 150~300m부터 지운다.
- 수면 아래에서는 보이지 않는다(`cull_back`). 모바일은 물 하나당 정점 20,000개 이하 권장.
- 파도는 셰이더 `TIME`을 써서 `Engine.time_scale = 0`이어도 움직인다. 흐름·난류는 노드 시간(`use_unscaled_time`)을 따른다.
- 채널·곡선은 복제해도 공유되지 않는다(씬에서 한 노드 값을 바꿔도 복제본은 그대로).
