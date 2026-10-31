# 음악 권리와 재생 방식

외부 MP3, MIDI 녹음물, 음원 서비스, 현대 가수의 연주나 현대 편곡을 사용하지 않는다.
`src/catalog.ts`에 서로 다른 다섯 퍼블릭 도메인 선율을 직접 음높이/박자로 옮겼으며,
`src/music.ts`의 자체 사인파 오르골 합성이 실행 시 새로 소리를 만든다. 외부 녹음물의 이용 허락에 의존하지 않는다.
가사·번역 가사는 제공하지 않는다. 새로운 단선율 합성 코드/연주는 이 프로젝트용으로 제작했다.

공개 악보 저장소 MutopiaProject의 커밋 `2144afd6f52d56c5b6995b8b589ef1268b3139f0`에서 실제 파일을 확인했다.
다섯 원본 모두 `copyright = "Public Domain"`와 typesetter의 public-domain 헌정 문구를 포함한다.
확인한 원문을 [music-sources](music-sources/)에 보존했다. 악보의 출처·편집자 표기를 원문에서 삭제하지 않았다.
이 권리 표기는 원곡/공개 악보에 대한 근거이며 제3자 녹음물까지 자유롭다는 뜻이 아니다.

| 앱 제목 | 선율/원저작물 | 확인한 공개 악보 |
|---|---|---|
| 고요한 밤 | Franz Xaver Gruber, 1818 (1863 사망) | [stille-orig.ly](https://github.com/MutopiaProject/MutopiaProject/blob/2144afd6f52d56c5b6995b8b589ef1268b3139f0/ftp/GruberFX/stille-orig/stille-orig.ly) |
| 저 들 밖에 한밤중에 | The First Noel, 전통 캐럴, 1833 공개 | [first_noel.ly](https://github.com/MutopiaProject/MutopiaProject/blob/2144afd6f52d56c5b6995b8b589ef1268b3139f0/ftp/Traditional/first_noel/first_noel.ly) |
| 그 맑고 환한 밤중에 | CAROL, Richard Storrs Willis, 1850 (1900 사망) | [carol.ly](https://github.com/MutopiaProject/MutopiaProject/blob/2144afd6f52d56c5b6995b8b589ef1268b3139f0/ftp/WillisRS/carol/carol.ly) |
| 이 아기는 누구일까 | Greensleeves, 전통 선율 (What Child Is This의 선율) | [Greensleaves.ly](https://github.com/MutopiaProject/MutopiaProject/blob/2144afd6f52d56c5b6995b8b589ef1268b3139f0/ftp/Traditional/Greensleaves/Greensleaves.ly) |
| 호랑가시나무와 담쟁이 | The Holly and the Ivy, 전통 캐럴 | [thehollyandtheivy.ly](https://github.com/MutopiaProject/MutopiaProject/blob/2144afd6f52d56c5b6995b8b589ef1268b3139f0/ftp/Traditional/thehollyandtheivy/thehollyandtheivy.ly) |

재생 길이는 실제 악보의 박자 합계/템포에서 계산한다. 곡마다 선율과 길이가 다르며 같은 선율의 음색 변형 5곡이 아니다.
2개까지의 모노 22.05kHz 버퍼를 캐시한다. 루프, 시간 표시, 위치 이동, 이전/다음, 일시정지/재개, 볼륨,
자동재생 시도/첫 터치 재시도와 백그라운드 중단을 지원한다. 트리/기차 동작과 독립적이다.
