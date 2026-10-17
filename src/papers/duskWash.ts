import type { PaperDesign } from './types';

// A continuous tonal field, deliberately without another repeat or border.
// These are printed colours on the existing flat sheet, not wet-paper physics
// or shading computed from the garment. The slight diagonal makes a turn useful.
const FRONT = ['#eee5d8', '#eee5d8', '#ddd0cb', '#b59aa5', '#7d586f'] as const;
const BACK = ['#4c3c50', '#4c3c50', '#5c445c', '#805b75', '#b18498'] as const;
const STOPS = [0, .40, .60, .80, 1] as const;

function wash(ctx: CanvasRenderingContext2D, size: number, back: boolean) {
  ctx.save();
  // drawBack is seen from behind: mirror the whole gradient once, including
  // its small sideways lean, to keep the wash on the same material positions.
  if (back) { ctx.translate(size, 0); ctx.scale(-1, 1); }
  const field = ctx.createLinearGradient(.34 * size, 0, .66 * size, size);
  const colours = back ? BACK : FRONT;
  STOPS.forEach((stop, i) => field.addColorStop(stop, colours[i]));
  ctx.fillStyle = field;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
}

export const duskWash: PaperDesign = {
  id: 'dusk-wash', name: 'Dusk wash', reverse: BACK[0],
  note: 'Quiet chalk shading into dusty plum, with a dark plum reverse',
  placementNote: 'A fixed colour wash on the original square. Both faces carry the same gently slanted transition; turn the paper to move the darker field. Folds can hide or reflect parts of it.',
  drawFront(ctx, size) { wash(ctx, size, false); },
  drawBack(ctx, size) { wash(ctx, size, true); },
};
