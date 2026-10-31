# 메리빌리지 2.0 개발 환경 정리 기록

## 확인한 GitHub 상태

2026-10-31 확인 기준:

- 원격 main: `ed5738e` — PR #2 병합 커밋. 기차 도입 `753eb88`까지 포함합니다.
- 현재 개발 브랜치: `feat/elliptical-train-ride` — 정리 전 최신 `d7b8cb8`(연결 수정).
- main에는 `d7b8cb8`이 포함되지 않았습니다. 현재 브랜치는 최신 수정 이력을 보존합니다.
- GitHub API의 REST/GraphQL 요청은 현재 Cloud 프록시에서 거절되어 PR 전체 목록/개별 닫힘 상태와 저장소 Pages 설정은 조회하지 못했습니다. 병합 여부는 Git의 실제 부모 관계와 merge commit #1/#2 메시지로 확인했습니다.
- 이번에는 브랜치 삭제·이름 변경·main 병합·강제 푸시를 수행하지 않습니다.

아래 브랜치의 현재 원격 끝 커밋은 모두 main의 조상입니다. 최신 코드와 비교 후 사용자가 삭제할 수 있는 후보이며, 자동 삭제하지 않습니다.

| 브랜치 | 끝 커밋 | 확인 결과 |
| --- | --- | --- |
| feat/merry-village-build | 47f6cd7 | main에 포함, PR #1 병합 커밋 확인 |
| feat/christmas-music-box-ui | 7762349 | main에 코드 이력 포함 |
| feat/miniature-art-direction | deeebe9 | main에 코드 이력 포함 |

`feat/elliptical-train-ride`와 main은 유지합니다. 로컬 `work`는 초기 커밋을 가리키지만 플랫폼 초기 체크아웃 이름이므로 이번 삭제 후보에서 제외했습니다. 이후 브랜치가 추가 커밋으로 바뀌면 삭제 전에 다시 `git merge-base --is-ancestor <브랜치> origin/main`을 확인해야 합니다. squash/rebase 병합은 별도 비교가 필요합니다.

## 정리 범위

삭제: `src/train.ts`, `src/train-art.ts`, `src/train-clock.ts`, `src/train-path.ts`, `src/train-consist.ts`, `tests/train.test.mjs`.

이동: AIT 검증 테스트를 `tests/verify-build.test.mjs`에서 `tests/manual/verify-ait.mjs`로 옮겼습니다. 기본 테스트 탐색 대상에서 빠지며 명시적인 `npm run test:ait`로만 실행합니다. 이번 작업에서는 실행하지 않습니다.

추가: `scripts/verify-web.mjs`, 웹 산출물/자동 빌드 정책 회귀 테스트, 수동 출시 워크플로, 선택형 Pages 배포.

유지: 미니어처 장면·정적 기차·선택 강조·눈·낮밤·음악 준비 안내·공식 SDK 설정. 아이템 교체는 실제 구현이 없었으며 교체 예정 문구만 제거했습니다. 소스 복구 기준은 `d7b8cb8`이며 Git 기록에서 제거하지 않았습니다.

모든 이미지 원본은 삭제·수정하지 않습니다:

| 이미지 | 용도 |
| --- | --- |
| christmas-room.png | 보케 배경, 현재 사용 |
| miniature-atlas.png | 독립 장식품·정적 기차·메뉴 썸네일, 현재 사용 |
| train-directions.png | 폐기한 주행의 방향별 이미지, 향후 사용 미정이므로 저장소에 보존. 새 웹 번들에서는 제외 |

직접 의존성은 모두 사용 중입니다. web-framework는 설정/공식 CLI, devtools는 개발 서버, Vite/TypeScript/@types/node는 빌드·타입 검사, ait-format은 보존한 수동 출시 검증/테스트에서 참조하므로 제거하지 않습니다. 새 의존성은 추가하지 않습니다.

## GitHub Pages 켜기

현재 API 접근이 불가능하여 아래 설정을 대신 적용하거나 성공을 확인하지 못했습니다. 사용자 권한으로 저장소에서 진행하세요.

1. 저장소 **Settings → Pages**를 엽니다.
2. **Build and deployment → Source → GitHub Actions**를 선택합니다. 기존 커스텀 도메인이 있으면 유지합니다.
3. **Settings → Secrets and variables → Actions → Variables → New repository variable**로 이동합니다.
4. 현재 개발 브랜치의 Pages 작업에는 `ENABLE_PAGES` 변수가 필요하지 않습니다. Pages의 Source를 GitHub Actions로 설정하세요.
5. `github-pages` 환경이 있으면 **Settings → Environments → github-pages → Deployment branches and tags**를 확인합니다. 제한이 걸려 있으면 **Selected branches and tags → Add deployment branch or tag rule → Branch**에서 `feat/elliptical-train-ride`를 허용합니다. 환경이 아직 없으면 첫 배포 후 만들어질 수 있습니다.
6. **Actions → 기존 Build web preview and AIT 또는 변경된 Build web preview → Run workflow**에서 브랜치를 **feat/elliptical-train-ride**로 선택해 실행합니다. 기존 `build.yml`은 main에 이미 있어 해당 경로의 수동 실행에서 개발 브랜치를 선택할 수 있습니다. 이름은 기본 브랜치 버전에 따라 다르게 표시될 수 있습니다.
7. **build** job의 웹 검증 및 ZIP 업로드, **pages** job의 배포 성공을 확인합니다. 보호 환경이면 **Review deployments**에서 승인합니다.
8. Settings → Pages의 게시된 주소 또는 pages job의 environment URL을 확인합니다. 기본 예상 주소는 **https://spacezoo33.github.io/merry-village/** 입니다. 아직 접속이 검증된 주소는 아닙니다.

Pages가 비활성화되어도 build job의 웹 ZIP은 정상 제공됩니다. Pages 메뉴/Actions Source를 선택할 수 없으면 저장소 관리자 권한·조직 정책·현재 요금제의 Pages 지원 여부를 확인하세요. 직접 GitHub token을 코드나 채팅에 넣을 필요가 없습니다.

Pages는 이 개발 브랜치의 성공한 push/수동 빌드만 배포합니다. PR 빌드는 권한과 코드 신뢰 문제를 피하기 위해 ZIP만 만듭니다. 상대 경로를 쓰므로 `/merry-village/` 아래에서도 패키지와 동일한 웹 파일을 사용할 수 있습니다.

## main 반영 전 주의할 실제 차이

**현재 원격 main의 기존 워크플로에는 자동 AIT 단계가 남아 있습니다.** 이번 변경은 개발 브랜치에만 반영하며, main을 사용자 승인 없이 수정하지 않습니다. 저장소 전체에서 기존 자동 AIT를 없애려면 사용자가 변경 PR을 검토·승인하고 main에 병합해야 합니다. 그 전에는 기존 main 워크플로를 수동 실행하거나 main에 별도 push하지 마세요.

PR 만들기: https://github.com/spacezoo33/merry-village/compare/main...feat/elliptical-train-ride?expand=1

이번 PR은 개발 브랜치에 자동 웹 빌드를 추가하고 기존 build.yml에서 AIT를 완전히 분리합니다. main 반영 후에도 기본 개발 브랜치는 동일하게 유지합니다. 새 `build-ait.yml`의 수동 실행 UI는 main에 파일이 반영된 뒤 사용할 수 있으며, 최종 개발 완료 확인란을 체크해야만 AIT job이 실행됩니다. 이번 정리에서 이 워크플로는 실행하지 않습니다.
