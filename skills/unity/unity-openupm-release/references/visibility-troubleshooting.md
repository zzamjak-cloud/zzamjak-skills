# Packages 폴더 미노출 진단

증상: 패키지를 분리한 뒤 Unity 를 열었는데 Project 창 `Packages` 노드나 Package Manager 에 `com.zzamjak.*` 이 없다.

Unity 는 임베디드 패키지 해석에 실패해도 **대부분 조용히 건너뛴다.** Console 에 아무 에러가 없어도 정상이라는 뜻이 아니다. 아래 표를 위에서부터 순서대로 소거한다. 위쪽일수록 실제 발생 빈도가 높다.

## 원인 소거 순서

| # | 원인 | 확인 | 조치 |
| --- | --- | --- | --- |
| 1 | Unity 를 켠 채로 폴더를 만들었다 | 최근에 폴더를 만들었는가 | Unity 완전 종료 → `Packages/packages-lock.json` 삭제 → 재실행. Package Manager 는 임베디드 패키지를 세션 시작 시에만 완전히 재스캔한다 |
| 2 | `package.json` JSON 파싱 실패 | `python3 -m json.tool Packages/com.zzamjak.<name>/package.json` | 후행 쉼표·주석·BOM 제거. 파싱 실패 시 Unity 는 해당 폴더를 패키지로 보지 않는다 |
| 3 | 해석 불가능한 의존성 | `dependencies` 에 `com.unity.modules.*`·`com.unity.ugui` 외 항목이 있는가 | 제거한다. 의존성 하나가 해석되지 않으면 그 패키지 전체가 목록에서 빠진다 |
| 4 | 폴더 깊이가 잘못됨 | `ls Packages/` 에 `com.zzamjak.<name>` 이 바로 보이는가 | `Packages/` 바로 아래 한 단계로 옮긴다 |
| 5 | 폴더 이름 ≠ `package.json` 의 `name` | 두 값을 직접 비교 | 폴더 이름을 `name` 과 동일하게 바꾼다 |
| 6 | 폴더 이름이 숨김 규칙에 걸림 | 이름이 `.` 으로 시작하거나 `~`·공백으로 끝나는가 | 이름을 고친다 |
| 7 | `manifest.json` 에 같은 이름의 잔여 항목 | `grep com.zzamjak.<name> Packages/manifest.json` | `dependencies` 에서 해당 줄을 삭제한다. 임베디드 패키지는 manifest 에 등록하지 않는다 |
| 8 | `packages-lock.json` 이 옛 소스로 고정 | 해당 항목의 `"source"` 값 확인 | `"source": "embedded"` 가 아니면 `packages-lock.json` 을 삭제하고 Unity 재실행 |
| 9 | `unity` 필드가 에디터보다 높거나 형식이 틀림 | `"6000.0"` 형식인가, `ProjectVersion.txt` 보다 높은가 | `메이저.마이너` 두 자리로 고치고 에디터 버전 이하로 맞춘다 |
| 10 | git 서브모듈(gitlink)로 커밋됨 | `git ls-files -s Packages \| grep "^160000"` | 아래 [gitlink 사고](#gitlink-사고) 참고. clone 한 사람에게는 빈 폴더로 보인다 |
| 11 | `.gitignore` 가 패키지를 제외 | `git check-ignore -v Packages/com.zzamjak.<name>/package.json` | 전역·로컬 gitignore 의 해당 규칙에 `!` 예외를 추가한다 |
| 12 | `Samples~` 가 `*~` 패턴에 걸려 누락 | `git check-ignore -v "Packages/com.zzamjak.<name>/Samples~/."` | `.gitignore` 에 `!**/Samples~/` 와 `!**/Samples~/**` 를 추가한다 |
| 13 | `Library` 캐시 파손 | 위 항목이 모두 정상인데도 안 보임 | Unity 종료 → `Library/` 삭제 → 재실행 (재임포트에 시간이 걸린다) |
| 14 | Package Manager 필터 오해 | Unity Registry 탭만 보고 있는가 | In Project → Custom 을 본다. 임베디드 패키지는 Unity Registry 목록에 절대 나오지 않는다 |
| 15 | 다른 Unity 인스턴스가 같은 프로젝트를 잠금 | `Temp/UnityLockfile` 존재 | 모든 Unity 인스턴스를 닫고 다시 연다 |

## gitlink 사고

가장 진단이 어려운 유형이다. 원본 프로젝트에서 기능 폴더를 복사할 때 그 안에 `.git/` 이 딸려오면, 새 레포에서 `git add` 는 그 폴더를 **서브모듈 참조(mode 160000)** 로 커밋한다. 로컬에서는 파일이 멀쩡히 보이지만 push 된 레포에는 파일이 없고, clone 하면 빈 폴더가 되어 Unity 에 패키지가 나타나지 않는다.

```bash
# 진단
find Packages/com.zzamjak.<name> -name .git -maxdepth 3
git ls-files -s Packages | grep "^160000"

# 조치
rm -rf Packages/com.zzamjak.<name>/.git
git rm --cached Packages/com.zzamjak.<name>
git add Packages/com.zzamjak.<name>
git ls-files Packages/com.zzamjak.<name> | wc -l   # 파일 수가 나와야 한다
```

## 설치자 쪽에서 안 보이는 경우

로컬 개발 프로젝트에서는 보이는데 패키지를 설치한 사용자에게만 안 보인다면 원인이 다르다.

- **git URL 설치**: 서브폴더 패키지는 `?path=` 가 필요하다. `https://github.com/zzamjak-cloud/<Repo>.git?path=/Packages/com.zzamjak.<name>#v1.0.0`
- **OpenUPM 설치**: 스코프 레지스트리 `scopes` 에 `com.zzamjak` 이 들어 있는지 확인한다. `com.zzamjak.<name>` 처럼 개별 패키지만 넣으면 다른 패키지가 안 잡힌다.
- **버전 미색인**: OpenUPM 이 아직 태그를 스캔하지 않았다. 패키지 페이지의 빌드 로그를 확인하고, `.github/workflows/openupm.yml` 로 스캔을 트리거한다.
- **읽기 전용 폴더 경고**: 문서 파일에 `.meta` 가 없으면 설치본에서 Unity 가 경고를 내며 해당 파일을 무시한다. 패키지 안 모든 파일에 `.meta` 를 커밋한다.

## 재발 방지 체크

패키지를 분리한 직후 Unity 를 열기 전에 항상 다음을 실행한다.

```bash
python3 ~/.claude/skills/unity-openupm-release/scripts/verify_upm_package.py <프로젝트경로>
```

이 스크립트가 위 표의 1~12번을 정적으로 전부 검사한다. 통과한 뒤에도 Unity 를 실제로 열어 육안 확인하는 단계는 생략하지 않는다.
