import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import {
  consist,
  TRAIN_SECONDS,
  TREE_SECONDS,
  RADIUS,
  TUNNEL_Z,
  TRACK_START,
} from "./kinematics";
export type ActorSettings = {
  motion: boolean;
  lights: boolean;
  gold: boolean;
  hidden: boolean;
};
const bronze = new T.MeshStandardMaterial({
  color: 0xd4a35a,
  metalness: 0.78,
  roughness: 0.33,
});
const dark = new T.MeshStandardMaterial({
  color: 0x181513,
  metalness: 0.45,
  roughness: 0.5,
});
const red = new T.MeshStandardMaterial({
  color: 0x9b2119,
  metalness: 0.25,
  roughness: 0.42,
});
const green = new T.MeshStandardMaterial({ color: 0x123f2d, roughness: 0.65 });
const snow = new T.MeshStandardMaterial({ color: 0xfff6e6, roughness: 0.95 });
const shared = [bronze, dark, red, green, snow];
function mesh(
  g: T.BufferGeometry,
  m: T.Material,
  parent: T.Object3D,
  x = 0,
  y = 0,
  z = 0,
) {
  const o = new T.Mesh(g, m);
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}
function box(
  p: T.Object3D,
  w: number,
  h: number,
  d: number,
  m: T.Material,
  x = 0,
  y = 0,
  z = 0,
  r = 0.012,
) {
  return mesh(new RoundedBoxGeometry(w, h, d, 2, r), m, p, x, y, z);
}
function rod(
  p: T.Object3D,
  a: T.Vector3,
  b: T.Vector3,
  r: number,
  m: T.Material,
) {
  const o = mesh(new T.CylinderGeometry(r, r, a.distanceTo(b), 8), m, p);
  o.position.copy(a).add(b).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    b.clone().sub(a).normalize(),
  );
  return o;
}
export class Actors {
  private renderer: T.WebGLRenderer;
  private world = new T.Scene();
  private camera = new T.OrthographicCamera(-1.55, 1.55, 1.83, -1.27, 0.01, 40);
  private tree = new T.Group();
  private cars: T.Group[] = [];
  private links: T.Mesh[] = [];
  private bulbs: { material: T.MeshStandardMaterial; phase: number }[] = [];
  private raf = 0;
  private previous = 0;
  private elapsed = 0;
  private lightTime = 0;
  private lastDraw = 0;
  private settings: ActorSettings = {
    motion: true,
    lights: true,
    gold: false,
    hidden: false,
  };
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private observer: ResizeObserver;
  private onReduce = () => this.schedule();
  private lost = false;
  private textures: T.Texture[] = [];
  private host: HTMLElement;
  constructor(host: HTMLElement) {
    this.host = host;
    this.renderer = new T.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.setClearColor(0, 0);
    this.renderer.localClippingEnabled = true;
    this.renderer.toneMapping = T.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    host.append(this.renderer.domElement);
    this.camera.position.set(0, 10, 17);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.world.add(new T.HemisphereLight(0xffedcf, 0x564938, 2.8));
    const key = new T.DirectionalLight(0xffd49c, 4);
    key.position.set(-3, 7, 6);
    this.world.add(key);
    const rim = new T.DirectionalLight(0x9bbdff, 1.2);
    rim.position.set(2, 4, -3);
    this.world.add(rim);
    this.buildTree();
    this.buildTrain();
    this.buildTrack();
    this.observer = new ResizeObserver(() => {
      const r = host.getBoundingClientRect();
      this.renderer.setSize(r.width, r.height, false);
      this.draw();
    });
    this.observer.observe(host);
    this.reduced.addEventListener("change", this.onReduce);
    this.renderer.domElement.addEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.renderer.domElement.addEventListener(
      "webglcontextrestored",
      this.contextRestored,
    );
    this.draw();
    this.schedule();
  }
  private contextLost = (e: Event) => {
    e.preventDefault();
    this.lost = true;
    cancelAnimationFrame(this.raf);
    this.host.dataset.unavailable = "그래픽을 복구하고 있어요";
  };
  private contextRestored = () => {
    this.lost = false;
    delete this.host.dataset.unavailable;
    this.schedule();
  };
  private buildTree() {
    const tree = this.tree;
    tree.position.set(0, 0.145, 0);
    this.world.add(tree);
    mesh(new T.CylinderGeometry(0.045, 0.06, 0.18, 12), bronze, tree, 0, 0.04);
    // Hundreds of individually modelled sculpted evergreen sprays: true 3D on every side.
    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = 128;
    textureCanvas.height = 128;
    const tc = textureCanvas.getContext("2d")!;
    tc.fillStyle = "#376141";
    tc.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 230; i++) {
      const x = (i * 73) % 128,
        y = (i * 43) % 128;
      tc.strokeStyle = i % 3 ? "#24462b" : "#63835c";
      tc.lineWidth = 1;
      tc.beginPath();
      tc.moveTo(x, y);
      tc.lineTo(x + 5 + (i % 5), y - 9);
      tc.stroke();
    }
    const needles = new T.CanvasTexture(textureCanvas);
    this.textures.push(needles);
    needles.colorSpace = T.SRGBColorSpace;
    const pineMaterial = new T.MeshStandardMaterial({
      map: needles,
      roughness: 0.9,
      color: 0xa7bd8f,
    });
    const foliage = new T.InstancedMesh(
      new T.SphereGeometry(1, 10, 8),
      pineMaterial,
      420,
    );
    const caps = new T.InstancedMesh(new T.SphereGeometry(1, 8, 6), snow, 140);
    const dummy = new T.Object3D();
    let n = 0,
      s = 0;
    for (let tier = 0; tier < 10; tier++) {
      const y = 0.12 + tier * 0.105,
        radius = 0.36 * (1 - tier / 11);
      for (let branch = 0; branch < 14; branch++) {
        const a = (branch * Math.PI * 2) / 14 + tier * 0.38;
        for (let spray = 0; spray < 3; spray++) {
          const f = 0.45 + spray * 0.23;
          dummy.position.set(
            Math.cos(a) * radius * f,
            y + 0.025 * (2 - spray),
            Math.sin(a) * radius * f,
          );
          dummy.rotation.set(0, -a, 0.05);
          dummy.scale.set(
            radius * 0.43,
            0.031 + (0.006 * (10 - tier)) / 10,
            0.036,
          );
          dummy.updateMatrix();
          foliage.setMatrixAt(n++, dummy.matrix);
          if (spray === 2) {
            dummy.position.y += 0.037;
            dummy.scale.set(radius * 0.4, 0.021, 0.04);
            dummy.updateMatrix();
            caps.setMatrixAt(s++, dummy.matrix);
          }
        }
      }
    }
    tree.add(foliage, caps);
    const ball = new T.SphereGeometry(0.024, 12, 10);
    const colors = [0xc92116, 0xd9aa4e, 0xb63225];
    for (let i = 0; i < 65; i++) {
      const y = 0.14 + (i / 65) * 0.96,
        a = i * 2.3999,
        r = 0.448 * (1 - y / 1.33);
      mesh(
        ball,
        new T.MeshStandardMaterial({
          color: colors[i % 3],
          metalness: 0.72,
          roughness: 0.28,
        }),
        tree,
        Math.cos(a) * r,
        y,
        Math.sin(a) * r,
      );
    }
    // Separate ribbon bows, not a painted texture: remain attached during Y rotation.
    for (let i = 0; i < 14; i++) {
      const y = 0.24 + (i % 5) * 0.16,
        a = i * 2.4,
        r = 0.46 * (1 - y / 1.33),
        bow = new T.Group();
      bow.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      bow.rotation.y = -a + Math.PI / 2;
      for (const sign of [-1, 1]) {
        const loop = mesh(
          new T.TorusGeometry(0.025, 0.009, 6, 12),
          red,
          bow,
          sign * 0.022,
          0,
          0,
        );
        loop.scale.set(1, 0.65, 1);
        loop.rotation.z = sign * 0.4;
        box(bow, 0.014, 0.045, 0.008, red, sign * 0.012, -0.025, 0, 0.003);
      }
      mesh(new T.SphereGeometry(0.012, 8, 6), bronze, bow);
      tree.add(bow);
    }
    const ribbonPoints: T.Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const y = 0.12 + i / 160,
        a = (i / 160) * Math.PI * 10,
        r = 0.452 * (1 - y / 1.33);
      ribbonPoints.push(new T.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
    }
    mesh(
      new T.TubeGeometry(
        new T.CatmullRomCurve3(ribbonPoints),
        160,
        0.005,
        5,
        false,
      ),
      bronze,
      tree,
    );
    for (let i = 0; i < 75; i++) {
      const y = 0.14 + (i / 75) * 0.98,
        a = (i / 75) * Math.PI * 10,
        r = 0.456 * (1 - y / 1.33);
      const m = new T.MeshStandardMaterial({
        color: [0xffd27b, 0xa62d1e, 0x5b9c44][i % 3],
        emissive: [0xffb536, 0xe32310, 0x4aaa3b][i % 3],
        emissiveIntensity: 1,
        roughness: 0.3,
      });
      mesh(
        new T.SphereGeometry(0.015, 8, 6),
        m,
        tree,
        Math.cos(a) * r,
        y,
        Math.sin(a) * r,
      );
      this.bulbs.push({ material: m, phase: i * 2.37 });
    }
    const shape = new T.Shape();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 5,
        r = i % 2 ? 0.041 : 0.09;
      const x = Math.cos(a) * r,
        y = Math.sin(a) * r;
      i ? shape.lineTo(x, y) : shape.moveTo(x, y);
    }
    shape.closePath();
    const star = mesh(
      new T.ExtrudeGeometry(shape, {
        depth: 0.025,
        bevelEnabled: true,
        bevelSize: 0.007,
        bevelThickness: 0.006,
        bevelSegments: 2,
        steps: 1,
      }),
      new T.MeshStandardMaterial({
        color: 0xffd575,
        emissive: 0xeaa124,
        emissiveIntensity: 0.6,
        metalness: 0.65,
        roughness: 0.25,
      }),
      tree,
      0,
      1.23,
      0,
    );
    star.position.z = -0.013;
    this.bulbs.push({
      material: star.material as T.MeshStandardMaterial,
      phase: 0,
    });
  }
  private buildTrain() {
    const warm = new T.MeshStandardMaterial({
      color: 0xffde89,
      emissive: 0xffae38,
      emissiveIntensity: 0.65,
      roughness: 0.4,
    });
    for (let i = 0; i < 3; i++) {
      const car = new T.Group();
      this.cars.push(car);
      this.world.add(car);
      box(car, i === 0 ? 0.32 : 0.28, 0.025, 0.12, dark, 0, 0.045);
      if (i === 0) {
        const boiler = mesh(
          new T.CylinderGeometry(0.052, 0.052, 0.19, 20),
          green,
          car,
          0.04,
          0.105,
        );
        boiler.rotation.z = Math.PI / 2;
        for (const x of [-0.02, 0.055, 0.12]) {
          const band = mesh(
            new T.TorusGeometry(0.053, 0.003, 6, 20),
            bronze,
            car,
            x,
            0.105,
          );
          band.rotation.y = Math.PI / 2;
        }
        box(car, 0.1, 0.13, 0.125, red, -0.09, 0.125);
        box(car, 0.13, 0.018, 0.15, dark, -0.09, 0.2);
        for (const z of [-0.064, 0.064])
          box(car, 0.045, 0.052, 0.003, warm, -0.09, 0.145, z, 0.003);
        mesh(
          new T.CylinderGeometry(0.016, 0.023, 0.07, 12),
          dark,
          car,
          0.095,
          0.177,
        );
        mesh(
          new T.CylinderGeometry(0.026, 0.026, 0.012, 12),
          bronze,
          car,
          0.095,
          0.215,
        );
        const head = mesh(
          new T.CylinderGeometry(0.032, 0.032, 0.014, 16),
          warm,
          car,
          0.145,
          0.105,
        );
        head.rotation.z = Math.PI / 2;
        box(car, 0.025, 0.03, 0.16, red, 0.162, 0.045);
      } else {
        box(car, 0.25, 0.11, 0.12, red, 0, 0.11);
        box(car, 0.28, 0.025, 0.145, green, 0, 0.18);
        box(car, 0.25, 0.014, 0.13, snow, 0, 0.199);
        for (const x of [-0.075, 0, 0.075])
          for (const z of [-0.061, 0.061]) {
            box(car, 0.049, 0.052, 0.004, bronze, x, 0.115, z, 0.002);
            box(car, 0.039, 0.044, 0.005, warm, x, 0.115, z * 1.01, 0.002);
          }
      }
      for (const x of [-0.1, 0.085])
        for (const z of [-0.07, 0.07]) {
          const w = mesh(
            new T.CylinderGeometry(0.033, 0.033, 0.014, 16),
            dark,
            car,
            x,
            0.032,
            z,
          );
          w.rotation.x = Math.PI / 2;
          const rim = mesh(
            new T.TorusGeometry(0.027, 0.003, 5, 16),
            bronze,
            car,
            x,
            0.032,
            z * 1.12,
          );
          rim.rotation.y = 0;
        }
      for (const z of [-0.079, 0.079])
        rod(
          car,
          new T.Vector3(-0.1, 0.032, z),
          new T.Vector3(0.085, 0.032, z),
          0.004,
          bronze,
        );
    }
    for (let i = 0; i < 2; i++)
      this.links.push(
        mesh(new T.CylinderGeometry(0.006, 0.006, 1, 8), bronze, this.world),
      );
    // Rear half is inside the opaque raised village/tunnel. Clip in world space,
    // progressively across each vehicle (not whole-car visibility popping).
    const tunnel = new T.Plane(new T.Vector3(0, 0, 1), -TUNNEL_Z);
    for (const car of [...this.cars, ...this.links])
      car.traverse((o) => {
        if (o instanceof T.Mesh) {
          const original = o.material as T.MeshStandardMaterial;
          const m = original.clone();
          m.clippingPlanes = [tunnel];
          o.material = m;
        }
      });
  }
  private buildTrack() {
    for (const r of [RADIUS - 0.066, RADIUS + 0.066]) {
      const points = Array.from(
        { length: 97 },
        (_, i) =>
          new T.Vector3(
            r * Math.cos(TRACK_START + (i / 96) * (Math.PI - 2 * TRACK_START)),
            0.008,
            r * Math.sin(TRACK_START + (i / 96) * (Math.PI - 2 * TRACK_START)),
          ),
      );
      mesh(
        new T.TubeGeometry(new T.CatmullRomCurve3(points), 96, 0.006, 6, false),
        bronze,
        this.world,
      );
    }
    for (let i = 0; i <= 64; i++) {
      const a = TRACK_START + (i / 64) * (Math.PI - 2 * TRACK_START),
        r = RADIUS;
      const sleeper = box(
        this.world,
        0.014,
        0.007,
        0.18,
        dark,
        r * Math.cos(a),
        0,
        r * Math.sin(a),
        0.002,
      );
      sleeper.rotation.y = -a - Math.PI / 2;
    }
  }
  update(settings: ActorSettings) {
    this.settings = settings;
    this.previous = 0;
    this.draw();
    this.schedule();
  }
  private schedule() {
    cancelAnimationFrame(this.raf);
    this.previous = 0;
    if (
      !this.settings.hidden &&
      !this.lost &&
      (this.settings.motion || this.settings.lights) &&
      !this.reduced.matches
    )
      this.raf = requestAnimationFrame(this.frame);
  }
  private frame = (now: number) => {
    if (!this.previous) this.previous = now;
    const dt = Math.max(0, (now - this.previous) / 1000);
    this.previous = now;
    if (this.settings.motion) this.elapsed += dt;
    if (this.settings.lights) this.lightTime += dt;
    if (now - this.lastDraw > 32) {
      this.draw();
      this.lastDraw = now;
    }
    this.raf = requestAnimationFrame(this.frame);
  };
  private draw() {
    if (this.lost) return;
    this.tree.rotation.y = (this.elapsed / TREE_SECONDS) * Math.PI * 2 + 0.17;
    const poses = consist(
      0.85 + (Math.max(0, this.elapsed - 0.65) / TRAIN_SECONDS) * Math.PI * 2,
    );
    poses.forEach((p, i) => {
      this.cars[i]!.position.set(p.x, 0.014, p.z);
      this.cars[i]!.rotation.y = p.yaw;
    });
    this.links.forEach((link, i) => {
      const a = poses[i]!.rear,
        b = poses[i + 1]!.front;
      const av = new T.Vector3(a.x, 0.063, a.z),
        bv = new T.Vector3(b.x, 0.063, b.z);
      link.position.copy(av).add(bv).multiplyScalar(0.5);
      link.scale.y = av.distanceTo(bv);
      link.quaternion.setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        bv.sub(av).normalize(),
      );
    });
    for (const b of this.bulbs)
      b.material.emissiveIntensity = this.settings.lights
        ? (this.settings.gold ? 2.2 : 1.1) +
          Math.sin(this.lightTime * 0.8 + b.phase) * 0.45
        : 0;
    this.renderer.render(this.world, this.camera);
    this.host.dataset.elapsed = this.elapsed.toFixed(3);
    this.host.dataset.treeAngle = this.tree.rotation.y.toFixed(5);
    this.host.dataset.trainAngle = poses[0]!.angle.toFixed(5);
    this.host.dataset.reduced = String(this.reduced.matches);
  }
  snapshot(): HTMLCanvasElement {
    this.draw();
    const copy = document.createElement("canvas");
    copy.width = this.renderer.domElement.width;
    copy.height = this.renderer.domElement.height;
    copy.getContext("2d")!.drawImage(this.renderer.domElement, 0, 0);
    return copy;
  }
  destroy() {
    cancelAnimationFrame(this.raf);
    this.observer.disconnect();
    this.reduced.removeEventListener("change", this.onReduce);
    this.renderer.domElement.removeEventListener(
      "webglcontextlost",
      this.contextLost,
    );
    this.renderer.domElement.removeEventListener(
      "webglcontextrestored",
      this.contextRestored,
    );
    const geometries = new Set<T.BufferGeometry>(),
      materials = new Set<T.Material>();
    this.world.traverse((o) => {
      if (o instanceof T.Mesh) {
        geometries.add(o.geometry);
        materials.add(o.material);
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => {
      if (!shared.includes(m as T.MeshStandardMaterial)) m.dispose();
    });
    this.textures.forEach((t) => t.dispose());
    this.renderer.dispose();
    this.host.replaceChildren();
  }
}
