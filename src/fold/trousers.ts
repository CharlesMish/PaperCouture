// Trousers: wide-leg trousers from one square, with a waistband across both legs,
// hips joined down to the crotch, an empty gap between the legs below it, and a
// stripe of the paper's other side down both outer seams.
//
// Why it folds. The square becomes a long strip that shows one side on both faces
// (the folded-dollar-bill trousers trick): the sides fold to the middle, stopping a
// little short so a narrow band of the other side shows between them, and the
// strip folds in half lengthwise, then again. The strip then runs up one leg,
// turns across the waist and down the other leg. Each turn has a square corner:
// the strip folds straight back along the waist line, then at 45 degrees (and for
// the second leg the same in reverse). Four folds between the legs, an even number,
// so both legs show the same face and the band runs down both outer seams.
//
// The crotch. Turned at exactly 45 degrees the legs would lie side by side and
// touch all the way down. The second leg's 45 degree fold is turned a few degrees,
// which splays that leg; it is placed so the leg's inner edge crosses the first
// leg's at the crotch point, below the waist. Above that the legs overlap (the
// hips); below it there is no paper between them. The waist's height on the strip
// is chosen so both inseams are the same length, and the piece is displayed turned
// by half the splay, so the two legs lean out equally.
//
// Every fold after the first two is a valley fold worked from the back, where the
// turns also stay hidden; the model is turned back at the end.
//
// Colour comes only from folding: the legs show one side, the stripe the other.
// The colour choice folds the sides in front or behind and the first lengthwise
// fold the opposite way; no other step changes.

import type { Construction } from './construction';
import { FoldError, Op } from './engine';
import { v2, type Vec2 } from './geometry';

export type TrousersSide = 'print' | 'reverse';

export interface TrousersParams {
  /** Width of the band left between the side folds (the stripe), in sheet units. */
  stripe: number;
  /** Half of the angle between the legs, in degrees. */
  splay: number;
  /** Depth of the crotch below the waist, in sheet units. */
  crotch: number;
  side: TrousersSide;
}

export const DEFAULT_TROUSERS: TrousersParams = { stripe: 0.03, splay: 4, crotch: 0.22, side: 'print' };

const QUARTER = 0.25;
const reflect = (p: Vec2, o: Vec2, d: Vec2) => {
  const vx = p.x - o.x, vy = p.y - o.y, k = vx * d.x + vy * d.y;
  return v2(o.x + 2 * k * d.x - vx, o.y + 2 * k * d.y - vy);
};
const cross = (a: Vec2, b: Vec2, p: Vec2) => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);

/**
 * The strip's geometry in its own frame: x from 0 (the banded edge) to w, running
 * up the first leg. For a waist at y = t: fold back along the waist (H), turn at
 * 45 degrees (D1), turn again across a line at 45 degrees less the splay (D2),
 * placed so the second leg's inner edge passes through the crotch point, and fold
 * back along the waist (H). Reports both inseams so t can be solved.
 */
function turns(w: number, p: TrousersParams, t: number) {
  const beta = (p.splay * Math.PI) / 180;
  const H = (q: Vec2) => v2(q.x, 2 * t - q.y);
  const D1 = (q: Vec2) => v2(t - q.y, t - q.x); // across y = t - x
  const crotch = v2(w, t - p.crotch);
  const angle = Math.PI / 4 - beta, dir = v2(Math.cos(angle), Math.sin(angle)), nrm = v2(-dir.y, dir.x);
  const base = v2(2 * w, t);
  const at = (o: number) => v2(base.x + nrm.x * o, base.y + nrm.y * o);
  const leg = (o: number, q: Vec2) => H(reflect(D1(H(q)), at(o), dir));
  const side = (o: number) => cross(leg(o, v2(w, -0.6)), leg(o, v2(w, -0.9)), crotch);
  let lo = -0.5, hi = 0.5;
  const s0 = side(lo);
  if (Math.sign(s0) === Math.sign(side(hi))) throw new FoldError('trousers: no second turn reaches the crotch point');
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (Math.sign(side(m)) === Math.sign(s0)) lo = m; else hi = m; }
  const o = (lo + hi) / 2;
  const hem = leg(o, v2(w, 1));
  return { origin: at(o), dir, beta, crotch, inseamA: crotch.y + 1, inseamB: Math.hypot(hem.x - crotch.x, hem.y - crotch.y) };
}

export function trousersGeometry(p: TrousersParams = DEFAULT_TROUSERS) {
  if (!(p.stripe >= 0 && p.stripe <= 0.08)) throw new FoldError('trousers: stripe out of range');
  if (!(p.splay >= 1 && p.splay <= 10)) throw new FoldError('trousers: splay out of range');
  if (!(p.crotch >= 0.1 && p.crotch <= 0.4)) throw new FoldError('trousers: crotch depth out of range');
  /** the side folds sit this far outside x = +-1/2, leaving the stripe between the flaps */
  const s = p.stripe / 4;
  /** the strip's banded edge, in sheet coordinates before the turn-over */
  const edge = -s;
  const w = QUARTER - edge;
  let lo = -0.6, hi = 0.3;
  for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; const g = turns(w, p, m); if (g.inseamB > g.inseamA) lo = m; else hi = m; }
  const t = (lo + hi) / 2;
  const g = turns(w, p, t);
  return { ...g, t, w, s, edge, inseam: g.inseamA, displayAngle: -g.beta };
}

