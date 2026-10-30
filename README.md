# merry-village
Christmas music box decorating app for Apps in Toss

메리빌리지(Merry Village)는 앱인토스 비게임 미니앱입니다.
콘솔 고유 식별자 **`merry-village`는 변경하지 않습니다.**
현재는 크리스마스 오르골 기본 UI를 구현했습니다. 로컬 이미지로 조합한 입체 미니어처와 독립 장식품, 눈 효과, 낮밤 전환을 제공합니다. 실제 3D 엔진, 장식품 교체, 음악 재생, 광고 SDK 호출·광고 ID는 포함하지 않습니다.

## 고품질 2.5D 크리스마스 오르골

실사 미니어처 질감의 로컬 이미지 에셋과 독립 장면 객체를 조합했습니다. 참조 이미지 자체를 배경으로 쓰지 않으며, 전체 마을이 한 장의 이미지로 합쳐져 있지 않습니다.

- `src/assets/miniature-atlas.png`: 원목/눈/철로 받침대, 집, 교회, 트리, 산타, 눈사람, 루돌프, 기차, 소나무의 투명 이미지 아틀라스.
- `src/assets/christmas-room.png`: 마을이나 캐릭터가 없는 크리스마스 보케 배경.
- `src/scene.ts`: 실제 픽셀 영역을 자르는 SVG 뷰포트로 래스터 에셋을 표시하고, 집 세 채·교회·트리·캐릭터·기차·받침대 등을 각각 배치합니다. SVG는 이미지 크롭용이며 평면 벡터 장식품을 그리지 않습니다.
- `src/main.ts`: 눈 켜기/끄기, 낮밤 분위기, 장식품 선택·강조. 음악 버튼은 재생 상태를 표시하지 않고 준비 중 안내만 합니다.
- `src/style.css`: 갈색/금색 세로 설정 버튼, 크림색 이미지 메뉴, 트리 조명 반짝임, CSS 눈 효과, 터치 피드백, 안전 영역과 모바일 레이아웃.

에셋 출처·합성 방식·개별 교체의 한계는 [에셋 설명](src/assets/README.md)에 기록했습니다. 선물·철로·명판 등 일부 세부 요소는 상위 에셋에 포함되어 있어 개별 교체에는 추가 이미지 제작이 필요합니다. 창문 조명은 이미지에 포함된 빛이며 낮밤 전환은 배경/노출/발광 분위기 효과입니다.

기차는 14초 타원 레일 주행을 지원합니다. 음악 재생·장식품 교체/저장·광고는 구현하지 않았습니다. 선택 상태는 새로고침하면 초기화됩니다. 모션 감소 설정에서는 반짝임과 눈 이동을 중지하고 정적인 눈을 표시하며, 눈을 끄면 눈 효과를 숨기고 애니메이션도 멈춥니다.

작은 세로 화면에서는 세로로 스크롤할 수 있습니다. 외부 이미지 서버에 의존하지 않으며 두 PNG 모두 웹 빌드와 AIT 패키지에 포함됩니다. 실제 토스 기기의 네이티브 안전 영역과 WebView 동작은 별도 기기 테스트가 필요합니다.

## 미니 기차 운행

고정 기차를 제거하고 새 `train-directions.png`의 독립 기관차 1대와 선물 객차 2대를 사용합니다. 기관차/객차 각각 8방향 이미지를 교차 전환하므로 전체 기차 이미지를 회전시키지 않습니다. 이전 일체형 기차는 메뉴 썸네일에만 남아 있으며 받침대 배경에는 기차가 없습니다.

- `src/train-path.ts`: 받침대 아틀라스의 레일 중심선을 측정한 타원. 장면 너비 1000 기준 중심 `(500, 744)`, 반지름 `(392, 132)`. 실제 받침대 위에 가이드 타원을 겹쳐 보정했습니다.
- 경로 길이 룩업 테이블로 일정한 이동 거리를 계산합니다. 한 바퀴 14초이며, 두 객차는 기관차보다 각각 185/370 경로 단위 뒤에서 같은 경로를 따릅니다. 곡선 구간에서도 같은 각도 차이가 아닌 같은 경로 간격을 유지합니다.
- 차량 크기는 기관차 뷰포트 22%, 객차 20%로 설정했습니다. 투명 여백을 포함하므로 이전 일체형 이미지 68%와 단순 합산 비교할 수 없으며, 정면 구간의 전체 시각 길이를 약 20% 줄이는 것을 기준으로 레일 폭에 맞췄습니다.
- 앞쪽 100% / 뒤쪽 72% 원근 배율. 바퀴 접점 중심을 경로에 고정하고 후방 차량은 건물/나무 뒤, 전방 차량은 마을 앞에 배치합니다.
- 하단 기차 버튼으로 선택과 일시정지/재개를 함께 수행합니다. 상태 배지·접근성 이름에 현재 운행 상태를 표시하며, 재개하면 이전 위치에서 이어갑니다. 다른 장식품 선택은 기차 운행을 바꾸지 않습니다.
- 단일 requestAnimationFrame 루프를 사용합니다. 반복 클릭 시 기존 요청을 취소하고, 실제 탭 비활성화/페이지 숨김과 움직임 줄이기 설정에서는 중단합니다. 숨겨진 시간은 이동에 포함하지 않습니다. 움직임 줄이기 설정 중에는 버튼으로 강제 운행하지 않으며 이유를 안내합니다.
- ResizeObserver와 resize 이벤트로 크기를 다시 측정하며, HMR 정리 시 프레임/이벤트/관찰자를 해제합니다.

