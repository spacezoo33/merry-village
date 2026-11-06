# merry-village
Christmas music box decorating app for Apps in Toss

메리빌리지 2.0은 빌리지·오르골·특별한 밤·사진 촬영을 즐기는 앱인토스 미니앱입니다. 기존 고품질 미니어처 에셋과 웹 미리보기 자동화를 유지합니다.
앱인토스 고유 식별자 **`appName: merry-village`는 변경하지 않습니다.**

**개발은 웹 전용입니다. AIT 생성은 개발이 최종 완료된 후 명시적인 수동 출시 작업에서만 수행합니다.**

현재 화면·기적 추가 감쇠·독립 야간 테마는 [최신 검증 기록](docs/night-themes.md)을, 모바일·특별 빌리지 4종은 [통합 기록](docs/special-mobile.md)을 확인하세요.

## 2.0 앱 기능

- 하단 4개 메뉴: **빌리지 / 음악 선택 / 특별한 밤 / 사진 촬영**. 기존 장식품별 선택은 제거했습니다.
- 무료 3종: 포근한 크리스마스, 눈꽃 숲속 마을, 종소리 작은 성당.
- 특별 4종: 달빛 겨울 궁전, 진저브레드 마을, 오로라 호수 마을, 별빛 천문대. 이용권이 없으면 명시적인 미리보기를 제공합니다.
- 고요한 밤·징글벨·기쁘다 구주 오셨네·거룩한 밤·오 베들레헴 작은 골의 자체 오르골 연주. 별도로 추가하던 작은 종소리는 제거했습니다. 재생·일시정지·진행·이전/다음을 지원하며, 선택한 한 곡을 계속 반복합니다. [음악 출처 및 확인 한계](docs/music-rights.md).
- 오른쪽 동작/조명/눈 3개 버튼. 실제 3D 트리 37초 회전·연결 열차 13초 순환·주행음/경적. 빌리지별 철도 보정, 팝업·OFF 없는 조명 4모드 순환과 기본 139개·성능 적응형 3단 눈 효과. 오로라/별빛/황금빛 밤 효과와 모션 감소 대응.
- 현재 마을의 1200×1560 PNG 사진 생성·웹 다운로드.
- 실제 광고 보상 이벤트에만 연결한 빌리지별 독립 7일 이용권과 테마별로 분리한 특별한 밤 이용권·만료 처리. **광고 ID가 없어 실광고/실기기 지급은 아직 미검증이며 웹에서는 지급하지 않습니다.**

현재 출시 전 점검과 검증 한계는 [출시 점검](docs/release-audit.md)에 있습니다. [이전 안정화 기록](docs/stabilization.md)은 과거 이력입니다. [이전 개선 기록](docs/final-polish.md)은 과거 이력입니다.

에셋, 실제 구현, 광고/이용권 한계와 검증은 [2.0 구현 현황](docs/v2.md)을 확인하세요. 보상형 광고 ID는 `public/runtime-config.json`에 공개 설정으로 넣을 수 있습니다. 비밀키를 넣지 마세요.

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

## GitHub Pages 개발 미리보기

[Actions](https://github.com/spacezoo33/merry-village/actions)의 **Build web preview**가 타입 검사·자동 테스트·웹 빌드·웹/라이선스 검증을 실행합니다.
성공한 개발 브랜치 `feat/elliptical-train-ride`의 push/수동 실행만 Pages로 배포하며 PR 코드는 배포하지 않습니다.
다운로드용 웹 ZIP 생성·업로드 단계는 없습니다. `actions/upload-pages-artifact`는 Pages 자체 배포에 필요한 내부 아티팩트이므로 유지합니다.

고정 주소: **https://spacezoo33.github.io/merry-village/**

이전 커밋 6fc9c73의 Pages job 성공은 확인했습니다. 현재 변경의 배포 여부는 해당 커밋 Actions 결과로 확인합니다.
환경의 Pages 도메인 차단 여부와 실제 배포 성공 여부는 별개입니다.
`base: './'`, 기존 공식 SDK 설정과 개발 브랜치 전용 `pages: write`/`id-token: write` 권한을 유지합니다.
웹 파일은 `dist/`뿐이며 `THIRD-PARTY-LICENSES.txt`에 실제 배포 의존성 고지를 포함합니다.
자세한 준비 항목은 [출시 점검](docs/release-audit.md)을 확인하세요.

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

## 보존한 개발 기반

기존 PNG 원본을 모두 보존하고, 제품형 마을 6종 에셋과 실제 3D 트리·연결 열차를 추가했습니다. 개별 장식품 교체는 제공하지 않습니다. 외부 이미지/음원 서버 없이 장면·음악·사진을 사용할 수 있습니다. [음악 권리 근거](docs/music-rights.md)와 [구현 한계](docs/v2.md)를 확인하세요.

현재 Pages 워크플로와 공식 SDK 설정은 변경하지 않았습니다. 과거 정리 이력과 브랜치 관계는 [개발 환경 정리 기록](docs/development.md)에 보존합니다.

## 보안과 검증 한계

공개 Pages에는 웹 번들만 올립니다. 비밀키를 `VITE_*`에 넣으면 브라우저 코드에 포함되므로 사용하지 마세요. 서버용 인증 정보는 GitHub Secrets/서버 설정에서만 다루고 웹 빌드로 전달하지 않습니다. 현재 웹 개발에는 Secrets가 필요하지 않습니다.

실제 토스 기기 테스트, 콘솔 업로드, 최신 GitHub Actions 결과, Pages 배포는 별도 확인 사항입니다. [SDK 에셋 설명](src/assets/README.md)과 공식 문서 https://developers-apps-in-toss.toss.im/ 을 참고하세요.

조명 기본광/추가광 분리와 실제 Web Audio 출력 측정은 [검증 기록](docs/lighting-audio-validation.md)을 참고하세요.

최신 주행음 gain·6바퀴 기적 주기·작은 눈송이·빌리지별 조명 좌표는 [변경 및 검증 기록](docs/sound-snow-alignment.md)을 참고하세요.
