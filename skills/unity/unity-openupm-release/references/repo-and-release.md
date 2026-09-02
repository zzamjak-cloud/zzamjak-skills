# 레포 및 릴리스

## 1. GitHub 공개 레포 생성

- 소유자 `zzamjak-cloud`, 이름은 프로젝트 이름과 동일, 공개(public).
- 레포 생성 전에 로컬 커밋이 정상인지 먼저 확인한다.

```bash
cd <프로젝트경로>
git init -b main                                   # 아직 저장소가 아니면
git add -A
git status --short
git ls-files Packages/com.zzamjak.<name> | wc -l   # 0 이면 중단하고 원인 파악
git ls-files -s Packages | awk '$1=="160000"'      # 출력이 있으면 gitlink 사고
git commit -m "<ProjectName> v1.0.0 최초 릴리스"
```

사용자 승인 후에만 원격을 만든다.

```bash
gh repo create zzamjak-cloud/<ProjectName> --public --source=. --remote=origin --push
```

이미 원격이 있다면:

```bash
git remote add origin https://github.com/zzamjak-cloud/<ProjectName>.git
git push -u origin main
```

push 직후 원격에 파일이 실제로 올라갔는지 확인한다. 빈 폴더로 올라가는 gitlink 사고는 이 시점에만 싸게 잡힌다.

```bash
gh api repos/zzamjak-cloud/<ProjectName>/contents/Packages/com.zzamjak.<name> --jq '.[].name'
```

## 2. 태그와 릴리스

- 태그는 `v<semver>` 형식이다. `package.json` 의 `version` 과 반드시 같다.
- 태그를 붙이기 전 세 값이 일치하는지 확인한다: `package.json` version / CHANGELOG 최상단 / 붙일 태그.

```bash
git tag v1.0.0
git push origin v1.0.0
gh release create v1.0.0 --title "v1.0.0" --notes "<CHANGELOG 1.0.0 항목 발췌>"
```

기존 태그를 옮기지 않는다. 잘못 배포했으면 `1.0.1` 로 올린다. OpenUPM 은 한 번 색인한 버전의 내용 변경을 반영하지 않는다.

## 3. OpenUPM 레지스트리 등록

최초 1회만 수행한다.

1. https://openupm.com/packages/add/ 에 접속한다.
2. 레포 URL `https://github.com/zzamjak-cloud/<ProjectName>` 을 입력한다. OpenUPM 이 서브폴더의 `package.json` 을 자동 탐지한다.
3. 폼을 확인·수정한다.
   - `name`: `com.zzamjak.<name>`
   - `displayName`: 프로젝트 이름
   - `description`: **영문**으로 쓴다. 패키지 목록·검색에 노출된다
   - `licenseSpdxId`: `package.json` 의 `license` 와 같은 SPDX 식별자
   - `topics`: OpenUPM 이 정한 목록(`data/topics.yml`)의 slug 만 허용된다. 임의 문자열은 PR 검증에서 실패한다
   - `gitTagPrefix`: **빈 값**으로 둔다. `v` 접두사는 OpenUPM 이 자동 처리한다
   - `readme`: `main:README.md`
   - `hunter`: `zzamjak-cloud`
4. 제출하면 `openupm/openupm` 레포에 `data/packages/com.zzamjak.<name>.yml` 을 추가하는 PR 이 만들어진다.
5. 병합 후 첫 빌드까지 시간이 걸린다. 패키지 페이지의 빌드 로그에서 `1.0.0` 이 성공했는지 확인한다.

```text
https://openupm.com/packages/com.zzamjak.<name>/
```

등록 사전 조건:

- 공개 GitHub 레포
- `package.json` 에 유효한 `name`·`version`·`license`(SPDX)
- 레포에 SemVer 태그가 최소 1개
- 레포 루트에 라이선스 파일

## 4. 등록 메타데이터 사본

