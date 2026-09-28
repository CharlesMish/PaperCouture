import { PaperDesign } from './types';
import { solid } from './util';

// A handful of large angular fields, weighted off centre. Turning the sheet
// moves the terracotta mass from the skirt onto a side. Gutters of the ground
// colour keep the pieces separate.

const GROUND = '#f3ebe1';
const TERRACOTTA = '#c45c38';
const ROSE = '#d07b84';
const INK = '#1e2836';
const OXBLOOD = '#8c3a46';
const REVERSE = '#1c2633';

function poly(ctx: CanvasRenderingContext2D, S: number, colour: string, pts: [number, number][]) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(S * pts[0][0], S * pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(S * pts[i][0], S * pts[i][1]);
  ctx.closePath();
  ctx.fill();
}

export const cutPaperMosaic: PaperDesign = {
  id: 'cut-paper-mosaic',
  name: 'Cut-paper mosaic',
  note: 'A few large angular fields, set off centre',
  reverse: REVERSE,
  drawFront(ctx, S) {
    solid(ctx, S, GROUND);
    poly(ctx, S, TERRACOTTA, [
      [0, 0.48],
      [0.56, 0.38],
      [0.66, 0.9],
      [0, 1],
    ]);
    poly(ctx, S, ROSE, [
      [0.44, 0],
      [1, 0],
      [1, 0.4],
      [0.54, 0.26],
      [0.38, 0.06],
    ]);
    poly(ctx, S, INK, [
      [0, 0],
      [0.32, 0],
      [0.2, 0.4],
      [0, 0.2],
    ]);
    poly(ctx, S, OXBLOOD, [
      [0.74, 0.54],
      [1, 0.46],
      [1, 1],
      [0.68, 0.96],
    ]);
  },
  drawBack(ctx, S) {
    solid(ctx, S, REVERSE);
  },
};