/** Rendered-level allowance per operation (scripts/hingeCheck.ts). The strip is
 * turned twice through its whole thickness, so the renderer's overlap levels put the
 * two sides of the last turns 31 apart; the folds themselves go through at most 16
 * paper layers (tr-up) and the finished trousers have up to 40 layers at one point
 * (measured in check-wardrobe-gaps.ts). Unlisted steps keep the ordinary bound. */
export const TROUSERS_LEVELS: Readonly<Record<string, number>> = { 'tr-waist': 15, 'tr-across': 15, 'tr-up': 31, 'tr-leg': 31, 'tr-reveal': 31 };

export function buildTrousers(p: TrousersParams = DEFAULT_TROUSERS): Construction {
  const g = trousersGeometry(p);
  const { t, w, s, edge, origin, dir } = g;
  const print = p.side === 'print';
  const legs = print ? 'the print' : 'the reverse colour';
  const stripe = print ? 'the reverse colour' : 'the print';
  const pct = (x: number) => `${(x * 50).toFixed(1)}%`;
  // From the turn-over on, the model is seen from the back (mirrored), and the
  // strip's own frame starts at its banded edge.
  const B = (q: Vec2) => v2(-(q.x + edge), q.y);
  const fold = (id: string, title: string, hint: string, a: Vec2, b: Vec2, moving: Vec2, only?: string): Op => ({
    kind: 'fold', id, title, hint, folds: [{ name: id, a, b, moving, sense: 'valley', ...(only ? { only } : {}) }],
  });
  const ops: Op[] = [
    {
      kind: 'fold', id: 'tr-sides', title: print ? 'Fold both sides behind, nearly to the middle' : 'Fold both sides to the middle',
      hint: `Print side up. ${print ? 'Fold the left and right edges behind' : 'Fold the left and right edges in'} so they stop ${pct(p.stripe / 2)} short of the centre line, leaving a ${pct(p.stripe)} band between them. That band becomes the stripe, in ${stripe}; the legs show ${legs}.`,
      folds: [
        { name: 'tr-side-left', a: v2(-0.5 - s, -1.5), b: v2(-0.5 - s, 1.5), moving: v2(-0.99, 0), sense: print ? 'mountain' : 'valley' },
        { name: 'tr-side-right', a: v2(0.5 + s, 1.5), b: v2(0.5 + s, -1.5), moving: v2(0.99, 0), sense: print ? 'mountain' : 'valley' },
      ],
    },
    {
      kind: 'fold', id: 'tr-half', title: 'Fold in half lengthwise',
      hint: `Fold the left half ${print ? 'forward' : 'behind'} onto the right along the centre line. The band now runs down the left edge.`,
      folds: [{ name: 'tr-half', a: v2(0, 1.5), b: v2(0, -1.5), moving: v2(-0.4, 0), sense: print ? 'valley' : 'mountain' }],
    },
    { kind: 'turn', id: 'tr-turn', title: 'Turn over', hint: 'The rest is folded from this side.' },
    fold('tr-strip', 'Fold in half lengthwise again', 'Fold the left half over onto the right: a long strip a quarter of the square wide, the same side showing on both faces, the band down its far edge.',
      v2(-QUARTER, -1.5), v2(-QUARTER, 1.5), v2(-0.45, 0)),
    fold('tr-waist', 'Fold the top back down', `Fold the top of the strip down along a line ${pct(1 - t)} of the square below the top: this line is the waist.`,
      B(v2(1.5, t)), B(v2(-1.5, t)), B(v2(w / 2, 0.9))),
    fold('tr-across', 'Turn it across the hips', 'Fold the hanging part across at 45 degrees from the waist corner, so it runs sideways along the waist.',
      B(v2(1.5, t - 1.5)), B(v2(-1, t + 1)), B(v2(w / 2, t - 0.9)), 'tr-waist'),
    fold('tr-up', 'Turn it up', `Fold the end up, a few degrees off 45 (${(45 - p.splay).toFixed(0)} degrees to the waist), so the second leg crosses the first ${pct(p.crotch)} of the square below the waist.`,
      B(v2(origin.x + 2 * dir.x, origin.y + 2 * dir.y)), B(v2(origin.x - 2 * dir.x, origin.y - 2 * dir.y)), B(v2(1.2, t - w / 2)), 'tr-waist'),
    fold('tr-leg', 'Fold it down as the second leg', 'Fold the end back down along the waist line: the second leg, splaying out below the crotch. The legs end level.',
      B(v2(-1.5, t)), B(v2(1.5, t)), B(v2(1.5 * w, t + 0.5)), 'tr-up'),
    { kind: 'turn', id: 'tr-reveal', title: 'Turn over', hint: 'The finished trousers: the turns stay behind.' },
  ];
  return { name: print ? 'Trousers' : 'Trousers, reverse colour', ops, meta: { top: t, shoulderPoint: v2(w + edge, t), sleeveCutDir: v2(1, 0) } };
}
