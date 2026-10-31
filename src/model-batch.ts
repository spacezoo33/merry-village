import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
/** Bake static tree ornament transforms and batch by material; retain animated nodes. */
export function batchStatic(root: T.Group, retained: Set<T.Object3D>) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert(),
    buckets = new Map<T.Material, T.BufferGeometry[]>(),
    remove: T.Mesh[] = [],
    originals = new Set<T.BufferGeometry>();
  root.traverse((o) => {
    if (
      o instanceof T.Mesh &&
      !(o instanceof T.InstancedMesh) &&
      !retained.has(o)
    ) {
      const g = o.geometry.index
        ? o.geometry.toNonIndexed()
        : o.geometry.clone();
      g.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, o.matrixWorld));
      g.deleteAttribute("uv");
      const m = o.material as T.Material,
        gs = buckets.get(m) ?? [];
      gs.push(g);
      buckets.set(m, gs);
      remove.push(o);
      originals.add(o.geometry);
    }
  });
  remove.forEach((o) => o.removeFromParent());
  originals.forEach((g) => g.dispose());
  buckets.forEach((gs, m) => {
    const merged = mergeGeometries(gs, false);
    if (merged) root.add(new T.Mesh(merged, m));
    gs.forEach((g) => g.dispose());
  });
}
