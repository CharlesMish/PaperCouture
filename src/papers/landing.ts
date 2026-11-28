// Where a paper lands on a finished piece: measurements and a few placements
// worth looking at.
//
// Everything is measured on the flat finished state (the same facets
// src/render/flatPreview.ts draws), so it shares that drawing's limits: no
// lighting, no layer thickness, no camera tilt. "Ink" is any pixel of a face
// that differs from that face's most common colour. These numbers choose what
// to show someone; they do not say what looks good, and a placement they rank
// low can be the right one.
import { SheetState, isFlipped, modelPoly } from '../fold/engine';
import { Vec2, applyAffine, signedArea } from '../fold/geometry';
import { PaperFaces, fitFrame, materialPoint, paperFaces } from '../render/flatPreview';
import type { PaperDesign, PrintPosition } from './types';
import { ORIGINAL, normalizePosition } from './printPosition';
import type { StartingPoint } from './startingPoints';

/** A finished piece and the angle it is shown at. */
export interface Subject { state: SheetState; angle: number }

const S = 128; // paper raster for measuring

function canvas(size: number) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  return c;
}
const pixels = (c: HTMLCanvasElement) => c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height).data;

/** The most common colour of a face (quantised), taken as its ground. */
function ground(d: Uint8ClampedArray): [number, number, number] {
  const count = new Map<number, number>();
  for (let i = 0; i < d.length; i += 4) {
    const k = (d[i] >> 3) << 10 | (d[i + 1] >> 3) << 5 | (d[i + 2] >> 3);
    count.set(k, (count.get(k) ?? 0) + 1);
  }
  let best = 0, n = -1;
  for (const [k, v] of count) if (v > n) { n = v; best = k; }
  return [((best >> 10) & 31) * 8 + 4, ((best >> 5) & 31) * 8 + 4, (best & 31) * 8 + 4];
}

export interface FaceInk { masks: PaperFaces; inkFront: number; inkBack: number }

function inkMask(src: CanvasImageSource): [HTMLCanvasElement, number] {
  const d = pixels(src as HTMLCanvasElement), g = ground(d);
  const m = canvas(S), ctx = m.getContext('2d')!, img = ctx.createImageData(S, S);
  let n = 0;
  for (let i = 0; i < d.length; i += 4) {
    const ink = Math.abs(d[i] - g[0]) + Math.abs(d[i + 1] - g[1]) + Math.abs(d[i + 2] - g[2]) > 54;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = ink ? 255 : 0; img.data[i + 3] = 255;
    if (ink) n++;
  }
  ctx.putImageData(img, 0, 0);
  return [m, n / (S * S)];
}

/** A white-on-black mask of each face's ink, drawn by the paper's own functions. */
export function faceInk(paper: PaperDesign, turns: number, position: PrintPosition = ORIGINAL): FaceInk {
  const faces = paperFaces(paper, turns, position, S);
  const [front, inkFront] = inkMask(faces.front), [back, inkBack] = inkMask(faces.back);
  return { masks: { front, back, size: S }, inkFront, inkBack };
}

export interface SheetMap {
  n: number;
  /** 1 where the printed face of this sheet cell can be seen on the finished front */
  lit: Uint8Array;
  /** -1 / +1: the cell lands left / right of the finished piece's centre */
  side: Int8Array;
  /** +1 / -1: the cell lands in the upper / lower half */
  rise: Int8Array;
}
const mapCache = new WeakMap<SheetState, SheetMap>();
/**
 * The finished front read back onto the flat printed face, in the sheet's own
 * orientation (the corner that starts top-left is cell 0).
 */
export function sheetMap(subject: Subject, n = 112): SheetMap {
  const hit = mapCache.get(subject.state);
  if (hit) return hit;
  const lit = new Uint8Array(n * n), side = new Int8Array(n * n), rise = new Int8Array(n * n);
  // Counter-clockwise outlines with bounds, so each cell tests few polygons.
  const outline = (poly: Vec2[]) => {
    const pts = signedArea(poly) < 0 ? poly.slice().reverse() : poly;
    return { pts, lx: Math.min(...pts.map(q => q.x)) - 1e-9, hx: Math.max(...pts.map(q => q.x)) + 1e-9, ly: Math.min(...pts.map(q => q.y)) - 1e-9, hy: Math.max(...pts.map(q => q.y)) + 1e-9 };
  };
  type Outline = ReturnType<typeof outline>;
  const within = (o: Outline, x: number, y: number) => {
    if (x < o.lx || x > o.hx || y < o.ly || y > o.hy) return false;
    for (let k = 0; k < o.pts.length; k++) {
      const a = o.pts[k], b = o.pts[(k + 1) % o.pts.length];
      if ((b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x) < -1e-10) return false;
    }
    return true;
  };
  const facets = subject.state.facets.map(f => ({ f, material: outline(f.poly), model: outline(modelPoly(f)), flipped: isFlipped(f) }));
  const frame = fitFrame(subject.state, 2, 'front', subject.angle), c = Math.cos(subject.angle), s = Math.sin(subject.angle);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const m = materialPoint((i + .5) / n, (j + .5) / n, 'print', 0);
    const own = facets.find(q => within(q.material, m.x, m.y));
    if (!own || own.flipped) continue;
    const p = applyAffine(own.f.T, m);
    if (facets.some(q => q.f.rank > own.f.rank && within(q.model, p.x, p.y))) continue;
    const o = j * n + i;
    lit[o] = 1;
    side[o] = p.x * c - p.y * s < frame.cx ? -1 : 1;
    rise[o] = p.x * s + p.y * c < frame.cy ? -1 : 1;
  }
  const map = { n, lit, side, rise };
  mapCache.set(subject.state, map);
  return map;
}

