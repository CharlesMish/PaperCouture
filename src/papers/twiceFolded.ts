import type { PaperDesign } from './types';

// Twice folded: board-clamped resist dyeing (itajime), which is itself made by
// folding. The sheet is imagined pleated into a stack of right triangles,
// clamped, and dipped: one corner of the stack in indigo, the opposite corner
// in safflower red. Opened out, every fold of that first folding is a mirror
// line of the print. The app's folding is the second.
//
// Both faces are the same dye, read differently. The front is the dyer's good
// side: indigo and red on undyed paper. The reverse is the side that lay in the
// vat: indigo all over, darkest where the front is dyed, and violet where the
// red sank into the blue. The two faces agree at every sheet point. A crease
// that lies on one of the first folding's lines therefore turns the reverse
// over in register: a dip cut by the flap's edge carries on in its other
// colour, red into violet, give or take the wander of the dye.
//
// Placement was settled on folded pieces, not on the flat sheet. The red dips
// sit on the quarters of the sheet, centre and corners included, and the indigo
// blossoms on the odd eighths between them. That puts one whole blossom on each
// kimono sleeve and a red dip on a folding fan's rivet.

/** Repeats across the sheet. The first folding's lines fall on every eighth. */
export const TWICE_FOLDED_REPEATS = 4;
/** In repeats: moves the indigo corner off the sheet's centre and edges, onto the odd eighths. */
const OFFSET = 0.5;

