# 캐럴 5곡과 기차 소리 권리

외부 MP3·상업 녹음물·현대 편곡·가사·번역 가사는 사용하지 않는다.
`src/catalog.ts`의 오래된 원선율을 직접 음높이/박자로 기록하고, `music.ts`에서 벨·글로켄슈필 배음,
낮은 반주와 작은 종을 새로 합성한다. 동일한 선율의 5가지 변형이 아니라 아래 다섯 다른 곡이다.

| 앱 제목 | 원선율과 보호기간 근거 | 현재 연주 |
|---|---|---|
| 고요한 밤 | Franz Xaver Gruber, 1818. 1863 사망. Mutopia 공개 악보의 Public Domain 표기 확인 | 자체 채보/벨 합성, 76 BPM |
| 징글벨 | James Lord Pierpont, 1857 《The One Horse Open Sleigh》. 1893 사망(2026년 기준 133년 경과) | 원선율을 자체 채보·반주·합성, 116 BPM |
| 기쁘다 구주 오셨네 | ANTIOCH, Lowell Mason, 1836. 1872 사망. Mutopia 공개 악보 Public Domain 확인 | 자체 벨 합성, 104 BPM |
| 오 크리스마스 트리 | 독일 전통 선율 / Ernst Anschütz의 1824 크리스마스 노래. 1861 사망(165년 경과) | 원선율을 자체 채보·반주·합성, 100 BPM |
| 천사 찬송하기를 | Mendelssohn의 1840 선율(1847 사망), Cummings의 1855 연결(1915 사망). Mutopia 공개 악보 Public Domain 확인 | 자체 벨 합성, 108 BPM |

실제로 원문을 확인한 공개 악보는 MutopiaProject 커밋
`2144afd6f52d56c5b6995b8b589ef1268b3139f0`의 다음 파일이며 [music-sources](music-sources/)에 출처·권리 표기를 그대로 보관한다.

- [고요한 밤](https://github.com/MutopiaProject/MutopiaProject/blob/2144afd6f52d56c5b6995b8b589ef1268b3139f0/ftp/GruberFX/stille-orig/stille-orig.ly)
- [ANTIOCH](https://github.com/MutopiaProject/MutopiaProject/blob/2144afd6f52d56c5b6995b8b589ef1268b3139f0/ftp/HandelGF/antioch/antioch.ly)
- [MENDELSSOHN](https://github.com/MutopiaProject/MutopiaProject/blob/2144afd6f52d56c5b6995b8b589ef1268b3139f0/ftp/Mendelssohn-BartholdyF/mendelssohn/mendelssohn.ly)

징글벨과 오 크리스마스 트리는 위 원저작물의 오래된 선율을 자체 기록했다. 외부 현대 악보/편곡을 다운로드하지 않았다.
징글벨의 역사적 발행 자료 참조는 [Library of Congress](https://www.loc.gov/item/sm1857.451080/)이다.
이 링크는 역사적 자료 참고이며 이번 세션에서 해당 스캔의 네트워크 열람을 검증했다고 주장하지 않는다.
원곡의 보호기간 만료는 같은 제목의 현대 녹음물/편곡을 사용할 권리가 있다는 뜻이 아니다. 이 앱은 그런 녹음물을 쓰지 않는다.
이전 버전의 공개 악보도 삭제하지 않고 기록으로 보존했다.

자체 합성 연주를 사용하므로 제3자 녹음물·실연자의 사용 허락에 의존하지 않는다.
곡별 실제 음표/박자 합으로 재생 길이를 계산하며, 음원 버퍼를 같은 최대 진폭으로 정규화하고
짧은 어택/릴리스로 전환 잡음을 줄인다. 최대 2개의 모노 22.05kHz 버퍼를 캐시한다.

`train-sound.ts`의 기차 주행음은 직접 만든 노이즈 + 필터 + 완만한 엔벌로프이고,
경적은 자체 사인파 3음 합성이다. 녹음 샘플이나 외부 효과음 라이브러리가 없다.
주행 중에만 연속적인 작은 증기음과 0.29초 주기의 칙칙 소리를 내며,
첫 경적은 27초 뒤, 이후 29/23/34/27초 간격이다. 정지/백그라운드에서 스케줄과 소리를 끊고
재개 시 남은 경적 대기 시간을 이어간다. 브라우저가 소리를 차단하면 첫 터치로 다시 시도한다.

기차 경적의 대기 시간은 음악/브라우저 장치 시간이 아니라 실제 운행 시간으로 계산한다. 동작을 끈 동안 음악이 계속 재생되어도 경적 대기 시간이 흐르거나 보상 없이 경적이 재생된 것으로 기록되지 않는다. 주행음 루프와 경적은 렌더링 타이머와 독립적으로 오디오 엔진에서 재생한다.