`tests/train.test.mjs`는 타원 일치·전체 방향·차량 간격·루프 이음매·속도·14초 주기·일시정지/재개·배경/모션 감소 상태를 검사합니다. 실제 Chromium에서는 전체 주행, 차량 깊이와 방향, 크기 변경, 실제 탭 전환, 반복 클릭과 단일 RAF 루프, 기존 설정 버튼을 확인했습니다. 토스 앱의 실제 기기 성능과 WebView 동작은 별도 검증이 필요합니다.

현재는 이미지 기반 2.5D 주행입니다. 방향은 8장 사이의 짧은 교차 전환이며, 실제 3D 차체 회전·차륜 물리·바퀴 회전·연결봉 시뮬레이션은 구현하지 않았습니다. 바퀴 기준점을 레일에 맞춘 시각적 주행이며 각 바퀴를 별도로 레일에 구속하는 물리 시뮬레이션이 아닙니다.

## 개발 환경

- Node.js **24.19.0** (`.nvmrc`), npm, TypeScript 5.9.3, Vite 8.3.5
- 공식 SDK `@apps-in-toss/web-framework` **3.9.0**
- 공식 브라우저 개발 도구 `@apps-in-toss/devtools` **3.9.0** (개발 서버에서만 활성화)
- 공식 AIT 리더 `@apps-in-toss/ait-format` **1.0.0** (빌드 검증용 devDependency)

공식 devtools와 AIT 리더의 `engines.node`는 `>=24`입니다. 프로젝트와 CI는 같은 Node 버전을 사용합니다.
별도의 API 키, 서버, DB, 환경 변수 없이 설치와 두 빌드가 가능합니다.

```sh
# 이 저장소 루트에서 실행. nvm을 사용하는 경우 먼저 nvm use
npm ci
npm run dev
```

개발 서버에는 공식 브라우저 mock과 DevTools가 연결됩니다. 실제 토스 네이티브 브리지는 일반 브라우저에서 검증할 수 없습니다.
Codex Cloud에서는 기존 `/workspace/merry-village` 체크아웃을 사용하세요. 별도 Git worktree는 필요하지 않습니다.

## 검사와 독립 빌드

```sh
npm run typecheck
npm test
npm run build:web
npm run build:ait
npm run verify:build
```

또는 위 명령을 순서대로 실행하는 `npm run build`를 사용하세요.

| 명령 | 실제 동작 | 결과 |
| --- | --- | --- |
| `build:web` | `vite build` | `dist/` (HTML, CSS, JS, build-info.json) |
| `build:ait` | 이전 merry-village.ait 삭제 후 공식 `ait build` | 저장소 루트 `merry-village.ait` |
| `verify:build` | 공식 AIT 리더와 파일 비교 | 누락·빈 파일·잘못된 appName·다른 커밋·웹과 AIT 불일치 시 실패 |

`build:ait`는 웹 빌드를 자동으로 실행하지 않습니다. 반드시 먼저 `build:web`를 실행하세요.
`apps-in-toss.config.ts`의 `webBundleDir: 'dist'`를 공식 CLI가 패키징합니다.
AIT 생성에는 콘솔 API 키가 필요하지 않습니다. `npm run deploy` (`ait deploy`)는 별도의 인증이 필요한 배포 명령이며 CI에서는 실행하지 않습니다.

`verify:build`는 설정값과 AIT 헤더 및 내부 `bundle.json`의 appName을 확인하고, AIT의 `sources/` 전체를 웹 결과물과 바이트 단위로 비교합니다.
공식 리더의 실제 공개 API를 사용하며 토스 서버의 승인·서명 검증이나 기기 실행을 대신하지 않습니다.
테스트는 정상 AIT뿐 아니라 AIT 누락·빈 파일·다른 appName·오래된 커밋·패키지와 웹 파일 불일치를 검사합니다.

## 웹 미리보기 ZIP과 AIT ZIP 다운로드

워크플로: [`.github/workflows/build.yml`](.github/workflows/build.yml)

