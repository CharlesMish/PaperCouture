import type { PaperDesign } from './types';
import { solid } from './util';

const BLUE = '#3f626b', CHALK = '#e9e1cc', CLAY = '#a95d47';

/** A printed running-stitch grid; no simulated thread or geometry change. */
export const runningStitch: PaperDesign = {
  id: 'running-stitch', name: 'Running stitch',
  note: 'Cream dash squares on blue-grey, with a quiet clay reverse', reverse: CLAY,
  placementNote: 'The dash squares keep their authored spacing. Turn the paper to change their direction; these are printed marks, not sewn seams.',
  drawFront(ctx, S) {
    solid(ctx, S, BLUE);
    ctx.strokeStyle = CHALK; ctx.lineWidth = S * .0027;
    ctx.setLineDash([S * .011, S * .009]);
    for (let y = -.05; y < 1.1; y += .13) for (let x = -.05; x < 1.1; x += .13) {
      ctx.strokeRect(x * S, y * S, .097 * S, .097 * S);
    }
    ctx.setLineDash([]);
  },
  drawBack(ctx, S) {
    solid(ctx, S, CLAY);
    ctx.fillStyle = CHALK;
    for (let y = .04; y < 1; y += .08) for (let x = .04; x < 1; x += .08) {
      ctx.fillRect(x * S, y * S, .012 * S, .0025 * S);
    }
  },
};
