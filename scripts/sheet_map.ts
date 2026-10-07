// Where each part of the square ends up on the finished dress, for drawing
// papers. Run: npm run sheet-map  (writes docs/paper-studies/sheet-map.png)
//
// Left panel: the printed side, in drawFront's canvas orientation.
// Right panel: the reverse, in drawBack's canvas orientation (seen from behind).
// Warm = seen from the front of the dress, cool = seen from the back,
// grey = hidden inside the folds. Thin lines are the side creases.

import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { buildDress } from '../src/fold/construction';
import { isFlipped, modelPoly } from '../src/fold/engine';
import { buildTimeline } from '../src/fold/timeline';
import { Vec2, applyAffine } from '../src/fold/geometry';
import { SIDE_APEX_Y, SIDE_HALF_ANGLE } from '../src/papers/dressMarks';

const N = 480; // pixels per panel
const GAP = 24;
const W = 2 * N + GAP;

const FRONT_VIEW: [number, number, number] = [214, 104, 72];
const BACK_VIEW: [number, number, number] = [72, 116, 178];
const HIDDEN: [number, number, number] = [226, 222, 214];
const CREASE: [number, number, number] = [40, 36, 32];

const inside = (poly: Vec2[], p: Vec2) => {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const c = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (Math.abs(c) < 1e-12) continue;
    if (sign === 0) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }
  return true;
};

const tl = buildTimeline(buildDress().ops);
const final = tl.states[tl.states.length - 1];
const models = final.facets.map(modelPoly);

/** 0 hidden, 1 seen from the front of the dress, 2 seen from the back. */
function where(m: Vec2): { front: number; reverse: number } {
  const i = final.facets.findIndex((f) => inside(f.poly, m));
  const f = final.facets[i];
  const q = applyAffine(f.T, m);
  let top = true;
  let bottom = true;
  final.facets.forEach((g, j) => {
    if (j === i || !inside(models[j], q)) return;
    if (g.rank > f.rank) top = false;
    if (g.rank < f.rank) bottom = false;
  });
  // After the last turn the viewer above the table is the front of the dress.
  const up = top ? 1 : 0;
  const down = bottom ? 2 : 0;
  return isFlipped(f) ? { front: down, reverse: up } : { front: up, reverse: down };
}

const px = new Uint8Array(W * N * 3).fill(255);
const put = (x: number, y: number, c: [number, number, number]) => px.set(c, (y * W + x) * 3);
const colour = (v: number) => (v === 1 ? FRONT_VIEW : v === 2 ? BACK_VIEW : HIDDEN);
// side creases on the sheet: rays from the apex at ±SIDE_HALF_ANGLE
const onCrease = (m: Vec2) => {
  const t = Math.atan2(Math.abs(m.x), SIDE_APEX_Y - m.y);
  return Math.abs(t - SIDE_HALF_ANGLE) * (SIDE_APEX_Y - m.y) < 1.2 / N;
};

for (let j = 0; j < N; j++) {
  for (let i = 0; i < N; i++) {
    const m = { x: -1 + (2 * (i + 0.5)) / N, y: 1 - (2 * (j + 0.5)) / N };
    const w = where(m);
    const line = onCrease(m);
    put(i, j, line ? CREASE : colour(w.front));
    // drawBack's canvas is the sheet seen from behind: material x runs right to left
    put(N + GAP + (N - 1 - i), j, line ? CREASE : colour(w.reverse));
  }
}

// --- minimal PNG writer (RGB, no filtering)
const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type: string, data: Buffer) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(N, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // RGB
const raw = Buffer.alloc((W * 3 + 1) * N);
for (let y = 0; y < N; y++) Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (W * 3 + 1) + 1);
const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', deflateSync(raw)),
  chunk('IEND', Buffer.alloc(0)),
]);
const out = process.argv[2] ?? 'docs/paper-studies/sheet-map.png';
writeFileSync(out, png);
console.log(`wrote ${out}`);
