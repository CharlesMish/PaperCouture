import { SWING_COAT_CREASES, Segment } from './coatMarks';
import type { PaperDesign } from './types';

// A dye-inspired print aligned to the Swing coat's material creases at 0°.
// Each individual source is symmetric about its own crease, but the combined
// nearest-source field is NOT reflection-invariant about every crease: other
// creases and raw edges can dominate on one side. This is authored artwork,
// not a simulation or guarantee of exact folded-pattern registration.
//
// Both faces carry the same dye in the same material places, as dyed-through
// paper would; the reverse ground is a shade cooler so the lining still reads.
// At other turns, or on other garments, the halos fall off the creases and
// read as an abstract dyed lattice. That is expected, not registration.

const PEARL = '#f1ead9', LINING = '#e2e4dc', DYE = [22, 74, 88] as const; // deep petrol
const WIDTH = 0.075; // mean reach of the dye from a crease, sheet units
const EDGE: Segment[] = [[[-1, -1], [1, -1]], [[1, -1], [1, 1]], [[1, 1], [-1, 1]], [[-1, 1], [-1, -1]]];

/** Smooth deterministic 1D noise in [0, 1]. */
function noise(t: number, seed: number): number {
  const h = (i: number) => { const s = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453; return s - Math.floor(s); };
  const i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f);
  return h(i) * (1 - u) + h(i + 1) * u;
}

interface Source { ax: number; ay: number; dx: number; dy: number; L: number; seed: number }
const SOURCES: Source[] = [...SWING_COAT_CREASES, ...EDGE].map(([[ax, ay], [bx, by]]) => {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
  // Collinear segments share a seed, but measure position from their own
  // midpoint. That preserves Claude's artwork; it does not prove symmetry
  // of the complete pattern across a fold.
  const seed = Math.round((Math.abs(dx * ay - dy * ax) / L) * 97 + Math.abs(dx / L) * 13);
  return { ax, ay, dx: dx / L, dy: dy / L, L, seed };
});

/** Dye strength in [0, 1] at a material point. The halos of all creases are
 * one union with one tide line, so crossings and crease ends leave no rings. */
export function bloomAt(x: number, y: number): number {
  let best = Infinity, streak = 1;
  for (const k of SOURCES) {
    const s = (x - k.ax) * k.dx + (y - k.ay) * k.dy;
    const c = Math.max(0, Math.min(k.L, s));
    const d = Math.hypot(x - (k.ax + k.dx * c), y - (k.ay + k.dy * c));
    if (d > WIDTH * 1.6) continue;
    // position along the crease from its midpoint: unchanged by the fold
    const along = Math.abs(s - k.L / 2);
    const r = d / (WIDTH * (0.65 + 0.7 * noise(along * 8, k.seed)));
    if (r < best) { best = r; streak = 0.78 + 0.22 * noise(along * 90, k.seed + 5); }
  }
  if (best === Infinity) return 0;
  const body = best < 1 ? (1 - best) ** 0.8 * streak : 0;
  const tide = 0.55 * Math.exp(-(((best - 1) / 0.07) ** 2));
  return Math.min(1, body * 0.9 + tide);
}

// Reuse expensive fixed artwork across rotations and board restoration.
// Bounded to four raster sizes/faces; callers only copy these private pixels.
const rasters = new Map<string, ImageData>();

function paint(ctx: CanvasRenderingContext2D, S: number, back: boolean) {
  // Compute at most 512 px and scale: the halo is soft and the cost is per pixel.
  const N = Math.min(S, 512);
  const key = `${N}:${back}`;
  let img = rasters.get(key);
  if (!img) {
    const ground = back ? LINING : PEARL;
    const g = [1, 3, 5].map(i => parseInt(ground.slice(i, i + 2), 16));
    img = new ImageData(N, N);
    for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
      // canvas -> material. The reverse canvas is seen from behind: x mirrors once.
      const u = (px + 0.5) / N * 2 - 1;
      const x = back ? -u : u, y = 1 - (py + 0.5) / N * 2;
      const a = bloomAt(x, y) * (back ? 0.8 : 0.9);
      const o = (py * N + px) * 4;
      for (let c = 0; c < 3; c++) img.data[o + c] = Math.round(g[c] * (1 - a) + DYE[c] * a);
      img.data[o + 3] = 255;
    }
    if (rasters.size >= 4) rasters.delete(rasters.keys().next().value!);
    rasters.set(key, img);
  }
  if (N === S) { ctx.putImageData(img, 0, 0); return; }
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = N;
  tmp.getContext('2d')!.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(tmp, 0, 0, S, S);
}

export const creaseBloom: PaperDesign = {
  id: 'crease-bloom',
  name: 'Crease bloom',
  note: 'Petrol dye-inspired halos aligned to the Swing coat’s creases at 0°',
  reverse: LINING,
  placementNote: 'Designed for the Swing coat at 0°: petrol halos follow its creases and shade the facings. Nearby halos overlap, so opposite sides of a fold need not match exactly. Other turns and garments make an abstract dyed lattice.',
  drawFront: (ctx, S) => paint(ctx, S, false),
  drawBack: (ctx, S) => paint(ctx, S, true),
};
