export const VILLAGES = [
  {
    id: "cozy",
    name: "포근한 크리스마스",
    subtitle: "불빛이 모이는 우리 동네",
    detail: "트리와 작은 집, 산타가 반기는 메리빌리지의 첫 번째 겨울.",
    premium: false,
    accent: "#d5a35b",
    kind: "cozy",
  },
  {
    id: "forest",
    name: "눈꽃 숲속 마을",
    subtitle: "고요한 숲에서 쉬어가요",
    detail: "눈 덮인 소나무 사이로 루돌프와 눈사람이 기다려요.",
    premium: false,
    accent: "#92b3a0",
    kind: "forest",
  },
  {
    id: "chapel",
    name: "종소리 작은 성당",
    subtitle: "따뜻한 창가에 머무는 밤",
    detail: "작은 성당과 옹기종기 모인 집들이 만드는 평온한 풍경.",
    premium: false,
    accent: "#dac4a0",
    kind: "chapel",
  },
  {
    id: "workshop",
    name: "산타의 선물 공방",
    subtitle: "설렘을 포장하는 시간",
    detail: "금빛 리본의 선물 공방과 산타의 작은 선물 기차.",
    premium: true,
    accent: "#e8a282",
    kind: "workshop",
  },
  {
    id: "palace",
    name: "달빛 겨울 궁전",
    subtitle: "파란 얼음 위로 번지는 온기",
    detail: "얼음 궁전의 따뜻한 창문과 별빛 트리가 빛나는 겨울.",
    premium: true,
    accent: "#a8d3e8",
    kind: "palace",
  },
  {
    id: "gingerbread",
    name: "진저브레드 마을",
    subtitle: "달콤한 겨울의 초대",
    detail: "아이싱 지붕과 캔디 문이 있는 작은 과자 마을.",
    premium: true,
    accent: "#e9b494",
    kind: "gingerbread",
  },
] as const;
export type VillageId = (typeof VILLAGES)[number]["id"];
export const NIGHTS = [
  {
    id: "aurora",
    name: "오로라의 밤",
    description: "민트빛과 보랏빛이 천천히 흐르는 하늘",
    symbol: "aurora",
  },
  {
    id: "shooting",
    name: "별빛의 밤",
    description: "반짝이는 별과 천천히 내려오는 황금빛 입자",
    symbol: "star",
  },
  {
    id: "wishes",
    name: "황금빛 밤",
    description: "마을의 장식과 가로등을 감싸는 풍성한 금빛",
    symbol: "lantern",
  },
] as const;
export type NightId = (typeof NIGHTS)[number]["id"];
// Original public-domain melodies, transcribed and freshly synthesised for this app.
const notes = (score: string): number[] =>
  score.split(" ").map((n) => Number(n.split(":")[0]));
