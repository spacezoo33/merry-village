import * as T from "three";
import firUrl from "./assets/fir-sprig.png";
/** Crossed needle cards are distributed in real 3D space, not a rotating tree photograph. */
export function addFirBranches(tree: T.Group) {
  let resolve!: () => void, reject!: (error: unknown) => void;
  const ready = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  const texture = new T.TextureLoader().load(
    firUrl,
    () => resolve(),
    undefined,
    reject,
  );
  texture.colorSpace = T.SRGBColorSpace;
  const material = new T.MeshStandardMaterial({
    map: texture,
    alphaTest: 0.42,
    side: T.DoubleSide,
    roughness: 0.92,
    color: 0x718c59,
  });
  const count = 520,
    foliage = new T.InstancedMesh(
      new T.PlaneGeometry(1, 1),
      material,
      count * 2,
    );
  const patches = new T.InstancedMesh(
    new T.SphereGeometry(1, 7, 5),
    new T.MeshStandardMaterial({ color: 0xfff4dd, roughness: 1 }),
    160,
  );
  const dummy = new T.Object3D();
  let snow = 0;
  const noise = (n: number) => {
    const v = Math.sin(n * 127.13 + 71.9) * 43758.5453;
    return v - Math.floor(v);
  };
  for (let i = 0; i < count; i++) {
    const y = 0.09 + noise(i + 7) * 1.055,
      angle = i * 2.39996323;
    const envelope = 0.4 * (1 - y / 1.32) ** 0.78;
    const radius = envelope * (0.6 + 0.36 * noise(i + 3));
    const width = 0.15 * (1 - y / 1.35) + 0.028,
      height = 0.24 * (1 - y / 1.5) + 0.035;
    for (let cross = 0; cross < 2; cross++) {
      dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      dummy.rotation.order = "YXZ";
      dummy.rotation.set(
        0.55 + (noise(i + 23) - 0.5) * 0.5,
        -angle + Math.PI / 2 + (cross * Math.PI) / 2,
        (noise(i + 91) - 0.5) * 0.5,
      );
      dummy.scale.set(width, height, 1);
      dummy.updateMatrix();
      foliage.setMatrixAt(i * 2 + cross, dummy.matrix);
    }
    if (snow < 160 && i % 4 === 0) {
      dummy.position.set(
        Math.cos(angle) * radius,
        y + 0.05,
        Math.sin(angle) * radius,
      );
      dummy.rotation.set(0, angle, 0);
      dummy.scale.set(
        0.016 + noise(i) * 0.03,
        0.006 + noise(i + 9) * 0.007,
        0.014 + noise(i + 5) * 0.022,
      );
      dummy.updateMatrix();
      patches.setMatrixAt(snow++, dummy.matrix);
    }
  }
  patches.count = snow;
  tree.add(foliage, patches);
  return { texture, ready };
}
