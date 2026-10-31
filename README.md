# merry-village
Christmas music box decorating app for Apps in Toss

메리빌리지 2.0 개발 준비 저장소입니다. 기존 고품질 미니어처 화면과 이미지 원본을 보존합니다.
앱인토스 고유 식별자 **`appName: merry-village`는 변경하지 않습니다.**

**개발은 웹 전용입니다. AIT 생성은 개발이 최종 완료된 후 명시적인 수동 출시 작업에서만 수행합니다.**

## 매일 사용하는 명령

Node.js 24.19.0 (`.nvmrc`)과 npm을 사용합니다. 저장소 루트에서 실행하세요.

```sh
npm ci
npm run dev
# 타입 검사 + 웹 테스트 + 웹 빌드 + 웹 산출물 검증 (AIT 생성 없음)
npm run build
# 위에서 만든 dist를 브라우저로 확인할 때
npm run preview
```

현재 개발 브랜치는 **`feat/elliptical-train-ride`**입니다. 이름은 기존 작업 이력이지만 앞으로 이 한 브랜치에서 계속 작업합니다. Codex Cloud의 기존 `/workspace/merry-village` 체크아웃을 사용하며 별도 worktree나 기능별 브랜치를 만들 필요가 없습니다.

공식 SDK `@apps-in-toss/web-framework@3.9.0`, Vite, TypeScript와 기존 SDK 설정을 유지합니다. 개발 서버에서만 공식 devtools/mock이 활성화됩니다. 의존성은 모두 실제 참조가 있어 유지했습니다.

## 웹 미리보기와 ZIP

[Actions](https://github.com/spacezoo33/merry-village/actions)의 **Build web preview** 워크플로는 개발 브랜치/main push, PR 및 수동 실행에서 웹만 빌드합니다.

1. 체크아웃 → Node 설정 → `npm ci`
2. `npm run build` → 타입 검사, 웹/빌드 정책 테스트, 웹 빌드, 산출물 검증
3. `merry-village-web-<실행번호>-<재실행번호>-<SHA>` Artifact 업로드 (14일 보관)

실행 화면의 **Artifacts**에서 ZIP을 받습니다. ZIP 안에는 `index.html`, `assets/`, `build-info.json`이 들어 있습니다. 해제한 폴더를 정적 HTTP 서버로 실행하세요. 예: Python 3가 있다면 `python3 -m http.server 8080`. 휴대폰에서는 같은 네트워크의 PC 주소로 접속합니다. ES 모듈을 사용하므로 `file://` 실행은 지원하지 않습니다.

검증기는 appName·실제 커밋·HTML/JS/CSS·CSS 이미지 참조를 검사하며, 외부/루트 절대 경로와 환경 파일·키 파일·AIT의 웹 번들 혼입을 거절합니다. `build-info.json`에는 커밋과 실행 식별자만 기록합니다. PR 빌드는 GitHub의 PR merge commit을 기록합니다.

## 고정 주소: GitHub Pages (설정 후 사용)

기본 예상 주소: **https://spacezoo33.github.io/merry-village/**

현재 Pages 설정과 실제 배포 성공은 확인하지 못했습니다. 고정 주소가 이미 동작한다고 주장하지 않습니다. [환경 정리 및 Pages 설정 안내](docs/development.md#github-pages-켜기)의 클릭 순서대로 설정하면 개발 브랜치의 최신 성공 빌드가 이 주소에 배포되도록 구성했습니다. 기존 커스텀 도메인이 있다면 실제 주소는 Pages 화면을 기준으로 합니다.

- 저장소 변수 `ENABLE_PAGES=true`를 명시적으로 설정한 경우에만 배포합니다.
- 개발 브랜치의 push/수동 실행만 배포하며 PR 코드는 배포하지 않습니다.
- 웹 ZIP은 Pages 사용 여부와 관계없이 계속 업로드합니다.
- Pages 배포 job에만 `pages: write`, `id-token: write` 권한을 줍니다. 웹 검사와 수동 AIT 작업은 `contents: read`만 사용합니다.
- `vite.config.ts`의 상대 경로 `base: './'`를 유지해 Pages 하위 경로와 앱인토스 패키지를 함께 지원합니다.

## 최종 완료 후에만: 수동 AIT 출시

**지금 실행하는 명령이 아닙니다. 아래는 최종 출시용으로 보존한 절차입니다.**

[`.github/workflows/build-ait.yml`](.github/workflows/build-ait.yml)은 `workflow_dispatch`만 받습니다. **Build release AIT (manual only)**에서 출시 브랜치를 선택하고 개발 최종 완료 확인란을 체크한 뒤 실행해야 합니다. 기본 확인값은 false이며 push/PR/일정/다른 워크플로에서 자동 실행되지 않습니다.

수동 작업은 `npm run release:ait`로 웹 검사/빌드 후 공식 `ait build`, 실제 AIT 검증과 별도 출시 테스트를 실행하고 `merry-village-ait-<실행번호>-<재실행번호>-<SHA>` ZIP을 업로드합니다. 로컬에서도 같은 명령을 명시적으로 실행할 수 있지만 최종 완료 전에는 사용하지 않습니다.

- `npm run build:ait`: 이전 출력 제거 후 공식 CLI로 패키지 생성 (수동 전용).
- `npm run verify:ait`: 이미 만든 패키지의 appName·내부 웹 파일 검증.
- `npm run test:ait`: 임시 AIT 테스트 데이터를 만드는 **수동 출시 검사**. 기본 `npm test`에서 제외했습니다.
- `npm run verify:build`는 이전 명령과의 호환을 위해 **웹 검증만** 수행합니다.
- 빌드에는 콘솔 API 키가 필요하지 않습니다. `npm run deploy`는 별도 인증이 필요한 콘솔 배포 명령이며 자동 실행하지 않습니다.
- 새 수동 워크플로를 Actions 목록에서 보려면 파일이 기본 브랜치에 있어야 합니다. 사용자 승인 후 PR을 main에 병합한 다음 최종 출시 시에만 실행합니다.

## 정리한 범위와 보존한 범위

기차 자동주행/차축/커플러/방향 프레임 제어와 전용 테스트를 제거했습니다. 정적인 기차와 기존 선택 강조, 음악 준비 안내, 눈 효과·낮밤 전환은 유지합니다. 실제 아이템 교체 기능은 없었으며 불필요한 교체 예고 문구만 제거했습니다. 새로운 2.0 기능은 구현하지 않았습니다.

모든 PNG 원본을 그대로 보존했습니다. `train-directions.png`는 사용 여부 미정 자료로 유지하되 런타임에서 참조하지 않아 새 웹 번들에는 포함되지 않습니다. 세부 목록과 복구 기준 커밋은 [정리 기록](docs/development.md)에 있습니다.

## 보안과 검증 한계

공개 Pages/ZIP에는 웹 번들만 올립니다. 비밀키를 `VITE_*`에 넣으면 브라우저 코드에 포함되므로 사용하지 마세요. 서버용 인증 정보는 GitHub Secrets/서버 설정에서만 다루고 웹 빌드로 전달하지 않습니다. 현재 웹 개발에는 Secrets가 필요하지 않습니다.

실제 토스 기기 테스트, 콘솔 업로드, 최신 GitHub Actions 결과, Pages 배포는 별도 확인 사항입니다. [SDK 에셋 설명](src/assets/README.md)과 공식 문서 https://developers-apps-in-toss.toss.im/ 을 참고하세요.
