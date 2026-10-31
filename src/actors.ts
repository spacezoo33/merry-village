import { contactShadow, snowMaterial } from "./surface";
import { batchStatic } from "./model-batch";
import * as T from "three";
import { addFirBranches } from "./fir";
import { buildVintageCar } from "./train-model";
import { railCalibration, PORTAL_ANGLE } from "./rail-profiles";
import type { VillageId } from "./catalog";
import { lightLevel, type LightPattern } from "./lighting";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { consist, TREE_SECONDS, RADIUS } from "./kinematics";
export type ActorSettings = {
  motion: boolean;
  lights: boolean;
  gold: boolean;
  hidden: boolean;
  pattern: LightPattern;
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
const snow = snowMaterial();
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
export class Actors {
  private renderer: T.WebGLRenderer;
  private world = new T.Scene();
  private camera = new T.OrthographicCamera(-1.55, 1.55, 1.83, -1.27, 0.01, 40);
  private tree = new T.Group();
  private cars: T.Group[] = [];
  private wheels: T.Group[] = [];
  private calibration;
  private environment: T.WebGLRenderTarget;
  ready: Promise<void> = Promise.resolve();
  private dead = false;
  private links: T.Mesh[] = [];
  private architecture: HTMLElement[] = [];
  private glowMaterial: T.ShaderMaterial | null = null;
  private diodeBodies: T.InstancedMesh | null = null;
  private diodeColors: T.Color[] = [];
  private ledWeights = new Float32Array(75);
  private ledAttribute = new T.BufferAttribute(this.ledWeights, 1);
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
    pattern: "gentle",
  };
  private reduced = matchMedia("(prefers-reduced-motion: reduce)");
  private observer: ResizeObserver;
  private onReduce = () => this.schedule();
  private lost = false;
  private textures: T.Texture[] = [];
  private host: HTMLElement;
  constructor(host: HTMLElement, village: VillageId) {
    this.calibration = railCalibration(village);
    this.host = host;
    this.architecture = [
      ...host.parentElement!.querySelectorAll<HTMLElement>(".bulb-emitter"),
    ];
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
    const p = this.calibration;
    this.camera.left = p.left;
    this.camera.right = p.left + p.spanX;
    this.camera.top = p.top;
    this.camera.bottom = p.top - p.spanY;
    this.camera.position.set(
      0,
      Math.sin(p.elevation) * 20,
      Math.cos(p.elevation) * 20,
    );
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.world.add(new T.HemisphereLight(0xffedcf, 0x564938, 1.8));
    const key = new T.DirectionalLight(0xffd49c, 2.5);
    key.position.set(-3, 7, 6);
    this.world.add(key);
    const rim = new T.DirectionalLight(0x9bbdff, 1.2);
    rim.position.set(2, 4, -3);
    this.world.add(rim);
    const pmrem = new T.PMREMGenerator(this.renderer),
      room = new RoomEnvironment();
    this.environment = pmrem.fromScene(room, 0.05);
    this.world.environment = this.environment.texture;
    this.world.environmentIntensity = 0.65;
    pmrem.dispose();
    room.dispose();
    this.renderer.toneMappingExposure = 1.05;
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
    tree.position.set(0, this.calibration.treeY, 0);
    this.world.add(tree);
    const shadow = contactShadow(0.66, 0.38, 0.28);
    shadow.position.set(0.025, this.calibration.treeY - 0.049, 0.02);
    this.world.add(shadow);
    mesh(
      new T.CylinderGeometry(0.045, 0.06, 0.18, 12),
      new T.MeshStandardMaterial({ color: 0x685036, roughness: 0.9 }),
      tree,
      0,
      0.04,
    );
    const fir = addFirBranches(tree);
    this.textures.push(fir.texture);
    this.ready = fir.ready
      .then(() => {
        if (!this.dead) {
          this.host.dataset.ready = "true";
          this.draw();
        }
      })
      .catch(() => {
        if (!this.dead)
          this.host.dataset.unavailable = "트리 질감을 불러오지 못했어요";
      });
    const ball = new T.SphereGeometry(0.024, 12, 10);
    const colors = [0xc92116, 0xd9aa4e, 0xb63225];
    const ornamentMaterials = colors.map(
      (color) =>
        new T.MeshStandardMaterial({ color, metalness: 0.72, roughness: 0.28 }),
    );
    for (let i = 0; i < 65; i++) {
      const y = 0.14 + (i / 65) * 0.96,
        a = i * 2.3999,
        r = 0.42 * (1 - y / 1.32) ** 0.78;
      mesh(
        ball,
        ornamentMaterials[i % 3]!,
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
        r = 0.435 * (1 - y / 1.32) ** 0.78,
        bow = new T.Group();
      bow.scale.setScalar(1.25);
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
        r = 0.43 * (1 - y / 1.32) ** 0.78;
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
    const leds = new T.InstancedMesh(
      new T.SphereGeometry(0.012, 7, 5),
      new T.MeshStandardMaterial({ roughness: 0.5 }),
      75,
    );
    const ledPositions = new Float32Array(225),
      ledColors = new Float32Array(225),
      dummy = new T.Object3D();
    for (let i = 0; i < 75; i++) {
      const y = 0.14 + (i / 75) * 0.98,
        a = (i / 75) * Math.PI * 10,
        r = 0.438 * (1 - y / 1.32) ** 0.78;
      dummy.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      dummy.updateMatrix();
      leds.setMatrixAt(i, dummy.matrix);
      const color = new T.Color([0xffb63e, 0xc42e18, 0x51a447][i % 3]);
      leds.setColorAt(i, color);
      this.diodeColors.push(color.clone());
      dummy.position.toArray(ledPositions, i * 3);
      color.toArray(ledColors, i * 3);
    }
    this.diodeBodies = leds;
    tree.add(leds);
    const geometry = new T.BufferGeometry();
    geometry.setAttribute("position", new T.BufferAttribute(ledPositions, 3));
    geometry.setAttribute("tint", new T.BufferAttribute(ledColors, 3));
    geometry.setAttribute("level", this.ledAttribute);
    const points = new T.Points(
      geometry,
      new T.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        uniforms: { size: { value: 9 * Math.min(devicePixelRatio, 1.75) } },
        vertexShader:
          "attribute vec3 tint; attribute float level; varying vec3 vTint; varying float vLevel; uniform float size; void main(){ vTint=tint;vLevel=level;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);gl_PointSize=size; }",
        fragmentShader:
          "varying vec3 vTint;varying float vLevel;void main(){float r=length(gl_PointCoord-vec2(.5))*2.;float a=pow(max(0.,1.-r),2.);gl_FragColor=vec4(vTint*vLevel,a*min(1.,vLevel));}",
      }),
    );
    this.glowMaterial = points.material;
    tree.add(points);
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
    batchStatic(tree, new Set([star]));
  }
  private buildTrain() {
    for (let i = 0; i < 3; i++) {
      const model = buildVintageCar(i === 0);
      this.cars.push(model.group);
      this.wheels.push(...model.wheels);
      this.world.add(model.group);
    }
    for (let i = 0; i < 2; i++)
      this.links.push(
        mesh(new T.CylinderGeometry(0.006, 0.006, 1, 8), bronze, this.world),
      );
    // Rear half is inside the opaque raised village/tunnel. Clip in world space,
    // progressively across each vehicle (not whole-car visibility popping).
    const tunnel = new T.Plane(
      new T.Vector3(0, 0, 1),
      -this.calibration.tunnelZ,
    );
    for (const car of [...this.cars, ...this.links])
      car.traverse((o) => {
        if (o instanceof T.Mesh || o instanceof T.Points) {
          const original = o.material as T.MeshStandardMaterial;
          const m = original.clone();
          m.onBeforeCompile = original.onBeforeCompile;
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
            r *
              Math.cos(PORTAL_ANGLE + (i / 96) * (Math.PI - 2 * PORTAL_ANGLE)),
            0.008,
            r *
              Math.sin(PORTAL_ANGLE + (i / 96) * (Math.PI - 2 * PORTAL_ANGLE)),
          ),
      );
      mesh(
        new T.TubeGeometry(new T.CatmullRomCurve3(points), 96, 0.006, 6, false),
        bronze,
        this.world,
      );
    }
    const ties = new T.InstancedMesh(
        new RoundedBoxGeometry(0.014, 0.007, 0.18, 1, 0.002),
        dark,
        65,
      ),
      dummy = new T.Object3D();
    for (let i = 0; i <= 64; i++) {
      const a = PORTAL_ANGLE + (i / 64) * (Math.PI - 2 * PORTAL_ANGLE);
      dummy.position.set(RADIUS * Math.cos(a), 0, RADIUS * Math.sin(a));
      dummy.rotation.y = -a - Math.PI / 2;
      dummy.updateMatrix();
      ties.setMatrixAt(i, dummy.matrix);
    }
    this.world.add(ties);
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
      0.85 +
        (Math.max(0, this.elapsed - 0.65) / this.calibration.lap) * Math.PI * 2,
      this.calibration.scale,
    );
    poses.forEach((p, i) => {
      this.cars[i]!.position.set(p.x, 0.014, p.z);
      this.cars[i]!.scale.setScalar(this.calibration.scale);
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
    this.wheels.forEach((w) => {
      w.rotation.z =
        (-Math.max(0, this.elapsed - 0.65) *
          Math.PI *
          2 *
          (RADIUS - w.position.z * this.calibration.scale)) /
        (this.calibration.lap * 0.035 * this.calibration.scale);
    });
    for (let i = 0; i < 75; i++)
      this.ledWeights[i] = this.settings.lights
        ? lightLevel(
            this.settings.pattern,
            this.lightTime,
            i,
            this.reduced.matches,
          ) * (this.settings.gold ? 3.3 : 2.5)
        : 0;
    this.ledAttribute.needsUpdate = true;
    if (this.diodeBodies) {
      for (let i = 0; i < 75; i++) {
        const color = this.diodeColors[i]!.clone().multiplyScalar(
          0.06 + 0.8 * Math.min(1, this.ledWeights[i]! / 2.5),
        );
        this.diodeBodies.setColorAt(i, color);
      }
      this.diodeBodies.instanceColor!.needsUpdate = true;
    }
    this.bulbs.forEach(
      (b) =>
        (b.material.emissiveIntensity = this.settings.lights
          ? this.ledWeights[0]!
          : 0),
    );
    for (const [i, bulb] of this.architecture.entries()) {
      const level = this.settings.lights
        ? lightLevel(
            this.settings.pattern,
            this.lightTime,
            i,
            this.reduced.matches,
          )
        : 0;
      bulb.style.opacity = String(level);
      bulb.style.setProperty("--intensity", String(level));
    }
    this.renderer.render(this.world, this.camera);
    this.host.dataset.elapsed = this.elapsed.toFixed(3);
    this.host.dataset.treeAngle = this.tree.rotation.y.toFixed(5);
    this.host.dataset.trainAngle = poses[0]!.angle.toFixed(5);
    this.host.dataset.pattern = this.settings.pattern;
    this.host.dataset.bulbLevels = JSON.stringify(
      [...this.ledWeights.slice(0, 6)].map((v) => Number(v.toFixed(3))),
    );
    this.host.dataset.drawCalls = String(this.renderer.info.render.calls);
    this.host.dataset.village = JSON.stringify(this.calibration);
    this.host.dataset.reduced = String(this.reduced.matches);
  }
  get lightingTime() {
    return this.lightTime;
  }
  snapshot(): HTMLCanvasElement {
    // Render the frozen current pose at export resolution, not an enlarged phone framebuffer.
    const size = this.renderer.getSize(new T.Vector2()),
      ratio = this.renderer.getPixelRatio();
    const pointSize = this.glowMaterial?.uniforms.size!.value;
    try {
      this.renderer.setPixelRatio(1);
      this.renderer.setSize(1200, 1200, false);
      if (this.glowMaterial)
        this.glowMaterial.uniforms.size!.value =
          (9 * 1200) / Math.max(1, this.host.clientWidth);
      this.draw();
      const copy = document.createElement("canvas");
      copy.width = 1200;
      copy.height = 1200;
      copy.getContext("2d")!.drawImage(this.renderer.domElement, 0, 0);
      return copy;
    } finally {
      this.renderer.setPixelRatio(ratio);
      this.renderer.setSize(size.x, size.y, false);
      if (this.glowMaterial) this.glowMaterial.uniforms.size!.value = pointSize;
      this.draw();
    }
  }
  destroy() {
    this.dead = true;
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
      if (o instanceof T.Mesh || o instanceof T.Points) {
        geometries.add(o.geometry);
        materials.add(o.material);
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => {
      if (!shared.includes(m as T.MeshStandardMaterial)) m.dispose();
    });
    this.textures.forEach((t) => t.dispose());
    this.environment.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.host.replaceChildren();
  }
}
