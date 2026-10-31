import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
const material = (color: number, metalness = 0.3, roughness = 0.45) =>
  new T.MeshStandardMaterial({ color, metalness, roughness });
export type TrainModel = {
  group: T.Group;
  wheels: T.Group[];
  materials: T.Material[];
};
export function buildVintageCar(engine: boolean): TrainModel {
  const group = new T.Group(),
    body = new T.Group();
  group.add(body);
  const brass = material(0xc49343, 0.8, 0.27),
    green = material(0x144336, 0.5, 0.34),
    red = material(0x8e211a, 0.4, 0.4),
    black = material(0x201b16, 0.45, 0.5),
    snow = material(0xf8eddb, 0, 0.95),
    coal = material(0x121412, 0, 0.98);
  const glass = new T.MeshStandardMaterial({
    color: 0xffd181,
    emissive: 0xff9f37,
    emissiveIntensity: 0.8,
    roughness: 0.3,
  });
  const mats = [brass, green, red, black, snow, coal, glass];
  function part(
    g: T.BufferGeometry,
    m: T.Material,
    p: T.Object3D,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    p.add(o);
    return o;
  }
  function box(
    w: number,
    h: number,
    d: number,
    m: T.Material,
    x = 0,
    y = 0,
    z = 0,
    r = 0.003,
  ) {
    return part(new RoundedBoxGeometry(w, h, d, 2, r), m, body, x, y, z);
  }
  function rod(
    a: T.Vector3,
    b: T.Vector3,
    r = 0.002,
    m: T.Material = brass,
    parent: T.Object3D = body,
  ) {
    const o = part(new T.CylinderGeometry(r, r, a.distanceTo(b), 7), m, parent);
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(
      new T.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
    return o;
  }
  function circle(
    r: number,
    t: number,
    m: T.Material,
    x: number,
    y: number,
    z: number,
    parent: T.Object3D = body,
  ) {
    const o = part(new T.TorusGeometry(r, t, 6, 24), m, parent, x, y, z);
    return o;
  }
  function roof(length: number, width: number, y: number, x = 0) {
    const shape = new T.Shape();
    shape.moveTo(-width / 2, 0);
    shape.quadraticCurveTo(0, 0.045, width / 2, 0);
    shape.lineTo(width / 2, -0.01);
    shape.quadraticCurveTo(0, 0.032, -width / 2, -0.01);
    shape.closePath();
    const g = new T.ExtrudeGeometry(shape, {
        depth: length,
        bevelEnabled: false,
        steps: 1,
        curveSegments: 12,
      }),
      o = part(g, green, body, x - length / 2, y);
    o.rotation.y = Math.PI / 2;
    for (let i = 0; i < 22; i++) {
      const a = i * 2.3999,
        xx = x + (i / 22 - 0.5) * length * 0.89,
        zz = Math.sin(a) * width * 0.33;
      const lump = part(
        new T.SphereGeometry(1, 7, 5),
        snow,
        body,
        xx,
        y + 0.018 + 0.02 * (1 - Math.abs(zz) / (width / 2)),
        zz,
      );
      lump.scale.set(0.016, 0.006 + (i % 3) * 0.002, 0.013);
    }
  }
  const length = engine ? 0.32 : 0.28;
  box(length, 0.021, 0.126, black, 0, 0.052);
  box(length, 0.006, 0.139, brass, 0, 0.064);
  if (engine) {
    const boiler = part(
      new T.CylinderGeometry(0.049, 0.049, 0.183, 24),
      green,
      body,
      0.035,
      0.116,
    );
    boiler.rotation.z = Math.PI / 2;
    for (const x of [-0.045, 0.01, 0.068, 0.122]) {
      const band = circle(0.05, 0.0023, brass, x, 0.116, 0);
      band.rotation.y = Math.PI / 2;
    }
    const face = part(
      new T.CylinderGeometry(0.05, 0.05, 0.014, 24),
      black,
      body,
      0.132,
      0.116,
    );
    face.rotation.z = Math.PI / 2;
    for (const r of [0.043, 0.028]) {
      const ring = circle(r, 0.002, brass, 0.141, 0.116, 0);
      ring.rotation.y = Math.PI / 2;
    }
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      part(
        new T.SphereGeometry(0.0025, 5, 4),
        brass,
        body,
        0.142,
        0.116 + Math.cos(a) * 0.043,
        Math.sin(a) * 0.043,
      );
    }
    box(0.105, 0.045, 0.124, green, -0.101, 0.093);
    box(0.105, 0.008, 0.132, red, -0.101, 0.074);
    for (const z of [-0.064, 0.064]) {
      box(0.085, 0.065, 0.003, red, -0.104, 0.146, z);
      box(0.063, 0.045, 0.004, brass, -0.104, 0.155, z * 1.01);
      box(0.054, 0.038, 0.005, glass, -0.104, 0.155, z * 1.03);
      for (const x of [-0.13, -0.077])
        box(0.003, 0.044, 0.007, brass, x, 0.155, z * 1.04);
      box(0.085, 0.002, 0.004, brass, -0.104, 0.105, z * 1.03);
    }
    roof(0.125, 0.153, 0.19, -0.104);
    for (const x of [0.015, 0.065]) {
      part(
        new T.CylinderGeometry(0.014, 0.018, 0.025, 12),
        brass,
        body,
        x,
        0.173,
      );
      part(new T.SphereGeometry(0.014, 12, 8), brass, body, x, 0.187);
    }
    part(
      new T.CylinderGeometry(0.017, 0.013, 0.053, 16),
      black,
      body,
      0.106,
      0.185,
    );
    part(
      new T.CylinderGeometry(0.026, 0.017, 0.023, 16),
      brass,
      body,
      0.106,
      0.22,
    );
    circle(0.026, 0.002, black, 0.106, 0.232, 0).rotation.x = Math.PI / 2;
    const head = part(
      new T.CylinderGeometry(0.019, 0.021, 0.018, 16),
      glass,
      body,
      0.15,
      0.165,
    );
    head.rotation.z = Math.PI / 2;
    const bezel = circle(0.021, 0.003, brass, 0.16, 0.165, 0);
    bezel.rotation.y = Math.PI / 2;
    for (const z of [-0.057, 0.057]) {
      rod(new T.Vector3(-0.035, 0.15, z), new T.Vector3(0.12, 0.15, z));
      for (const x of [-0.03, 0.03, 0.09])
        rod(new T.Vector3(x, 0.142, z), new T.Vector3(x, 0.156, z), 0.0017);
    }
    // Sloping cowcatcher grille, pilot beam and buffers.
    for (let i = 0; i < 9; i++) {
      const z = (i / 8 - 0.5) * 0.15;
      rod(
        new T.Vector3(0.184, 0.025, z),
        new T.Vector3(0.145, 0.071, z * 0.8),
        0.0023,
      );
    }
    box(0.014, 0.016, 0.16, red, 0.174, 0.027);
    box(0.022, 0.012, 0.1, brass, -0.145, 0.055);
    for (let i = 0; i < 9; i++)
      part(
        new T.DodecahedronGeometry(0.007 + (i % 3) * 0.002),
        coal,
        body,
        -0.14 + (i % 3) * 0.008,
        0.199,
        (((i / 3) | 0) - 1) * 0.013,
      );
  } else {
    box(0.253, 0.078, 0.124, red, 0, 0.113);
    box(0.256, 0.005, 0.132, brass, 0, 0.076);
    for (const z of [-0.063, 0.063]) {
      for (const y of [0.087, 0.157])
        box(0.253, 0.0025, 0.004, brass, 0, y, z * 1.03);
      for (let i = 0; i < 5; i++) {
        const x = (i - 2) * 0.046;
        box(0.038, 0.05, 0.004, brass, x, 0.129, z);
        box(0.031, 0.041, 0.005, glass, x, 0.129, z * 1.04);
        box(0.002, 0.043, 0.006, brass, x, 0.129, z * 1.08);
      }
      for (let i = 0; i < 5; i++)
        box(0.022, 0.014, 0.003, brass, (i - 2) * 0.045, 0.091, z * 1.04);
    }
    roof(0.284, 0.153, 0.169);
    for (const x of [-0.132, 0.132]) {
      box(0.006, 0.07, 0.12, green, x, 0.12);
      box(0.008, 0.045, 0.05, glass, x, 0.127);
      for (const z of [-0.055, 0.055])
        rod(new T.Vector3(x, 0.07, z), new T.Vector3(x, 0.16, z), 0.002);
    }
    for (let i = 0; i < 7; i++) {
      const x = (i - 3) * 0.023,
        z = Math.sin(i) * 0.012;
      part(new T.SphereGeometry(0.01, 7, 5), green, body, x, 0.206, z);
      if (i % 2 === 0)
        part(new T.SphereGeometry(0.005, 7, 5), red, body, x, 0.214, z);
    }
  }
  // Merge static details by material, retaining real wheel assemblies for rotation.
  function consolidate(parent: T.Group) {
    parent.updateMatrixWorld(true);
    const buckets = new Map<T.Material, T.BufferGeometry[]>();
    for (const child of [...parent.children])
      if (child instanceof T.Mesh) {
        let g = child.geometry.index
          ? child.geometry.toNonIndexed()
          : child.geometry.clone();
        g.applyMatrix4(child.matrix);
        g.deleteAttribute("uv");
        const list = buckets.get(child.material as T.Material) ?? [];
        list.push(g);
        buckets.set(child.material as T.Material, list);
        parent.remove(child);
        child.geometry.dispose();
      }
    buckets.forEach((gs, m) => {
      const merged = mergeGeometries(gs, false);
      if (merged) parent.add(new T.Mesh(merged, m));
      gs.forEach((g) => g.dispose());
    });
  }
  consolidate(body);
  const wheels: T.Group[] = [];
  const axles = engine ? [-0.112, -0.035, 0.075] : [-0.09, 0.09];
  for (const x of axles)
    for (const z of [-0.073, 0.073]) {
      const wheel = new T.Group();
      wheel.position.set(x, 0.041, z);
      group.add(wheel);
      wheels.push(wheel);
      const tire = part(
        new T.CylinderGeometry(0.035, 0.035, 0.012, 20),
        black,
        wheel,
      );
      tire.rotation.x = Math.PI / 2;
      const rim = circle(
        0.027,
        0.0035,
        brass,
        0,
        0,
        z > 0 ? 0.008 : -0.008,
        wheel,
      );
      rim.rotation.z = 0;
      for (let n = 0; n < 8; n++) {
        const a = (n * Math.PI) / 4;
        rod(
          new T.Vector3(0, 0, z > 0 ? 0.009 : -0.009),
          new T.Vector3(
            Math.cos(a) * 0.026,
            Math.sin(a) * 0.026,
            z > 0 ? 0.009 : -0.009,
          ),
          0.0018,
          brass,
          wheel,
        );
      }
      part(
        new T.SphereGeometry(0.006, 8, 6),
        red,
        wheel,
        0,
        0,
        z > 0 ? 0.011 : -0.011,
      );
      consolidate(wheel);
    }
  for (const z of [-0.084, 0.084])
    rod(
      new T.Vector3(axles[0]!, 0.042, z),
      new T.Vector3(axles[axles.length - 1]!, 0.042, z),
      0.003,
      brass,
      body,
    );
  return { group, wheels, materials: mats };
}
