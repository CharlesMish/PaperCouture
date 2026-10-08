import type { PaperDesign } from './types';
import { rng, solid } from './util';

const SLATE = '#506570', SAGE = '#b6bba8';

function flecks(ctx: CanvasRenderingContext2D, size: number, ground: string, ink: string) {
  solid(ctx, size, ground);
  const next = rng(331);
  ctx.fillStyle = ink;
  for (let i = 0; i < 1100; i++) {
    const x = next() * size, y = next() * size;
    const width = (.001 + next() * .0018) * size;
    ctx.fillRect(x, y, width, width * .55);
  }
}

export const slateGrain: PaperDesign = {
  id: 'slate-grain', name: 'Slate grain',
  note: 'Blue-grey with small quiet flecks and a pale sage reverse', reverse: SAGE,
  placementNote: 'Fine all-over flecks keep their authored placement. They are printed texture, not seams. Both sides turn with the paper.',
  drawFront(ctx, size) { flecks(ctx, size, SLATE, '#697d84'); },
  drawBack(ctx, size) { flecks(ctx, size, SAGE, '#a3aa98'); },
};
