---
name: unity-tool-routing
description: "Unity 작업에서 Unity MCP와 Unity CLI(unity 명령) 중 무엇을 쓸지 고를 때 사용한다. 에디터 설치·프로젝트 열기·빌드·테스트·배치 검증은 CLI, 열린 에디터의 씬·GameObject·컴포넌트·콘솔 세부 조회·수정은 MCP. 사용자가 도구를 지정하지 않은 모든 Unity 작업에 적용한다."
---

# Unity MCP / Unity CLI 자동 선택

- Unity 작업은 사용자가 도구를 지정하지 않아도 목적에 맞춰 Unity MCP와 Unity CLI를 자동 선택한다.
- 에디터/모듈 설치, 프로젝트 열기, 라이선스/환경 진단, 빌드, 테스트, CI/배치 실행, 반복 검증은 `unity` CLI를 우선 사용한다.
- 열린 Unity Editor의 씬, GameObject, 컴포넌트, 에셋, 콘솔, 플레이 모드 상태를 세밀하게 조회하거나 수정할 때는 Unity MCP를 우선 사용한다.
- 토큰 절약과 속도가 중요한 단순 상태 조회/검증은 가능하면 `unity status`, `unity command`, `unity command eval`, `unity test`, `unity build`를 사용한다.
- 에이전트가 셸 명령을 실행할 수 없거나 MCP 도구 스키마가 더 안전한 경우에는 `unity mcp` 또는 연결된 Unity MCP 도구를 사용한다.
- 프로젝트 전용 반복 작업은 필요하면 `[CliCommand]` 기반 커스텀 명령을 만들고 `unity command <name>`으로 호출해 검증 루프를 단순화한다.
- Unity CLI로 Editor를 제어해야 하면 먼저 `unity pipeline install` 여부와 Unity 6.0 LTS 이상 여부를 확인한다.
- 기존 서드파티 Unity MCP 구성은 폐기하지 말고, CLI와 병행 가능하면 작업별로 더 가벼운 경로를 선택한다.
- CLI 명령 세부는 `unity-cli` 스킬을 본다.
