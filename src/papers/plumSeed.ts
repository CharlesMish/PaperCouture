import type { PaperDesign } from './types';
import { solid } from './util';

const OAT = '#e9e0cc', PLUM = '#5c2a4b';
export const PLUM_SEED_RADII = { long: .030, short: .012 } as const;

export interface PlumSeedMotif { u: number; v: number; angle: number; ink: 0 | 1 }

/** The owner's supplied Plum seed proposal, adapted to the real paper API.
 * Coordinates/radii are material units on [-1,1]², rather than canvas pixels. */
export function plumSeedMotifs(): PlumSeedMotif[] {
  let seed = 0x5eed;
  const next = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
  const motifs: PlumSeedMotif[] = [], step = 2 / 14;
  for (let col = 0; col < 14; col++) for (let row = 0; row < 14; row++) {
    motifs.push({ u: -1 + step * (col + .2 + .6 * next()),
      v: -1 + step * (row + .2 + .6 * next()), angle: next() * Math.PI,
      ink: next() < .72 ? 0 : 1 });
  }
  return motifs;
}

function ink(ctx: CanvasRenderingContext2D, size: number, back = false) {
  ctx.save();
  // Back canvas is viewed from behind. Reflect the whole drawing once, which
  // reflects both the seed centres and their orientations in the same material.
  if (back) { ctx.translate(size, 0); ctx.scale(-1, 1); }
  const colours = back ? [OAT, '#c9b79a'] : ['#6e3358', '#7f9673'];
  const half = size / 2;
  for (const seed of plumSeedMotifs()) {
    ctx.fillStyle = colours[seed.ink];
    ctx.beginPath();
    ctx.ellipse((1 + seed.u) * half, (1 - seed.v) * half,
      PLUM_SEED_RADII.long * half, PLUM_SEED_RADII.short * half,
      -seed.angle, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export const plumSeed: PaperDesign = {
  id: 'plum-seed', name: 'Plum seed',
  note: 'Small plum and sage seeds on oat; paired oat seeds on a plum reverse', reverse: PLUM,
  placementNote: 'These scattered seeds keep their fixed placement. Both printed faces turn together. Sliding and seamless repeats are not offered for this finite sheet.',
  drawFront(ctx, size) { solid(ctx, size, OAT); ink(ctx, size); },
  drawBack(ctx, size) { solid(ctx, size, PLUM); ink(ctx, size, true); },
};
