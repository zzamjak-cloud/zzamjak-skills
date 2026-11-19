---
name: claude-code-maintenance
description: "Claude Code 자동 업데이트가 실패했거나(\"Raw mode is not supported\", claude doctor 타임아웃, .claude-code-* 임시 폴더, 오래된 버전, \"claude native binary not installed\") oh-my-claudecode(OMC)를 업데이트할 때 사용한다. 원인 설명 없이 바로 수동 재설치로 해결한다."
---

# Claude Code · OMC 유지보수

## 클로드 코드 자동 업데이트 실패 대응

### 증상 감지
다음 증상이 나타나면 자동 업데이트가 실패한 것:
- "Raw mode is not supported" 오류
- `claude doctor` 타임아웃
- `.claude-code-*` 형태의 임시 디렉토리 존재
- 버전 확인 시 오래된 버전 표시
- **"Error: claude native binary not installed"** 오류 → 아래 네이티브 바이너리 수동 설치

### 네이티브 바이너리 누락 오류 즉시 수정
```bash
# 1단계: postinstall 스크립트 수동 실행 (optional dependency가 있는 경우)
node $(npm root -g)/@anthropic-ai/claude-code/install.cjs

# 위 명령이 실패하면 optional dependency 포함 재설치
npm uninstall -g @anthropic-ai/claude-code
npm i -g @anthropic-ai/claude-code
```
- 원인: npm 설치 시 `--ignore-scripts` 또는 `--omit=optional` 옵션으로 postinstall이 실행되지 않거나 optional dependency(`@anthropic-ai/claude-code-darwin-arm64`)가 누락됨
- 바이너리 위치: `$(npm root -g)/@anthropic-ai/claude-code/node_modules/@anthropic-ai/claude-code-darwin-arm64/claude` → `bin/claude.exe`에 하드링크

### 수동 업데이트 절차
```bash
cp ~/.claude.json ~/.claude.json.backup   # 백업
claude --version                          # 1. 현재 버전
npm view @anthropic-ai/claude-code version # 2. 최신 버전
# 3. 버전이 다르면 재설치
npm uninstall -g @anthropic-ai/claude-code
rm -rf ~/.npm-global/lib/node_modules/@anthropic-ai/.claude-code-*
npm i -g @anthropic-ai/claude-code
claude --version                          # 4. 설치 확인
```
준비된 스크립트: `~/.claude/auto-update-fix.sh`

### 주의사항
- **설명 불필요**: 이미 여러 번 발생한 문제이므로 원인 분석이나 설명 없이 즉시 해결한다.
- **npm 캐시 문제**: `npm cache verify` 사용 (`npm cache clean --force`는 피한다).

## oh-my-claudecode (OMC) 업데이트
실제 패키지명은 `oh-my-claude-sisyphus` (npm의 `oh-my-claudecode`와 다름).
```bash
omc --version
npm view oh-my-claude-sisyphus version
npm install -g oh-my-claude-sisyphus@latest   # omc update보다 확실함
```
