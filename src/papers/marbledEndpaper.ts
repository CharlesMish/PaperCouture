import type { PaperDesign } from './types';
import { rng } from './util';

// Marbled endpaper: a bookbinder's combed pattern on the face and plain laid
// paper on the reverse, as on the inside of an old book cover.
//
// The marbling is simulated the way the craft works, then rendered exactly:
// ink drops spread on the size and push earlier ink outward (an area-
// preserving map), then rakes drag everything along their strokes. Each step
// has a closed-form inverse, so a pixel is coloured by running the steps
// backwards until it lands inside a drop (or on the bare size). Nothing is
// random at draw time: the drop list comes from a fixed seed.

// The tray is first flooded with slate; gaps between drops read as fine slate veins.
const SIZE_GROUND = '#34485f';
// The last ink is the pale 'stone' drop marblers use to open up a pattern.
const INKS = ['#7b2f2c', '#d4a040', '#2e4a6b', '#55663f', '#c9803c', '#2e4a6b', '#f6f0e2'];
const LAID = '#ece4d1', LAID_LINE = 'rgba(120,100,70,0.10)', CHAIN = 'rgba(120,100,70,0.16)';

type Step =
  | { kind: 'drop'; x: number; y: number; r: number; ink: number }
  /** a rake: tines every `space` along the normal, dragging by `z`, falloff `c` */
  | { kind: 'rake'; nx: number; ny: number; space: number; offset: number; z: number; c: number };

function recipe(): Step[] {
  const random = rng(20261012);
  const steps: Step[] = [];
  // Three passes of drops across the tray (units: canvas fractions, with
  // room beyond the sheet so the edges are as full as the centre).
  // Later drops push earlier ink outward, so enough of them leave no bare size.
  for (let i = 0; i < 150; i++) {
    steps.push({ kind: 'drop', x: -0.2 + random() * 1.4, y: -0.2 + random() * 1.4, r: 0.045 + random() * 0.05, ink: i % 13 === 6 ? 6 : Math.floor(random() * 6) });
  }
  // Gel-git: a coarse rake across, then back offset by half a tine.
  steps.push({ kind: 'rake', nx: 0, ny: 1, space: 0.12, offset: 0, z: 0.08, c: 0.028 });
  steps.push({ kind: 'rake', nx: 0, ny: 1, space: 0.12, offset: 0.06, z: -0.08, c: 0.028 });
  steps.push({ kind: 'rake', nx: 1, ny: 0, space: 0.08, offset: 0.02, z: 0.045, c: 0.022 });
  steps.push({ kind: 'rake', nx: 1, ny: 0, space: 0.08, offset: 0.06, z: -0.045, c: 0.022 });
  // Nonpareil: a fine comb drawn down the tray.
  steps.push({ kind: 'rake', nx: 1, ny: 0, space: 0.024, offset: 0.004, z: 0.035, c: 0.008 });
  return steps;
}
const STEPS = recipe();

/** Ink index at a tray point (canvas fractions), or -1 for bare size. */
export function marbleAt(x: number, y: number): number {
  for (let k = STEPS.length - 1; k >= 0; k--) {
    const s = STEPS[k];
    if (s.kind === 'rake') {
      // displacement runs along the tines (perpendicular to n), so the
      // distance to the nearest tine is unchanged and the step inverts exactly
      const along = x * s.nx + y * s.ny - s.offset;
      const r = ((along % s.space) + s.space) % s.space;
      const d = Math.min(r, s.space - r);
      const shift = s.z * Math.exp(-d / s.c);
      x -= -s.ny * shift; y -= s.nx * shift;
    } else {
      const dx = x - s.x, dy = y - s.y, q = dx * dx + dy * dy, r2 = s.r * s.r;
      if (q < r2) return s.ink;
      const f = Math.sqrt(1 - r2 / q);
      x = s.x + dx * f; y = s.y + dy * f;
    }
  }
  return -1;
}

function marble(ctx: CanvasRenderingContext2D, S: number) {
  const N = Math.min(S, 512), sub = S <= 256 ? 2 : 1; // swatches need the extra samples
  const rgb = [SIZE_GROUND, ...INKS].map(c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)));
  const img = new ImageData(N, N);
  for (let py = 0; py < N; py++) for (let px = 0; px < N; px++) {
    const acc = [0, 0, 0];
    for (let a = 0; a < sub; a++) for (let b = 0; b < sub; b++) {
      const col = rgb[marbleAt((px + (a + 0.5) / sub) / N, (py + (b + 0.5) / sub) / N) + 1];
      acc[0] += col[0]; acc[1] += col[1]; acc[2] += col[2];
    }
    const o = (py * N + px) * 4;
    for (let c = 0; c < 3; c++) img.data[o + c] = Math.round(acc[c] / (sub * sub));
    img.data[o + 3] = 255;
  }
  if (N === S) { ctx.putImageData(img, 0, 0); return; }
  const tmp = document.createElement('canvas');
  tmp.width = tmp.height = N;
  tmp.getContext('2d')!.putImageData(img, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(tmp, 0, 0, S, S);
}

function laid(ctx: CanvasRenderingContext2D, S: number) {
  ctx.fillStyle = LAID;
  ctx.fillRect(0, 0, S, S);
  ctx.fillStyle = LAID_LINE;
  const step = S / 180;
  for (let y = 0; y < S; y += step) ctx.fillRect(0, y, S, Math.max(1, step * 0.28));
  ctx.fillStyle = CHAIN;
  // chain lines a little under an inch apart on a 20 cm sheet
  for (let i = 0; i <= 9; i++) ctx.fillRect(((i + 0.37) / 9.4) * S, 0, Math.max(1, S * 0.0018), S);
}

export const marbledEndpaper: PaperDesign = {
  id: 'marbled-endpaper',
  name: 'Marbled endpaper',
  note: 'Combed oxblood, ochre and slate marbling, with a plain laid-paper reverse',
  reverse: LAID,
  placementNote: 'A fixed marbled sheet. The combing runs top to bottom at 0° and across at a quarter-turn; folds cut through the veins as they would on real marbled paper.',
  drawFront: marble,
  drawBack: laid,
};
