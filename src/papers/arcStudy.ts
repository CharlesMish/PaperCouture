import type { PaperDesign } from './types';
import { solid } from './util';

const CREAM = '#eee2cb', NAVY = '#294350', RUST = '#b75d43', GOLD = '#d4ad68';

/** Finite overlapping arcs. The back mirrors the same material contours,
 * so sliding either printed side preserves registration through a fold. */
function arcs(ctx: CanvasRenderingContext2D, S: number, back = false) {
  ctx.save();
  if (back) { ctx.translate(S, 0); ctx.scale(-1, 1); }
  const circles = [[.22, .70, .29], [.56, .56, .25], [.79, .27, .20]];
  circles.forEach(([x, y, radius], i) => {
    ctx.strokeStyle = back ? [GOLD, CREAM, RUST][i] : [RUST, NAVY, GOLD][i];
    ctx.lineWidth = S * .044;
    ctx.beginPath(); ctx.arc(x * S, y * S, radius * S, -.72, Math.PI * 1.48); ctx.stroke();
    ctx.lineWidth = S * .005;
    ctx.beginPath(); ctx.arc(x * S, y * S, (radius - .047) * S, -.72, Math.PI * 1.48); ctx.stroke();
  });
  ctx.restore();
}
export const arcStudy: PaperDesign = {
  id: 'arc-study', name: 'Arc study',
  note: 'Three open arcs; their contours continue onto a dark reverse', reverse: NAVY,
  placement: { kind: 'slide', limit: .25, frontGround: CREAM, backGround: NAVY,
    front: (ctx, S) => arcs(ctx, S), back: (ctx, S) => arcs(ctx, S, true) },
  drawFront(ctx, S) { solid(ctx, S, CREAM); arcs(ctx, S); },
  drawBack(ctx, S) { solid(ctx, S, NAVY); arcs(ctx, S, true); },
};
