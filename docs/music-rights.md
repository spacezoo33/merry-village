# 음악 및 기차 소리의 출처

외부 MP3·상업 녹음물·현대 합창/피아노 편곡·가사·번역 가사는 사용하지 않는다.
앱은 원선율의 단선율 음높이/박자를 `src/catalog.ts`에 기록하고,
`src/music-synth.ts`의 자체 오르골 악기와 독자적인 저음 반주로 연주한다.
음악 밖에 별도로 얹던 작은 종 신호·버퍼·소스·버스는 제거했다.
오르골 악기의 배음은 음악 자체의 음색으로 유지한다.

| 앱 제목 | 사용하는 원선율 | 앱 연주 |
|---|---|---|
| 고요한 밤 | Franz Xaver Gruber, 1818; 작곡가 1863 사망. 보존한 Mutopia 원문 Public Domain 표기 | 자체 합성, 76 BPM |
| 징글벨 | James Lord Pierpont, 1857; 작곡가 1893 사망. 기존 자체 원선율 채보 | 자체 합성, 116 BPM |
| 기쁘다 구주 오셨네 | ANTIOCH, Lowell Mason, 1836; 작곡가 1872 사망. 보존한 Mutopia 원문 Public Domain 표기 | 자체 합성, 104 BPM |
| 축하해요 크리스마스 | We Wish You a Merry Christmas의 전통 West Country 단선율. Warrell의 1935 합창 편곡과 구분 | 독립 채보·자체 반주·합성, 112 BPM |
| 거룩한 밤 | Adolphe Adam, 1847; 작곡가 1856 사망. Mutopia의 Minuit Chrétiens 원문 Public Domain 표기 실제 확인 | 원선율의 장식음을 간소화한 자체 오르골 연주, 78 BPM |

5번은 보존한 [o-holy-night.ly](music-sources/o-holy-night.ly)의 `melodie` 파트에 근거한다.
출처는 MutopiaProject 커밋 `2144afd6f52d56c5b6995b8b589ef1268b3139f0`의
[AdamA/minuit_chretiens/minuit_chretiens.ly](https://github.com/MutopiaProject/MutopiaProject/blob/2144afd6f52d56c5b6995b8b589ef1268b3139f0/ftp/AdamA/minuit_chretiens/minuit_chretiens.ly)이며,
`source = "Ed. Léon Grus"`, `copyright = "Domaine public - Public Domain"`,
`license = "Public Domain"`가 명시되어 있다. 현대 영어 가사·번역 가사 및 외부 반주/녹음은 쓰지 않는다.

4번의 전통 선율 교차 확인 자료와 접근 한계는
[we-wish-you-a-merry-christmas.txt](music-sources/we-wish-you-a-merry-christmas.txt)에 기록했다.
참조 저장소의 프로그램은 이용 허락을 확인할 수 없어 복사하지 않았다.
알려진 전통 단선율만 독립적으로 기록했고, 보호될 수 있는 1935년 합창 편곡은 사용하지 않는다.
Hymnary 원문과 역사적 인쇄 악보의 추가 대조는 현재 네트워크 제한으로 미검증이다.
이 기록은 모든 국가에서의 법률 검토나 현대 편곡·녹음물의 이용 허락을 뜻하지 않는다.

기존 공개 악보 보존 기록도 삭제하지 않는다. 고요한 밤과 ANTIOCH의 원문은 같은 Mutopia 커밋의
`ftp/GruberFX/stille-orig/stille-orig.ly`, `ftp/HandelGF/antioch/antioch.ly`이다.
징글벨의 역사적 발행 자료 참고: <https://www.loc.gov/item/sm1857.451080/>.
이 링크의 스캔을 이번 세션에서 열람했다고 주장하지 않는다.

음악은 22.05kHz 모노 Float32 PCM으로 새로 합성하고 최대 진폭 .36으로 정규화한다.
2개 곡까지 캐시하고 재생·일시정지·이전/다음·한 곡 반복·곡 끝 자동 다음 곡을 지원한다.
별도 종소리 stem이나 종소리 예약 타이머는 없다.

`audio-engine.ts`의 음악/기차/기적 독립 버스와 최종 헤드룸 리미터를 사용한다.
기차 칙칙 소리는 자체 노이즈·필터·엔벌로프, 기적은 자체 사인파 3음 합성이다.
기차 주행음 볼륨과 18초당 64펄스는 유지한다. 기적은 매번 20~50초의 새로운 난수를 뽑으며,
정지·백그라운드 진입 시 예약 음원과 스케줄을 취소하고, 운행 재개 시 새 간격으로 시작한다.
