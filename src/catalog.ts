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
// Underlying public-domain melodies; fresh music-box synthesis, no recordings.
const notes = (score: string): number[] =>
  score.split(" ").map((n) => Number(n.split(":")[0]));
export const TRACKS = [
  {
    id: "snow",
    name: "고요한 밤",
    mood: "Silent Night · 1818",
    bpm: 66,
    root: 60,
    score:
      "67:1.5 69:.5 67:1 64:3 67:1.5 69:.5 67:1 64:3 74:2 74:1 71:3 72:2 72:1 67:3 69:2 69:1 72:1.5 71:.5 69:1 67:1.5 69:.5 67:1 64:3 69:2 69:1 72:1.5 71:.5 69:1 67:1.5 69:.5 67:1 64:3 74:2 74:1 77:1.5 74:.5 71:1 72:3 76:3 72:1 67:1 64:1 67:1.5 65:.5 62:1 60:5 0:1",
  },
  {
    id: "starlight",
    name: "저 들 밖에 한밤중에",
    mood: "The First Noel · 1833",
    bpm: 84,
    root: 62,
    score:
      "66:.5 64:.5 62:1.5 64:.5 66:.5 67:.5 69:2 71:.5 73:.5 74:1 73:1 71:1 69:2 71:.5 73:.5 74:1 73:1 71:1 69:1 71:1 73:1 74:1 69:1 67:1 66:2 66:.5 64:.5 62:1.5 64:.5 66:.5 67:.5 69:2 71:.5 73:.5 74:1 73:1 71:1 69:2 71:.5 73:.5 74:1 73:1 71:1 69:1 71:1 73:1 74:1 69:1 67:1 66:2 66:.5 64:.5 62:1 62:1 73:1 71:1 71:1 69:1 74:1 73:1 71:1 69:1 71:1 73:1 74:1 69:1 67:1 66:3 0:1",
  },
  {
    id: "waltz",
    name: "그 맑고 환한 밤중에",
    mood: "It Came Upon the Midnight Clear · 1850",
    bpm: 92,
    root: 70,
    score:
      "65:1 74:2 69:1 72:1 70:1 67:1 65:2 67:1 65:2 65:1 67:1 69:1 70:1 70:1 72:1 74:1 72:5 65:1 74:2 69:1 72:1 70:1 67:1 65:2 67:1 65:2 65:1 67:2 67:1 69:1 67:1 65:1 70:5 74:1 74:2 62:1 62:1 64:1 66:1 67:1 67:1 69:1 70:2 74:1 72:1 70:1 69:1 67:1 69:1 67:1 65:5 65:1 74:2 69:1 72:1 70:1 67:1 65:2 67:1 65:2 65:1 67:2 67:1 69:1 67:1 65:1 70:5 0:1",
  },
  {
    id: "lullaby",
    name: "이 아기는 누구일까",
    mood: "What Child Is This · Greensleeves",
    bpm: 90,
    root: 57,
    score:
      "69:1 72:2 74:1 76:1.5 77:.5 76:1 74:2 71:1 67:1.5 69:.5 71:1 72:2 69:1 69:1.5 68:.5 69:1 71:2 68:1 64:2 69:1 72:2 74:1 76:1.5 77:.5 76:1 74:2 71:1 67:1.5 69:.5 71:1 72:1.5 71:.5 69:1 68:1.5 66:.5 68:1 69:6 79:3 79:1.5 77:.5 76:1 74:2 71:1 67:1.5 69:.5 71:1 72:2 69:1 69:1.5 68:.5 69:1 71:2 68:1 64:3 79:3 79:1.5 77:.5 76:1 74:2 71:1 67:1.5 69:.5 71:1 72:1.5 71:.5 69:1 68:1.5 66:.5 68:1 69:6 0:1",
  },
  {
    id: "letter",
    name: "호랑가시나무와 담쟁이",
    mood: "The Holly and the Ivy · Traditional",
    bpm: 92,
    root: 65,
    score:
      "65:1 65:.5 65:.5 65:1 74:1 72:1 69:1.5 65:.5 65:.5 65:.5 65:1 74:1 72:2 72:.5 70:.5 69:.5 67:.5 65:1 69:.5 69:.5 62:.5 62:.5 60:1 65:.5 67:.5 69:.5 70:.5 69:1 67:1 65:2 65:1 65:.5 65:.5 65:1 74:1 72:1 69:1.5 65:.5 65:.5 65:.5 65:1 74:1 72:2 72:.5 70:.5 69:.5 67:.5 65:1 69:1 62:.5 62:.5 60:1 65:.5 67:.5 69:.5 70:.5 69:1 67:1 65:3 0:1",
  },
].map((t) => ({ ...t, notes: notes(t.score) }));
export type TrackId = "snow" | "starlight" | "waltz" | "lullaby" | "letter";
export const villageById = (id: VillageId) =>
  VILLAGES.find((v) => v.id === id)!;
