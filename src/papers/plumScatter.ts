import { PaperDesign } from './types';
import { rng, solid } from './util';

// Irregular petal marks in three sizes. Positions are authored so clusters
// have gaps between them; the largest sit in the centre panel, where the
// dress front can still show a whole mark.

const GROUND = '#f0d4de';
const PLUM = '#6e2448';
const DEEP = '#4c1834';
const CORAL = '#e36a55';
const REVERSE = '#6a2a48';

interface Mark {
  x: number;
  y: number;
  scale: number;
  rot: number;
  petals: number;
  colour: string;
  seed: number;
}

const MARKS: Mark[] = [
  { x: 0.36, y: 0.46, scale: 0.105, rot: 0.35, petals: 4, colour: PLUM, seed: 3 },
  { x: 0.66, y: 0.74, scale: 0.098, rot: 1.7, petals: 3, colour: CORAL, seed: 8 },
  { x: 0.28, y: 0.8, scale: 0.086, rot: 2.5, petals: 5, colour: DEEP, seed: 5 },
  { x: 0.54, y: 0.32, scale: 0.06, rot: 0.9, petals: 3, colour: CORAL, seed: 11 },
  { x: 0.45, y: 0.64, scale: 0.055, rot: 2.15, petals: 4, colour: PLUM, seed: 14 },
  { x: 0.6, y: 0.5, scale: 0.036, rot: 0.55, petals: 3, colour: DEEP, seed: 17 },
  { x: 0.33, y: 0.64, scale: 0.034, rot: 1.25, petals: 3, colour: CORAL, seed: 21 },
  { x: 0.7, y: 0.4, scale: 0.038, rot: 2.8, petals: 4, colour: PLUM, seed: 24 },
];

function mark(ctx: CanvasRenderingContext2D, S: number, m: Mark) {
  const rand = rng(m.seed);
  ctx.save();
  ctx.translate(S * m.x, S * m.y);
  ctx.rotate(m.rot);
  for (let i = 0; i < m.petals; i++) {
    const span = (Math.PI * 2) / m.petals;
    const wobble = (rand() - 0.5) * span * 0.45;
    const len = S * m.scale * (0.82 + rand() * 0.28);
    const wid = len * (0.38 + rand() * 0.16);
    ctx.save();
    ctx.rotate(i * span + wobble);
    ctx.fillStyle = m.colour;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(wid, -len * 0.28, wid * 0.72, -len * 0.82, 0, -len);
    ctx.bezierCurveTo(-wid * 0.48, -len * 0.7, -wid * 0.62, -len * 0.22, 0, 0);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

export const plumScatter: PaperDesign = {
  id: 'plum-scatter',
  name: 'Plum scatter',
  note: 'Irregular plum and coral petals with open ground',
  reverse: REVERSE,
  drawFront(ctx, S) {
    solid(ctx, S, GROUND);
    for (const m of MARKS) mark(ctx, S, m);
  },
  drawBack(ctx, S) {
    solid(ctx, S, REVERSE);
  },
};