const veilCache = new WeakMap<SheetState, HTMLCanvasElement>();
/**
 * A veil for the flat printed face: clear where the print can be seen on the
 * finished front, tinted where the fold hides it or shows its other side.
 */
export function hiddenVeil(subject: Subject): HTMLCanvasElement {
  const hit = veilCache.get(subject.state);
  if (hit) return hit;
  const { n, lit } = sheetMap(subject);
  const c = canvas(n), ctx = c.getContext('2d')!, img = ctx.createImageData(n, n);
  for (let o = 0; o < n * n; o++) {
    img.data[o * 4] = 196; img.data[o * 4 + 1] = 186; img.data[o * 4 + 2] = 170; img.data[o * 4 + 3] = lit[o] ? 0 : 172;
  }
  ctx.putImageData(img, 0, 0);
  veilCache.set(subject.state, c);
  return c;
}

/** The printed face's ink at one turn, as cells in the sheet's own orientation. */
function sheetInk(paper: PaperDesign, turns: number, n: number): Uint8Array {
  const c = canvas(n), ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.translate(n / 2, n / 2); ctx.rotate(turns * Math.PI / 2);
  ctx.drawImage(faceInk(paper, turns).masks.front, -n / 2, -n / 2, n, n);
  const d = pixels(c), ink = new Uint8Array(n * n);
  for (let o = 0; o < n * n; o++) ink[o] = d[o * 4] > 127 ? 1 : 0;
  return ink;
}

export interface FoundStart {
  start: StartingPoint;
  label: string;
  /** share of the printed face's ink that stays visible on the finished front */
  captured: number;
  /** -1 all of that ink on the left, +1 all on the right */
  balance: number;
  /** +1 all of it in the upper half, -1 all in the lower half */
  lift: number;
}

/** How much of the print a placement keeps in view. Sliding moves the ink across the sheet map. */
function landing(map: SheetMap, ink: Uint8Array, total: number, x: number, y: number) {
  const n = map.n, dx = Math.round(x * n), dy = Math.round(-y * n);
  let kept = 0, sx = 0, sy = 0;
  for (let j = Math.max(0, dy); j < Math.min(n, n + dy); j++) for (let i = Math.max(0, dx); i < Math.min(n, n + dx); i++) {
    const o = j * n + i;
    if (!map.lit[o] || !ink[o - dy * n - dx]) continue;
    kept++; sx += map.side[o]; sy += map.rise[o];
  }
  return { captured: total ? kept / total : 0, balance: kept ? sx / kept : 0, lift: kept ? sy / kept : 0 };
}

/**
 * Placements worth offering for one paper on one piece: the four turns as
 * drawn, and for a sparse print that slides, the position that keeps the most
 * of it and the most centred position that keeps nearly as much.
 */
export function findStarts(subject: Subject, paper: PaperDesign): FoundStart[] {
  const names = ['As drawn', 'One turn', 'Two turns', 'Three turns'];
  const map = sheetMap(subject), inks = [0, 1, 2, 3].map(t => sheetInk(paper, t, map.n));
  const totals = inks.map(ink => ink.reduce((a, b) => a + b, 0));
  const out: FoundStart[] = inks.map((ink, t) => ({ start: { turns: t, x: 0, y: 0 }, label: names[t], ...landing(map, ink, totals[t], 0, 0) }));
  const p = paper.placement;
  if (p?.kind !== 'slide' || totals[0] > .25 * map.n * map.n) return out;
  const steps = 4, all: FoundStart[] = [];
  for (let t = 0; t < 4; t++) for (let i = -steps; i <= steps; i++) for (let j = -steps; j <= steps; j++) {
    if (!i && !j) continue;
    const pos = normalizePosition(paper, { x: i * p.limit / steps, y: j * p.limit / steps });
    all.push({ start: { turns: t, ...pos }, label: '', ...landing(map, inks[t], totals[t], pos.x, pos.y) });
  }
  const reach = (f: FoundStart) => Math.hypot(f.start.x, f.start.y);
  const most = all.reduce((a, b) => b.captured > a.captured + .02 || (Math.abs(b.captured - a.captured) <= .02 && reach(b) < reach(a)) ? b : a);
  if (most.captured < Math.max(...out.map(f => f.captured)) + .1) return out;
  out.push({ ...most, label: 'Most of the print' });
  const near = all.filter(f => f.captured >= .8 * most.captured);
  const centred = near.reduce((a, b) => Math.abs(b.balance) < Math.abs(a.balance) - .02 ? b : a);
  const same = (a: StartingPoint, b: StartingPoint) => a.turns === b.turns && Math.hypot(a.x - b.x, a.y - b.y) < p.limit / steps * 1.01;
  if (!same(centred.start, most.start) && Math.abs(centred.balance) < Math.abs(most.balance) - .25) out.push({ ...centred, label: 'Centred' });
  return out;
}
