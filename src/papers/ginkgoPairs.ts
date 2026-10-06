import type { PaperDesign } from './types';
import { solid } from './util';

const CREAM = '#e7ddc9', PLUM = '#655160', SAGE = '#778272';

/** Rounded fan leaves, without arrow-like tips. Reverse contours are mirrored
 * in canvas space so they mark the same material at every turn and offset. */
function leaf(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, scale: number, colour: string) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(0, .018);
  ctx.bezierCurveTo(-.010, -.012, -.039, -.026, -.057, -.048);
  ctx.bezierCurveTo(-.063, -.057, -.054, -.065, -.043, -.063);
  ctx.bezierCurveTo(-.035, -.074, -.022, -.073, -.015, -.066);
  ctx.quadraticCurveTo(-.006, -.074, 0, -.053);
  ctx.quadraticCurveTo(.008, -.074, .018, -.066);
  ctx.bezierCurveTo(.030, -.073, .041, -.069, .045, -.063);
  ctx.bezierCurveTo(.057, -.064, .063, -.055, .057, -.048);
  ctx.bezierCurveTo(.039, -.026, .010, -.012, 0, .018);
  ctx.closePath(); ctx.fill();
  // Short rounded petiole; no pointed instruction-arrow silhouette.
  ctx.strokeStyle = colour; ctx.lineWidth = .0035; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, .008); ctx.quadraticCurveTo(.003, .026, -.002, .037); ctx.stroke();
  ctx.restore();
}

function ink(ctx: CanvasRenderingContext2D, size: number, back = false) {
  ctx.save(); ctx.scale(size, size);
  if (back) { ctx.translate(1, 0); ctx.scale(-1, 1); }
  for (const [x, y, turn, scale] of [
    [.30, .28, -.48, .82], [.60, .38, .42, .92],
    [.40, .61, -.25, 1.04], [.70, .76, .60, .85],
  ]) {
    leaf(ctx, x, y, turn, scale, back ? CREAM : PLUM);
    leaf(ctx, x + .058, y + .026, turn + .9, scale * .63, back ? '#bec4b2' : SAGE);
  }
  ctx.restore();
}

export const ginkgoPairs: PaperDesign = {
  id: 'ginkgo-pairs', name: 'Ginkgo pairs',
  note: 'Four small leaf pairs on cream; slide them onto a visible panel', reverse: PLUM,
  placement: { kind: 'slide', limit: .25, frontGround: CREAM, backGround: PLUM,
    front: (ctx, size) => ink(ctx, size), back: (ctx, size) => ink(ctx, size, true) },
  drawFront(ctx, size) { solid(ctx, size, CREAM); ink(ctx, size); },
  drawBack(ctx, size) { solid(ctx, size, PLUM); ink(ctx, size, true); },
};