업스트림에 병합된 내용을 레포 루트 `openupm-package.yml` 로 남긴다. 실제 등록 정보는 업스트림에 있고 이 파일은 참고용이라는 점을 주석으로 명시한다.

```yaml
# OpenUPM 레지스트리 등록 메타데이터 (실제 제출본 사본)
#
# 등록 PR: https://github.com/openupm/openupm/pull/<번호>
# 업스트림 위치: openupm/openupm → data/packages/com.zzamjak.<name>.yml
# 패키지 페이지: https://openupm.com/packages/com.zzamjak.<name>/
#
# 등록 정보를 고치려면 업스트림에 PR 을 다시 보내야 합니다.
# 패키지 버전 배포는 vX.Y.Z 태그 푸시만으로 자동 처리됩니다.

name: com.zzamjak.<name>
aliases: []
displayName: <ProjectName>
description: >-
  <영문 설명>
repoUrl: 'https://github.com/zzamjak-cloud/<ProjectName>'
trackingMode: git
parentRepoUrl: null
licenseSpdxId: <SPDX>
licenseName: <라이선스 전체 이름>
topics:
  - <허용된 slug>
hunter: zzamjak-cloud
gitTagPrefix: ''
gitTagIgnore: ''
readme: 'main:README.md'
```

## 5. 배포 자동화

`.github/workflows/openupm.yml` 을 두면 태그 push 시 OpenUPM 에 즉시 스캔을 요청한다. 없어도 결국 색인되지만 지연이 길다.

```yaml
name: OpenUPM

"on":
  push:
    tags:
      - "v*.*.*"
  workflow_dispatch:
    inputs:
      tag:
        description: "OpenUPM에 스캔을 요청할 릴리스 태그"
        required: true
        type: string

permissions:
  id-token: write
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: openupm/openupm-action@v1
        with:
          package: com.zzamjak.<name>
          tag: ${{ github.event_name == 'workflow_dispatch' && inputs.tag || github.ref_name }}
```

`permissions.id-token: write` 가 없으면 액션이 인증에 실패한다.

## 6. 이후 버전 배포 절차

1. 코드 수정
2. `package.json` 의 `version` 상향 (SemVer)
3. `CHANGELOG.md` 최상단에 항목 추가 (Added / Changed / Fixed / Removed)
4. 검증 스크립트 실행 → Unity 로 육안 확인 → 빌드 확인
5. 커밋 → push
6. `git tag vX.Y.Z && git push origin vX.Y.Z`
7. `gh release create vX.Y.Z`
8. OpenUPM 패키지 페이지에서 색인 확인

파일 하나만 고쳤더라도 태그 없이는 배포되지 않는다. 반대로 태그만 밀고 `package.json` 의 `version` 을 안 올리면 OpenUPM 빌드가 실패한다.

## 7. 설치 안내 (README 에 넣을 내용)

### OpenUPM CLI

```bash
openupm add com.zzamjak.<name>
```

### 스코프 레지스트리 수동 추가

`Packages/manifest.json` 에 추가한다. 레지스트리 이름은 `zzamjak` 으로 통일해 Package Manager 의 My Registries 에서 하나로 묶이게 한다.

```json
{
  "scopedRegistries": [
    {
      "name": "zzamjak",
      "url": "https://package.openupm.com",
      "scopes": ["com.zzamjak"]
    }
  ],
  "dependencies": {
    "com.zzamjak.<name>": "1.0.0"
  }
}
```

`scopes` 는 개별 패키지가 아니라 `com.zzamjak` 스코프 전체로 둔다. 그래야 이후 다른 패키지를 추가할 때 설정을 다시 안 고친다.

### git URL 직접 설치

Package Manager → `Install package from git URL...`

```text
https://github.com/zzamjak-cloud/<ProjectName>.git?path=/Packages/com.zzamjak.<name>#v1.0.0
```

서브폴더 패키지이므로 `?path=` 가 필수다.