const smooth = (a: number, b: number, t: number) => {
  const k = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

function lattice(ix: number, iy: number, seed: number): number {
  let n = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed, 1274126177);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Smooth value noise in [0, 1]; fixed, so the sheet is the same on every load. */
function noise(x: number, y: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const top = lattice(ix, iy, seed) + (lattice(ix + 1, iy, seed) - lattice(ix, iy, seed)) * sx;
  const bottom = lattice(ix, iy + 1, seed) + (lattice(ix + 1, iy + 1, seed) - lattice(ix, iy + 1, seed)) * sx;
  return top + (bottom - top) * sy;
}

/** How deep the stack went into the indigo: least at the top edge, a little askew. */
export function dipAt(x: number, y: number): number {
  return 0.36 + 0.64 * smooth(0.08, 0.92, y + (x - 0.5) * 0.2);
}

export interface Dye { indigo: number; red: number }

/**
 * Dye taken up at a sheet point, in front-canvas fractions (x right, y down).
 * `soft` is the reverse: the same dye with wider edges and fainter fold veins.
 */
export function dyeAt(x: number, y: number, soft = false): Dye {
  const a = x * TWICE_FOLDED_REPEATS + OFFSET, b = y * TWICE_FOLDED_REPEATS + OFFSET;
  // Fold the plane back into the dyer's triangle: (0,0) is the indigo corner,
  // (0.5,0.5) the red corner, and the three sides are the fold lines.
  const fa = Math.abs(a - Math.round(a)), fb = Math.abs(b - Math.round(b));
  const u = Math.max(fa, fb), v = Math.min(fa, fb);
  // Wicking is never even: the dye front wanders a little, differently in every layer.
  const wander = (noise(a * 2.3, b * 2.3, 11) - 0.5) * 0.07 + (noise(a * 9, b * 9, 23) - 0.5) * 0.025;
  const dip = dipAt(x, y);

  // Indigo corner: four blunt petals along the stack's long folds.
  const reach = 0.3 * (0.72 + 0.28 * dip);
  const r = Math.hypot(u, v) / (1 + 0.16 * Math.cos(4 * Math.atan2(v, u))) + wander;
  const edge = soft ? 0.06 : 0.035;
  // The very point of the stack is folded too tightly to take the dye fully.
  const heart = 0.62 + 0.38 * smooth(0.012, 0.075, r);
  const core = heart * (1 - 0.25 * Math.min(1, r / reach) ** 2) * (1 - smooth(reach - edge, reach + edge, r));
  const halo = 0.22 * (1 - smooth(reach, reach + 0.11, r));
  let indigo = dip * Math.max(core, halo);

  // A little dye creeps along every fold of the stack and stays as a vein,
  // stronger in some stretches than others. The reverse keeps a fainter trace.
  const line = Math.min(v, 0.5 - u, (u - v) * Math.SQRT1_2);
  const creep = (soft ? 0.09 : 0.15) * (0.55 + 0.9 * noise(a * 1.7 + 40, b * 1.7, 37));
  indigo = Math.max(indigo, creep * dip * Math.exp(-((line / (soft ? 0.016 : 0.011)) ** 2)));

  // Red corner: a small round dip with a pale fringe, not thinned by the indigo's depth.
  const rr = Math.hypot(u - 0.5, v - 0.5) + wander * 0.6;
  const spot = 1 - smooth(soft ? 0.03 : 0.055, soft ? 0.15 : 0.115, rr);
  const red = Math.max(spot, 0.25 * (1 - smooth(0.1, 0.19, rr)));
  return { indigo, red };
}

type Rgb = readonly [number, number, number];
const PAPER: Rgb = [239, 232, 216];
const INDIGO: readonly (readonly [number, Rgb])[] = [
  [0, PAPER], [0.12, [214, 224, 228]], [0.3, [160, 185, 212]], [0.55, [86, 121, 172]], [0.8, [40, 66, 122]], [1, [22, 36, 74]],
];
const RED: readonly (readonly [number, Rgb])[] = [
  [0, PAPER], [0.3, [243, 212, 202]], [0.65, [226, 134, 134]], [1, [196, 72, 92]],
];
const VAT: readonly (readonly [number, Rgb])[] = [[0, [70, 92, 142]], [0.45, [42, 60, 106]], [1, [17, 26, 56]]];
const VIOLET: Rgb = [108, 68, 134];
const REVERSE = '#3a4f82';

/** Each ramp as 256 RGB steps, so a pixel is three lookups. */
function table(stops: readonly (readonly [number, Rgb])[]): Float32Array {
  const lut = new Float32Array(256 * 3);
  for (let n = 0; n < 256; n++) {
    const t = n / 255;
    let i = 1;
    while (i < stops.length - 1 && t > stops[i][0]) i++;
    const [t0, c0] = stops[i - 1], [t1, c1] = stops[i], k = Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
    for (let c = 0; c < 3; c++) lut[n * 3 + c] = c0[c] + (c1[c] - c0[c]) * k;
  }
  return lut;
}
const INDIGO_LUT = table(INDIGO), RED_LUT = table(RED), VAT_LUT = table(VAT);

// The dye is fixed artwork: keep each face's pixels across turns and board
// restoration. Bounded; callers only copy these private pixels.
const rasters = new Map<string, ImageData>();

function dyed(ctx: CanvasRenderingContext2D, S: number, back: boolean) {
  const key = `${S}:${back ? 'back' : 'front'}`;
  let img = rasters.get(key);
  if (!img) {
    img = new ImageData(S, S);
    const data = img.data;
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      // The back canvas is seen from behind: its left edge is the sheet's right.
      const x = (px + 0.5) / S, y = (py + 0.5) / S;
      const dye = dyeAt(back ? 1 - x : x, y, back);
      const i = Math.round(Math.min(1, dye.indigo) * 255) * 3, r = Math.round(dye.red * 255) * 3, o = (py * S + px) * 4;
      for (let c = 0; c < 3; c++) {
        // Front: each dye filters the paper's own colour. Reverse: red only tints the vat blue.
        data[o + c] = back
          ? VAT_LUT[i + c] + (VIOLET[c] - VAT_LUT[i + c]) * 0.7 * dye.red
          : (INDIGO_LUT[i + c] * RED_LUT[r + c]) / PAPER[c];
      }
      data[o + 3] = 255;
    }
    if (rasters.size >= 6) rasters.delete(rasters.keys().next().value!);
    rasters.set(key, img);
  }
  ctx.putImageData(img, 0, 0);
}

export const twiceFolded: PaperDesign = {
  id: 'twice-folded',
  name: 'Twice folded',
  note: 'Fold-and-clamp indigo with a second dip of safflower red, on a vat-blue reverse',
  reverse: REVERSE,
  placementNote: 'A fixed sheet. The indigo is dipped deepest at the bottom edge at 0°; turn the paper to move the deep end. Both faces carry the same dye at every point, so the print keeps its place when the reverse turns over.',
  drawFront(ctx, size) { dyed(ctx, size, false); },
  drawBack(ctx, size) { dyed(ctx, size, true); },
};
