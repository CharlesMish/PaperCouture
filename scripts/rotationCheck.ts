// Both faces of a quarter turn must sample the same physical point of the
// original sheet. The back canvas is stored mirrored in u, so for one material
// uv the back sample has to be mirror(front sample): (1 - s, t).
//
// This walks the matrices Three.js actually builds (Texture.updateMatrix →
// Matrix3.setUvTransform), not the angle fields. It fails if only the front
// rotates, and if the back rotation is applied after the mirror.

import * as THREE from 'three';
import { applySheetOrientation } from '../src/render/sheetOrientation';

const POINTS: [number, number][] = [
  [0.2, 0.35],
  [0.81, 0.17],
  [0.5, 0.5],
  [0.07, 0.92],
  [0.66, 0.58],
  [0.13, 0.8],
  [0, 0],
  [1, 1],
  [0, 1],
  [1, 0],
];

function sample(side: 'front' | 'back', quarterTurns: number, u: number, v: number): [number, number] {
  const tex = new THREE.Texture();
  applySheetOrientation(tex, side, quarterTurns);
  const p = new THREE.Vector3(u, v, 1).applyMatrix3(tex.matrix);
  return [p.x, p.y];
}

/** Front mapping already shipped: θ = −q·π/2 about the centre. */
function frontExpected(quarterTurns: number, u: number, v: number): [number, number] {
  const q = ((quarterTurns % 4) + 4) % 4;
  if (q === 0) return [u, v];
  if (q === 1) return [1 - v, u];
  if (q === 2) return [1 - u, 1 - v];
  return [v, 1 - u];
}

function near(a: [number, number], b: [number, number]): boolean {
  return Math.hypot(a[0] - b[0], a[1] - b[1]) < 1e-6;
}

export function checkTwoSidedRotation(errors: string[]): void {
  for (const q of [0, 1, 2, 3]) {
    for (const [u, v] of POINTS) {
      const front = sample('front', q, u, v);
      const back = sample('back', q, u, v);
      const wantFront = frontExpected(q, u, v);
      if (!near(front, wantFront)) {
        errors.push(
          `front q=${q} (${u},${v}) -> (${front.map((n) => n.toFixed(4)).join(',')}), expected (${wantFront.join(',')})`,
        );
      }
      const wantBack: [number, number] = [1 - front[0], front[1]];
      if (!near(back, wantBack)) {
        errors.push(
          `back q=${q} (${u},${v}) -> (${back.map((n) => n.toFixed(4)).join(',')}), expected mirror of front (${wantBack.map((n) => n.toFixed(4)).join(',')})`,
        );
      }
      const front4 = sample('front', q + 4, u, v);
      const back4 = sample('back', q + 4, u, v);
      if (!near(front4, front) || !near(back4, back)) {
        errors.push(`q=${q}+4 does not match q=${q} at (${u},${v})`);
      }
    }
  }
}