- `main` push, PR 생성·업데이트, Actions 수동 실행(`workflow_dispatch`)으로 실행합니다.
- 체크아웃 → Node 설정 → `npm ci` → 타입 검사 → 테스트 → 웹 빌드 → AIT 빌드 → 결과 검증 → 각각 업로드 순서입니다.
- GitHub 권한은 `contents: read`만 요청합니다. 콘솔 API 키나 별도 GitHub Secrets는 필요하지 않습니다.
- 두 빌드와 검증이 모두 성공한 경우에만 두 Artifact를 업로드합니다. 보관 기간은 14일입니다.

[저장소 Actions](https://github.com/spacezoo33/merry-village/actions)에서 해당 실행을 열고 **Artifacts**에서 각각 다운로드하세요.

| Artifact 이름 | 다운로드 ZIP 내용 |
| --- | --- |
| `merry-village-web-<run_number>-<run_attempt>-<commit_sha>` | `index.html`, `assets/`, `build-info.json` |
| `merry-village-ait-<run_number>-<run_attempt>-<commit_sha>` | 실제 `merry-village.ait` 파일 |

웹 ZIP을 해제한 디렉터리에서 정적 HTTP 서버로 실행하면 PC·모바일 브라우저에서 볼 수 있습니다.
예를 들어 Python 3가 있다면 `python3 -m http.server 8080`을 실행하고 해당 서버에 브라우저로 접속하세요.
휴대폰은 같은 네트워크에서 PC의 주소를 사용합니다. `file://`로 HTML만 여는 방식은 ES 모듈 보안 제한 때문에 지원하지 않습니다.
공개 호스팅은 구성하지 않았습니다. 공개 미리보기 URL은 별도의 정적 호스팅 배포 후 사용할 수 있습니다.

AIT ZIP을 해제한 뒤 `.ait` 파일을 앱인토스 콘솔에서 업로드하고 공식 테스트 절차로 토스 앱에서 확인하세요.
콘솔 업로드·샌드박스 테스트·출시 심사는 이 워크플로에서 수행하지 않습니다.
GitHub Actions 다운로드 및 토스 기기 테스트는 실제 실행 결과를 별도로 확인해야 합니다.

## 최신 커밋 추적과 개발/운영 구분

`build-info.json`에 실제 Git HEAD, Actions 실행 ID·번호·재실행 번호를 기록하고 같은 파일을 AIT에도 담습니다.
CI는 HEAD와 `GITHUB_SHA`의 일치 여부를 검사합니다. PR에서는 GitHub가 생성한 최신 **PR merge commit**을 검증합니다.
PR head SHA와 다른 것은 정상이며, 정확한 빌드 대상은 실행 로그와 `build-info.json`으로 확인하세요.
로컬에서 파일만 수정하고 커밋하지 않으면 메타데이터는 마지막 커밋을 가리킵니다. 공유용 빌드는 커밋 후 생성하세요.

- **개발:** `npm run dev` — 공식 devtools/mock 활성화.
- **운영 산출물:** `npm run build:web` → `npm run build:ait` — devtools 플러그인 제외, 동일한 appName.
- 설치된 공식 CLI의 `ait build --help`에는 테스트용/출시용 AIT를 나누는 옵션이 없습니다. 임의의 `--test`, `--release` 옵션이나 별도 appName을 만들지 않습니다. 테스트와 출시는 콘솔의 배포·검토 단계에서 진행합니다.

## 공식 근거와 접근 제한

- 공식 개발 문서: <https://developers-apps-in-toss.toss.im/>
- [공식 Web SDK 3.9.0](https://www.npmjs.com/package/@apps-in-toss/web-framework/v/3.9.0)의 README·설정 타입
- [공식 CLI 3.9.0](https://www.npmjs.com/package/@apps-in-toss/cli/v/3.9.0)의 `ait init --help`, `ait build --help`, `ait deploy --help`
- [공식 devtools 3.9.0](https://www.npmjs.com/package/@apps-in-toss/devtools/v/3.9.0)의 README
- [공식 AIT 리더 1.0.0](https://www.npmjs.com/package/@apps-in-toss/ait-format/v/1.0.0)의 공개 타입·SDK CLI에서의 사용

프로젝트는 공식 Vite `vanilla-ts` 템플릿을 바탕으로 공식 `ait init --app-name merry-village`로 초기화했습니다.
웹/AIT 명령을 분리한 뒤 설치된 CLI로 실제 빌드했습니다. 위 도움말은 설치 후 `npx ait build --help` 등으로 재확인할 수 있습니다.
초기 구축 당시 문서 사이트 `/`와 `/llms.txt`는 현재 Cloud 실행 환경의 HTTPS CONNECT 프록시에서 403으로 차단되었습니다.
저장된 환경 초안에는 도메인이 있지만 실행 환경 revision 1의 적용 목록에는 없어 두 상태가 불일치했습니다.
문서 사이트 내용을 읽었다고 주장하지 않으며, 구현은 공식 배포 패키지의 도움말·타입·실제 빌드 결과를 근거로 했습니다.
