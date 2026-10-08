import * as THREE from 'three';

/**
 * Quarter-turn sampling for one face of the sheet.
 *
 * Three.js `Texture.updateMatrix` calls `Matrix3.setUvTransform(offset, repeat, rotation, center)`.
 * The vertex shader then does `mapTransform * vec3(uv, 1)`. That matrix is
 *
 *   T(offset) · T(center) · S(repeat) · R(rotation) · T(−center)
 *
 * so, with offset 0,
 *
 *   u' = sx ( cos θ (u−cx) + sin θ (v−cy) ) + cx
 *   v' = sy (−sin θ (u−cx) + cos θ (v−cy) ) + cy
 *
 * The front keeps the existing control: θ = −(quarterTurns mod 4) · π/2 about (0.5, 0.5).
 *
 * The back canvas is drawn as seen from behind, so the unrotated sample is a
 * mirror in u about the centre (repeat.x = −1). Scale is applied after rotation,
 * and that mirror is exactly S(−1, 1) about (0.5, 0.5), so the same θ with
 * repeat (−1, 1) is mirror ∘ rotation. For a material uv this is
 *
 *   back(uv) = (1 − front(uv).u, front(uv).v)
 *
 * which is the back-canvas location of the same original sheet point the front
 * samples. Rotation after the mirror does not commute with it, and is wrong.
 */
export function applySheetOrientation(texture: THREE.Texture, side: 'front' | 'back', quarterTurns: number): void {
  texture.offset.set(0, 0);
  texture.repeat.set(side === 'back' ? -1 : 1, 1);
  texture.center.set(0.5, 0.5);
  texture.rotation = (-(quarterTurns % 4) * Math.PI) / 2;
  texture.updateMatrix();
}
