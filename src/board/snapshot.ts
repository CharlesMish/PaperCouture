import * as THREE from 'three';
import { FrozenPiece, PaperRecipe, Surface } from './model';
import { makePaperTextures, PaperTextures } from '../render/textures';
import { findPaper } from '../papers';
import { rotationCheckPaper } from '../papers/rotationCheck';

/** Capture only visible posed paper and seams, excluding workshop guides/stand. */
export function capture(objects: THREE.Object3D[], angle: number): FrozenPiece {
  const root = new THREE.Group(); root.rotation.z = angle;
  const visibleCopy = (object: THREE.Object3D): THREE.Object3D => {
    const copy = object.clone(false);
    for (const child of object.children) if (child.visible) copy.add(visibleCopy(child));
    return copy;
  };
  for (const object of objects) if (object.visible) root.add(visibleCopy(object));
  root.updateMatrixWorld(true);
  root.position.sub(new THREE.Box3().setFromObject(root, true).getCenter(new THREE.Vector3()));
  root.updateMatrixWorld(true);
  const data: FrozenPiece = { geometries: [], materials: [], parts: [] };
  const geometries = new Map<THREE.BufferGeometry, number>(), materials = new Map<THREE.Material, number>();
  root.traverseVisible(object => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)) return;
    const g = object.geometry, m = object.material;
    if (Array.isArray(m) || g.index) throw new Error('Unsupported paper surface');
    if (!geometries.has(g)) {
      const attributes: Record<string, number[]> = {};
      for (const key of ['position', 'normal', 'uv', 'color']) {
        const a = g.getAttribute(key); if (a) attributes[key] = Array.from(a.array);
      }
      geometries.set(g, data.geometries.length);
      data.geometries.push(attributes as FrozenPiece['geometries'][number]);
    }
    if (!materials.has(m)) {
      if (!(m instanceof THREE.MeshStandardMaterial || m instanceof THREE.LineBasicMaterial)) throw new Error('Unsupported paper material');
      const surface: Surface = { kind: m instanceof THREE.MeshStandardMaterial ? 'paper' : 'line',
        color: m.color.toArray(), side: m.side, opacity: m.opacity, transparent: m.transparent,
        depthWrite: m.depthWrite, vertexColors: m.vertexColors };
      if (m.map) {
        if (!m.map.userData.paperRecipe) throw new Error('Paper cannot be saved');
        surface.paper = structuredClone(m.map.userData.paperRecipe as PaperRecipe);
      }
      materials.set(m, data.materials.length); data.materials.push(surface);
    }
    data.parts.push({ geometry: geometries.get(g)!, material: materials.get(m)!,
      matrix: object.matrixWorld.toArray(), kind: object instanceof THREE.Mesh ? 'mesh' : 'lines' });
  });
  return data;
}

/** Rebuild owned GPU resources from bounded data; no scene loader or external URLs. */
export function restore(data: FrozenPiece): THREE.Group {
  const group = new THREE.Group(), textures = new Map<string, PaperTextures>();
  const geometries = data.geometries.map(attributes => {
    const geometry = new THREE.BufferGeometry();
    for (const [key, array] of Object.entries(attributes))
      geometry.setAttribute(key, new THREE.Float32BufferAttribute(array, key === 'uv' ? 2 : 3));
    return geometry;
  });
  const materials = data.materials.map(surface => {
    const material = surface.kind === 'paper' ? new THREE.MeshStandardMaterial({ roughness: .9 }) : new THREE.LineBasicMaterial();
    material.color.fromArray(surface.color); material.side = surface.side as THREE.Side;
    material.opacity = surface.opacity; material.transparent = surface.transparent;
    material.depthWrite = surface.depthWrite; material.vertexColors = surface.vertexColors;
    if (surface.paper) {
      const { id, turns, position, side } = surface.paper, key = JSON.stringify([id, turns, position]);
      if (!textures.has(key)) textures.set(key, makePaperTextures(id === rotationCheckPaper.id ? rotationCheckPaper : findPaper(id), turns, 1, position));
      material.map = textures.get(key)![side];
    }
    return material;
  });
  for (const part of data.parts) {
    const object = part.kind === 'mesh' ? new THREE.Mesh(geometries[part.geometry], materials[part.material])
      : new THREE.LineSegments(geometries[part.geometry], materials[part.material]);
    object.matrix.fromArray(part.matrix); object.matrixAutoUpdate = false;
    object.castShadow = object.receiveShadow = part.kind === 'mesh';
    group.add(object);
  }
  group.userData.dispose = () => {
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
  };
  return group;
}
