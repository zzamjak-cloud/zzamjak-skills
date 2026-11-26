# cat_core — 기준 버전 1.0.0

다른 `cat_*` 애드온이 의존하는 공용 코드. 어떤 애드온에도 의존하지 않는다. 설치: `addons/cat_core` 복사.

## CatEase (정적 함수)

```gdscript
var v := CatEase.evaluate(CatEase.Type.OUT_BACK, t)        # t: 0~1
var w := CatEase.sample(CatEase.Type.LINEAR, my_curve, t)  # my_curve(Curve)가 null이 아니면 커브 우선
```

| 멤버 | 설명 |
|---|---|
| `enum Type` | `LINEAR = 1` … `IN_OUT_BOUNCE = 31`. 이름은 DOTween과 같은 `IN_/OUT_/IN_OUT_` + `SINE·QUAD·CUBIC·QUART·QUINT·EXPO·CIRC·BACK·ELASTIC·BOUNCE`. 정수값이 Unity `EaseType`과 같다 |
| `evaluate(type, t) -> float` | t를 클램프하지 않아 BACK/ELASTIC은 [0,1] 밖 값을 낸다. 알 수 없는 type은 LINEAR |
| `sample(type, curve, t) -> float` | `curve != null`이면 `curve.sample(t)`, 아니면 `evaluate` |

## 쓰는 곳

- `Tween`에 없는 이징이 필요할 때: `tween.tween_method(func(t): node.scale = Vector2.ONE * CatEase.evaluate(CatEase.Type.OUT_ELASTIC, t), 0.0, 1.0, 0.4)`
- 인스펙터 노출: `@export var ease_type: CatEase.Type = CatEase.Type.OUT_QUAD`

## 주의

- `Curve`는 Unity `AnimationCurve`와 범위 처리가 달라 오버슈트 커브는 `Curve.min_value`/`max_value`를 넓혀야 한다.
