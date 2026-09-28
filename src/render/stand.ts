import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

// A low card-holder block: the flat-folded dress stands with its hem in a
// slot. It supports the piece without covering it; only the bottom
// SLOT_DEPTH of the hem sits inside the block.

export const STAND_HEIGHT = 0.075;
export const SLOT_DEPTH = 0.028;

export function makeStand(): { group: THREE.Group; setOpacity(o: number): void } {
  const group = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#d6c8ae', roughness: 0.78, metalness: 0 });
  const slotMat = new THREE.MeshStandardMaterial({ color: '#5f5343', roughness: 1 });
  const block = new THREE.Mesh(new RoundedBoxGeometry(1.1, STAND_HEIGHT, 0.26, 3, 0.018), wood);
  block.position.y = STAND_HEIGHT / 2;
  block.castShadow = true;
  block.receiveShadow = true;
  const slot = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.002, 0.045), slotMat);
  slot.position.y = STAND_HEIGHT + 0.0005;
  group.add(block, slot);
  const mats = [wood, slotMat];
  return {
    group,
    setOpacity(o: number) {
      group.visible = o > 0.001;
      for (const m of mats) {
        m.transparent = o < 0.999;
        m.opacity = o;
        m.depthWrite = o >= 0.999;
      }
    },
  };
}
