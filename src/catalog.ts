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
    name: "별똥별의 밤",
    description: "소원을 품고 스쳐가는 작은 별들",
    symbol: "star",
  },
  {
    id: "wishes",
    name: "소원을 띄우는 밤",
    description: "따뜻한 금빛이 조용히 떠오르는 시간",
    symbol: "lantern",
  },
] as const;
export type NightId = (typeof NIGHTS)[number]["id"];
export const TRACKS = [
  {
    id: "snow",
    name: "눈 내리는 작은 마을",
    mood: "포근한 오르골",
    bpm: 72,
    root: 60,
    notes: [
      72, 76, 79, 76, 74, 77, 81, 77, 76, 79, 84, 79, 74, 77, 79, 77, 72, 76,
      79, 83, 81, 79, 77, 76, 74, 77, 76, 74, 72, 67, 72, 0,
    ],
  },
  {
    id: "starlight",
    name: "별빛 산책",
    mood: "잔잔한 별빛",
    bpm: 68,
    root: 57,
    notes: [
      69, 72, 76, 79, 76, 72, 71, 67, 69, 72, 76, 81, 79, 76, 72, 0, 71, 74, 77,
      81, 77, 74, 72, 69, 67, 71, 74, 76, 72, 71, 69, 0,
    ],
  },
  {
    id: "waltz",
    name: "선물 공방의 왈츠",
    mood: "통통 튀는 설렘",
    bpm: 96,
    root: 65,
    notes: [
      77, 81, 84, 81, 79, 77, 76, 79, 84, 79, 77, 76, 74, 77, 81, 84, 81, 77,
      76, 79, 82, 86, 84, 79, 77, 81, 84, 89, 84, 81, 77, 0,
    ],
  },
  {
    id: "lullaby",
    name: "겨울 숲 자장가",
    mood: "느리고 편안하게",
    bpm: 60,
    root: 55,
    notes: [
      67, 71, 74, 71, 69, 67, 66, 62, 64, 67, 71, 74, 71, 67, 66, 0, 67, 71, 74,
      78, 76, 74, 71, 69, 67, 66, 64, 62, 59, 62, 67, 0,
    ],
  },
  {
    id: "letter",
    name: "크리스마스 편지",
    mood: "다정한 겨울 인사",
    bpm: 80,
    root: 62,
    notes: [
      74, 78, 81, 86, 81, 78, 76, 73, 74, 78, 81, 83, 81, 78, 76, 0, 78, 81, 85,
      88, 86, 81, 78, 76, 74, 76, 78, 81, 78, 76, 74, 0,
    ],
  },
] as const;
export type TrackId = (typeof TRACKS)[number]["id"];
export const villageById = (id: VillageId) =>
  VILLAGES.find((v) => v.id === id)!;
