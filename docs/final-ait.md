# 최종 AIT 생성

사용자의 명시적인 최종 AIT 요청에만 실행한다. 일반 개발 명령과 개발 브랜치 push는 기존 웹 전용/Pages 동작을 유지한다. 웹 미리보기 ZIP은 생성하지 않는다.

## 로컬

```sh
npm run release:ait
```

TypeScript → 자동 테스트 → 프로덕션 웹 빌드 → 공식 SDK `ait build` → 실제 AIT 형식/appName/웹 파일 바이트 비교 → 수동 AIT 테스트를 실행한다. 출력은 `merry-village.ait`, appName은 `merry-village`다. `*.ait`는 저장소에 커밋하지 않는다.

## Actions 실행

`.github/workflows/build-ait.yml`은 다음 명시적 실행만 허용한다.

- `workflow_dispatch`에서 개발 브랜치와 `confirm_release=true` 선택.
- 개발 브랜치 최신 커밋의 전체 SHA를 이름으로 사용한 릴리스 태그를 직접 푸시.

GitHub는 `workflow_dispatch` 워크플로의 기본 브랜치 등록을 요구한다. 현재 main에는 이 파일이 없고 main 변경/병합을 하지 않으므로, 최초 실행은 다음 수동 태그 요청을 사용한다. 이후 실행 화면의 Re-run jobs로 같은 커밋을 재빌드할 수도 있다.

```sh
release_sha=$(git rev-parse HEAD)
git tag "ait-release/$release_sha" "$release_sha"
git push origin "refs/tags/ait-release/$release_sha"
```

워크플로는 checkout SHA가 원격 `feat/elliptical-train-ride` 최신 SHA와 동일한지 검사하고, 태그 이름의 SHA도 동일해야 빌드한다. main이나 다른 브랜치/일반 태그/일반 개발 push에서는 AIT를 만들지 않는다. 후속 코드를 빌드하려면 새 개발 커밋의 SHA로 새 릴리스 태그를 수동 푸시한다. 태그를 덮어쓰지 않는다.

Artifact 이름: `merry-village-ait-<run_number>-<run_attempt>-<full_sha>`. GitHub Actions 실행 페이지의 Artifacts에서 받아 ZIP 안의 `merry-village.ait`를 꺼낸다. 이 ZIP은 AIT 전달용 Actions 포장이고 웹 미리보기 ZIP이 아니다. 보존 기간은 14일이다.

## 광고 연결

`4247b66` 이후 설정은 `public/runtime-config.json`의 `rewardedAdGroupId: ait.v2.live.2de9ae7ff9e24e94`다. `adAvailability`가 이 파일을 읽고, `claimReward`가 해당 ID를 `earnPass`에 전달한다. SDK `loadFullScreenAd`와 `showFullScreenAd` 양쪽 모두 `options.adGroupId`로 같은 값을 사용한다.

보상은 `userEarnedReward`와 정상 종료 확인 후 SDK 서버 시간을 확인하고 빌리지별 7일 영수증을 저장한다. 취소·실패·시간 초과에는 지급하지 않으며, 활성 이용권은 누적 연장하지 않는다. 웹/개발 환경에서는 실광고와 이용권 지급을 하지 않는다. 실제 토스 앱에서 광고 노출·보상 콜백·지속 저장의 종단 검증은 별도다.

릴리스 전 `node scripts/check-release-ad.mjs`는 AIT 안의 설정을 읽고 실제 `native.ts` 코드를 격리된 SDK 테스트 더블로 실행해 load/show 양쪽 ID와 earned/dismissed→서버 시간→7일 지급, 취소 시 미지급을 검증한다. 실광고 성공을 의미하지 않으며 배포 앱에 모의 SDK나 테스트 이용권을 추가하지 않는다.
