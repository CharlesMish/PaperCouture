import type { PaperDesign } from './types';
import { rng, solid } from './util';

const OAT = '#c9b99d', PLUM = '#665163';

/** A quiet printed texture, not a woven material or a change to paper thickness. */
function fibres(ctx: CanvasRenderingContext2D, size: number, ground: string, ink: string, seed: number) {
  solid(ctx, size, ground);
  const next = rng(seed);
  ctx.strokeStyle = ink;
  ctx.lineWidth = size * .0008;
  ctx.lineCap = 'butt';
  for (let i = 0; i < 1700; i++) {
    const x = next() * size, y = next() * size;
    const length = (.004 + next() * .012) * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    if (i % 3) ctx.lineTo(x + length, y); else ctx.lineTo(x, y + length * .6);
    ctx.stroke();
  }
}

export const oatLinen: PaperDesign = {
  id: 'oat-linen', name: 'Oat linen',
  note: 'Soft oat fibres with a muted plum reverse; a quiet outfit companion', reverse: PLUM,
  placementNote: 'This fine printed texture stays on the sheet. Turn the paper to turn both faces; its fixed fibres are not a movable motif or real woven cloth.',
  drawFront(ctx, size) { fibres(ctx, size, OAT, '#b3a58e', 217); },
  drawBack(ctx, size) { fibres(ctx, size, PLUM, '#776174', 219); },
};
