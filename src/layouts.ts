import type { VillageId } from "./catalog.ts";
export type Asset =
  | "base"
  | "cottage"
  | "church"
  | "tree"
  | "santa"
  | "snowman"
  | "reindeer"
  | "train"
  | "pine"
  | "workshop"
  | "palace"
  | "gingerbread";
export type SceneObject = {
  asset: Asset;
  x: number;
  y: number;
  width: number;
  depth: number;
};
const object = (
  asset: Asset,
  x: number,
  y: number,
  width: number,
  depth: number,
): SceneObject => ({ asset, x, y, width, depth });
const base = object("base", 0, 528, 1000, 1);
const pine = (x: number, y: number, w: number, z: number) =>
  object("pine", x, y, w, z);
const tree = object("tree", 250, 168, 480, 700);
export function villageObjects(id: VillageId): SceneObject[] {
  const layouts: Record<VillageId, SceneObject[]> = {
    cozy: [
      object("church", 530, 120, 330, 578),
      object("cottage", 100, 300, 340, 640),
      object("cottage", 10, 432, 260, 685),
      object("cottage", 700, 420, 300, 712),
      pine(70, 348, 180, 584),
      pine(0, 540, 210, 816),
      pine(810, 564, 190, 814),
      tree,
      object("santa", 470, 480, 190, 735),
      object("reindeer", 660, 444, 160, 730),
      object("snowman", 770, 564, 180, 840),
      object("train", 150, 606, 560, 880),
    ],
    forest: [
      pine(50, 255, 300, 570),
      pine(670, 180, 330, 570),
      pine(110, 450, 220, 740),
      pine(745, 460, 230, 760),
      pine(0, 590, 230, 830),
      pine(800, 610, 200, 850),
      object("tree", 250, 220, 480, 710),
      object("cottage", 550, 370, 260, 660),
      object("reindeer", 300, 545, 185, 805),
      object("snowman", 580, 590, 200, 850),
    ],
    chapel: [
      object("church", 300, 75, 440, 650),
      object("cottage", 40, 350, 300, 710),
      object("cottage", 685, 360, 300, 720),
      pine(70, 560, 200, 820),
      pine(795, 560, 200, 830),
      object("tree", 390, 430, 270, 790),
      object("snowman", 240, 590, 190, 850),
      object("reindeer", 610, 580, 165, 850),
    ],
    workshop: [
      object("workshop", 215, 190, 570, 710),
      pine(0, 360, 260, 650),
      pine(740, 330, 260, 650),
      object("tree", 20, 460, 330, 800),
      object("santa", 460, 545, 240, 850),
      object("reindeer", 730, 550, 180, 850),
      object("train", 120, 640, 570, 890),
    ],
    palace: [
      object("palace", 160, 130, 680, 710),
      pine(10, 430, 240, 750),
      pine(780, 430, 220, 750),
      object("tree", 35, 500, 300, 810),
      object("snowman", 620, 590, 220, 850),
      object("reindeer", 350, 620, 180, 860),
    ],
    gingerbread: [
      object("gingerbread", 245, 185, 540, 710),
      object("gingerbread", 0, 420, 310, 770),
      object("gingerbread", 710, 420, 280, 780),
      object("tree", 355, 450, 300, 820),
      object("santa", 230, 605, 190, 870),
      object("snowman", 650, 610, 190, 870),
      pine(30, 600, 190, 850),
    ],
  };
  return [base, ...layouts[id]].sort((a, b) => a.depth - b.depth);
}