export const TRACKS = [
  {
    id: "snow",
    name: "고요한 밤",
    mood: "포근한 벨 오르골 · Gruber, 1818",
    bpm: 76,
    root: 60,
    meter: 3,
    score:
      "67:1.5 69:.5 67:1 64:3 67:1.5 69:.5 67:1 64:3 74:2 74:1 71:3 72:2 72:1 67:3 69:2 69:1 72:1.5 71:.5 69:1 67:1.5 69:.5 67:1 64:3 69:2 69:1 72:1.5 71:.5 69:1 67:1.5 69:.5 67:1 64:3 74:2 74:1 77:1.5 74:.5 71:1 72:3 76:3 72:1 67:1 64:1 67:1.5 65:.5 62:1 60:5 0:1",
  },
  {
    id: "starlight",
    name: "징글벨",
    mood: "경쾌한 글로켄슈필 · Pierpont, 1857",
    bpm: 116,
    root: 60,
    meter: 4,
    score:
      "64:1 62:1 60:1 67:1 64:1 62:1 60:1 67:1 64:1 62:1 60:1 69:1 67:2 0:2 64:1 62:1 60:1 67:1 64:1 62:1 60:1 67:1 69:1 69:1 69:1 71:1 67:3 0:1 76:1 76:1 76:2 76:1 76:1 76:2 76:1 79:1 72:1.5 74:.5 76:4 77:1 77:1 77:1.5 77:.5 77:1 76:1 76:1 76:.5 76:.5 76:1 74:1 74:1 76:1 74:2 79:2 76:1 76:1 76:2 76:1 76:1 76:2 76:1 79:1 72:1.5 74:.5 76:4 77:1 77:1 77:1 77:1 77:1 76:1 76:1 76:.5 76:.5 79:1 79:1 77:1 74:1 72:3 0:1",
  },
  {
    id: "waltz",
    name: "기쁘다 구주 오셨네",
    mood: "풍성한 크리스마스 벨 · ANTIOCH, 1836",
    bpm: 104,
    root: 62,
    meter: 4,
    score:
      "74:1 73:.75 71:.25 69:1.5 67:.5 66:1 64:1 62:1.5 69:.5 71:1.5 71:.5 73:1.5 73:.5 74:1.5 74:.5 74:.5 73:.5 71:.5 69:.5 69:.75 67:.25 69:.5 74:.5 74:.5 73:.5 71:.5 69:.5 69:.75 67:.25 66:.5 66:.5 66:.5 66:.5 66:.5 66:.25 67:.25 69:1.5 67:.25 66:.25 64:.5 64:.5 64:.5 64:.25 66:.25 67:1.5 66:.25 64:.25 62:.5 74:1 71:.5 69:.75 67:.25 66:.5 67:.5 66:1 64:1 62:2 0:2",
  },
  {
    id: "lullaby",
    name: "오 크리스마스 트리",
    mood: "사랑스러운 오르골 · 전통 선율, 1824",
    bpm: 100,
    root: 65,
    meter: 3,
    score:
      "72:1 77:1 77:.5 77:1.5 79:1 81:1 81:2 81:.5 79:.5 81:1 82:1 76:1 79:1 77:2 72:1 77:1 77:.5 77:1.5 79:1 81:1 81:2 81:.5 79:.5 81:1 82:1 76:1 79:1 77:2 84:.5 84:.5 81:1 86:1 84:1.5 84:.5 82:1 82:2 82:.5 82:.5 79:1 84:1 82:1.5 82:.5 81:1 81:2 72:1 77:1 77:.5 77:1.5 79:1 81:1 81:2 81:.5 79:.5 81:1 82:1 76:1 79:1 77:3 0:1",
  },
  {
    id: "letter",
    name: "천사 찬송하기를",
    mood: "밝은 벨 앙상블 · Mendelssohn, 1840",
    bpm: 108,
    root: 65,
    meter: 4,
    score:
      "60:1 65:1 65:1.5 64:.5 65:1 69:1 69:1 67:1 72:1 72:1 72:1.5 70:.5 69:1 67:1 69:2 60:1 65:1 65:1.5 64:.5 65:1 69:1 69:1 67:1 72:1 67:1 67:1.5 64:.5 64:1 62:1 60:2 72:1 72:1 72:1 65:1 70:1 69:1 69:1 67:1 72:1 72:1 72:1 65:1 70:1 69:1 69:1 67:1 74:1 74:1 74:1 72:1 70:1 69:1 70:2 67:1 69:.5 70:.5 72:1.5 65:.5 65:1 67:1 69:2 74:1.5 74:.5 74:1 72:1 70:1 69:1 70:2 67:1 69:.5 70:.5 72:1.5 65:.5 65:1 67:1 65:2 0:2",
  },
].map((t) => ({ ...t, notes: notes(t.score) }));
export type TrackId = "snow" | "starlight" | "waltz" | "lullaby" | "letter";
export const villageById = (id: VillageId) =>
  VILLAGES.find((v) => v.id === id)!;
