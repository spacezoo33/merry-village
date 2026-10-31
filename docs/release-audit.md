# 출시 전 점검 — 2026-11-01 (한국 시간)

현재 **출시 가능 판정 보류**다. 웹 동작 검증과 토스 출시 승인은 다르다.
이번에는 AIT 생성, 검수 제출, main 병합, 웹 ZIP 생성/업로드를 하지 않는다.

## 근거와 접근 한계

- SDK: 설치된 공식 `@apps-in-toss/web-framework@3.9.0`의 실제 타입/구현과 Apache-2.0 LICENSE 확인.
- 공식 웹 문서 `https://developers-apps-in-toss.toss.im/`: 환경 프록시 CONNECT 403으로 본문 미열람.
- Toss 공식 공개 저장소 `toss/apps-in-toss-harness` 커밋 `ecec890b4769bd726955f6fad3a5bb8928b00ed2`의
  `packages/agent-plugin/shared/skills/launch/references/lookup-map.md`에서 공식 체크리스트 경로만 확인했다.
  이 파일은 문서 본문을 싣지 않으므로 최신 정책 준수 판정의 대체 근거로 삼지 않는다.
- 다음 본문은 콘솔/접근 가능한 환경에서 추가 확인해야 한다:
  [비게임 체크리스트](https://developers-apps-in-toss.toss.im/checklist/app-nongame),
  [저작권 체크리스트](https://developers-apps-in-toss.toss.im/checklist/copyright),
  [운영 정책](https://developers-apps-in-toss.toss.im/intro/guide),
  [콘솔 워크스페이스](https://developers-apps-in-toss.toss.im/guide/operation/console-workspace),
  [SDK 3.x](https://developers-apps-in-toss.toss.im/documentation/sdk/v3).
  경로는 공식 저장소의 안내이며 현재 웹 응답/정책 본문은 미검증이다.

## 저작권·라이선스

| 대상 | 분류 | 확인한 사실 / 남은 작업 |
|---|---|---|
| 음악 | 안전 + 확인 필요 | 원선율/직접 합성 및 실제 악보 대조 범위는 [음악 문서](music-rights.md). 징글벨 역사 악보 원문·일부 초판 판면 추가 대조는 미검증 |
| 주행음·기적 | 안전 | 소스에서 자체 노이즈/사인파 합성 확인. 외부 샘플·음원 파일 없음 |
| 배포 중 이미지 3개 | 확인 필요 | `product-villages.png`, `christmas-room.png`, `fir-sprig.png`. 기존 AI 생성 기록은 [assets README](../src/assets/README.md)에 보존. 생성 작업 ID가 있으나 원래 생성 파일과 사용자 참조 이미지의 이용 허락 증빙은 현재 파일 시스템에서 재확인하지 못함 |
| 보관 이미지 3개 | 확인 필요 | miniature-atlas / special-buildings / train-directions는 보관만 하며 현재 웹 번들에 없음. 임의 삭제하지 않음 |
| 3D 모델 | 안전(코드 출처 범위) | 트리/기차/철로는 기존 프로젝트의 Three.js 절차 모델. 외부 모델 파일 없음. 사용 텍스처는 위 이미지 검토 대상 |
| 외부 URL·브랜드 | 확인 필요 | 장면은 로컬 PNG만 사용. 실제 이미지를 시각 확인했을 때 뚜렷한 유명 캐릭터/브랜드 표식은 발견하지 못했으나 상표권 검색·전문 법률 검토를 한 것은 아님 |
| 실제 배포 라이브러리 6종 | 안전(라이선스 조건 범위) | SDK Apache-2.0, Three.js/Valibot/@webview-bridge/web·utils MIT, semver ISC. 상업 사용 금지·비상업 전용 조건은 발견하지 않음. 약관/권리 고지는 별개 |
| 라이브러리 고지 누락 | 수정 필요 → 수정 완료 | Vite의 실제 번들 모듈 기준 `THIRD-PARTY-LICENSES.txt`를 웹 배포에 포함. [보존 고지](third-party-licenses.md). 개발 전용 devtools/빌드 도구와 런타임 의존성을 구분 |

[실제 에셋 파일·SHA-256·배포 여부](audits/asset-inventory.json). 모든 기존 PNG는 이번에 변경하지 않았다.
SDK 상업 사용 가능 라이선스 확인은 토스 서비스 계약·광고 운영 승인을 대신하지 않는다.

## 앱인토스 기능·정책 점검

| 항목 | 분류 | 현재 근거 및 미검증 범위 |
|---|---|---|
| appName / SDK / 설정 | 안전 | merry-village, 공식 SDK 3.9.0, 기존 config와 permissions 유지. 타입 검사 |
| 메뉴 / 뒤로가기 / 닫기 | 수정 필요 → 수정 완료 + 확인 필요 | 웹 dialog 닫기/Escape 유지. SDK 선언에 실제 존재하는 `graniteEvent.addEventListener('backEvent', …)`를 메뉴 개방 중에만 구독, 닫으면 해제. 루트 기본 뒤로가기는 가로채지 않음. 네이티브 이벤트 전달은 실기기 필요 |
| 모바일 / 안전 영역 | 확인 필요 | 기존 env(safe-area-inset-*)와 viewport-fit=cover 유지. 브라우저 390px 검증과 토스 실제 안전 영역은 별개 |
| 시작 / 복귀 / 오디오 | 안전(웹 경로) + 확인 필요 | visibilitychange에서 음악·기차 정지와 장치 suspend, 복귀 시 사용자 의도대로 재개. 실제 토스 생명주기·통화/시스템 오디오 중단 필요 |
| WebGL / 모션 감소 | 안전(브라우저 범위) + 확인 필요 | WebGL 손실/복구 코드, 낮은 DPR/30fps, reduced-motion 유지. 소프트웨어 Chromium은 실제 모바일 GPU 성능 검증이 아님 |
| PNG | 안전(웹 경로) + 확인 필요 | 1200×1560 PNG. 실제 SDK `File.saveBase64` 지원 확인 후 호출, 일반 웹 다운로드 fallback. iOS/Android 토스 앨범 저장은 미검증 |
| 광고 보상 | 수정 필요 | 광고 그룹 ID가 빈 문자열. `public/runtime-config.json`에 콘솔의 실제 ID를 설정해야 하며 임의 ID는 넣지 않음. 실광고 시청/보상은 미검증 |
| 광고 실패/중복 | 안전(로직·단위 테스트 범위) | 실제 SDK loadFullScreenAd/showFullScreenAd, userEarnedReward + 정상 종료 확인에만 지급. 실패/오류/시간 초과 시 미지급, 중복 콜백 정리. 테스트 포트는 tests에만 있고 앱 우회 보상 없음 |
| 광고 중 소리 | 확인 필요 | claimReward 시작 전 rewardBusy=true → syncVisibility, finally에서 해제. 문서 숨김과 함께 정지/복귀 처리하는 코드 경로 확인. 실제 광고 오디오 포커스는 미검증 |
| 7일 이용권 | 안전(기능 테스트) + 확인 필요 | 1회 보상/7일/누적 없음/만료 후 재시청, localStorage 영수증과 재실행 유지. 서버 검증·계정 연결 없음. 저장소/시간 변조로 우회할 수 있어 광고 수익·권한 통제 위험이 있음 |
| 개인정보·권한·통신 | 안전(현재 소스 범위) + 확인 필요 | 별도 로그인·사용자 개인정보 서버·외부 이미지/음원 없음. 설정 permissions=[] 유지. 실제 광고 SDK 통신/개인정보 고지·동의 요구는 현재 공식 정책/콘솔에서 확인해야 함 |
| 사업자·광고 정산 | 확인 필요 | 최신 정책 본문·사용자 콘솔 상태 미열람. 사업자/대표자/정산 계좌·세금 정보의 필요한 범위와 등록 완료 여부를 콘솔에서 확인. 조건/금액/개인사업자 허용 여부를 추정하지 않음 |

## 사용자가 출시 전에 해야 할 일

1. 콘솔에서 실제 보상형 광고 그룹 ID를 발급/확인해 공개 설정에 넣기. 사업자·광고 정산 등록 상태와 최신 정책 확인.
2. 토스 iOS/Android 실기기에서 광고 완료/취소/실패/중복·소리 정지/재개·네이티브 뒤로가기·사진 저장·복귀·안전 영역·WebGL 성능 확인.
3. 이미지 생성 내역·참조 이미지 사용 권한 증빙, 음악 문서의 추가 원문 대조 항목 확인.
4. 로컬 영수증 변조 위험을 수용할지, 서버 검증을 도입할지 결정. 현재는 서버 검증을 구현했다고 주장하지 않음.
5. 최신 공식 체크리스트 대조와 위 미검증 항목 해소 후에만 최종 AIT 생성을 별도로 명시 승인.

## 검증 재현

`npm run build` = 타입 검사 → tests/*.test.mjs → 웹 빌드 → 웹/라이선스 검증.
실제 브라우저: `npm run dev -- --port 5175 --strictPort` 실행 후,
`PLAYWRIGHT_MODULE=<설치된 playwright-core의 index.mjs 절대 경로> node scripts/check-release-browser.mjs`.
기존 도구를 재사용하며 새 앱 라이브러리는 설치하지 않았다. 결과는 `/tmp/merry-release-qa/`의 JSON과 PNG이며 ZIP은 만들지 않는다.

## 이번 실행 결과

- TypeScript 통과. 자동 테스트 **31개 통과 / 실패 0 / 건너뜀 0**.
- ST. LOUIS 소프라노 전체 **58개 음높이/박자 이벤트**가 읽은 악보와 일치.
- 실제 Chromium의 음악 버스에서 순서대로 RMS 약 .0527 / .0410 / .0398 / .0249 / .0437 출력 확인.
  곡 목록·이전/다음·재생/일시정지·한 곡 반복·끝 자동 다음 곡·웹 숨김/복귀 처리 통과.
- 실제 앱의 6개 빌리지 모두 보이는 중앙 통과에서 기적 1회와 실제 오디오 출력 확인.
  cozy 뒤쪽 숨김 중앙 통과 시 추가 기적 없음, 각 마을에서 동작 OFF 후 기차/기적 무음.
- 조명 4모드 순환과 저장·마을 전환 유지, 창문 오버레이 0개, 메뉴 눈 레이어 0개 확인.
  6개 조명 픽스처의 ON/감광·실제 회전 전구의 화면 위치 동기화·동작 ON 상태에서 reduced-motion 정지 확인.
- 무료 마을 실제 PNG 다운로드 1200×1560, 메뉴 4개와 특별한 밤 3종 선택창 확인. 페이지/셰이더 오류 0.
- 조명 픽스처의 최초 검사는 트리 밖을 비추는 순차 모드 시점이라 차이가 없어 실패했다.
  검사 시점을 트리 영역으로 바로잡아 해당 조명/모션 검증만 재실행해 통과했다.
  전체 브라우저 검사를 한 번에 모두 통과했다고 과장하지 않고, 통과한 두 단계와 측정값을
  [브라우저 요약](audits/browser-summary.json)에 구분해 기록한다.
- 네이티브 뒤로가기/사진·실제 보상 광고·광고 오디오 포커스·실기기 성능·스피커 청음은 미검증.

최종 커밋 SHA에 맞는 운영 웹 빌드와 Actions/Pages 상태는 작업 완료 보고의 해당 커밋 링크를 기준으로 한다.
저장소의 이전 ZIP/AIT 파일이 존재하더라도 이번 작업에서 새로 만들거나 갱신하지 않았다.
