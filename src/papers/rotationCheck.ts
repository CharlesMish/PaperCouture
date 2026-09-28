import { PaperDesign } from './types';

// Dev-only sheet for checking that a quarter turn moves both printed sides
// together. Not listed in the swatch row. Load with ?paper=rotation-check.
//
// Marks are placed in material coordinates (x right, y toward the far edge,
// each in [-1, 1]). The same material point is used on both faces, so the
// red corner on the reverse is physically behind the red corner on the front,
// and the reverse arrow lies on the same segment as the front arrow.
// drawBack still follows the usual convention: canvas top-left is material (1, 1).

const FRONT = '#f3ecdf';
const BACK = '#1c3148';

const CORNERS: { letter: string; fill: string; ink: string; x0: number; y0: number; x1: number; y1: number }[] = [
  { letter: 'R', fill: '#d23b2e', ink: '#fff8f2', x0: -1, y0: 0.6, x1: -0.6, y1: 1 },
  { letter: 'B', fill: '#2458c4', ink: '#f3f7ff', x0: 0.6, y0: 0.6, x1: 1, y1: 1 },
  { letter: 'G', fill: '#1c8a48', ink: '#f3fff6', x0: -1, y0: -1, x1: -0.6, y1: -0.6 },
  { letter: 'A', fill: '#e2a31a', ink: '#2a2114', x0: 0.6, y0: -1, x1: 1, y1: -0.6 },
];

// Off centre, pointing toward the red corner. Not symmetric under a half turn.
const ARROW_TAIL = { x: 0.46, y: -0.42 };
const ARROW_HEAD = { x: -0.28, y: 0.55 };

function canvasPoint(x: number, y: number, size: number, back: boolean): [number, number] {
  const u = (x + 1) / 2;
  const v = (y + 1) / 2;
  return [(back ? 1 - u : u) * size, (1 - v) * size];
}

function fillMaterialRect(
  ctx: CanvasRenderingContext2D,
  size: number,
  back: boolean,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  fill: string,
) {
  const [ax, ay] = canvasPoint(x0, y0, size, back);
  const [bx, by] = canvasPoint(x1, y1, size, back);
  ctx.fillStyle = fill;
  ctx.fillRect(Math.min(ax, bx), Math.min(ay, by), Math.abs(bx - ax), Math.abs(by - ay));
}

function drawArrow(ctx: CanvasRenderingContext2D, size: number, back: boolean) {
  const [x0, y0] = canvasPoint(ARROW_TAIL.x, ARROW_TAIL.y, size, back);
  const [x1, y1] = canvasPoint(ARROW_HEAD.x, ARROW_HEAD.y, size, back);
  const ang = Math.atan2(y1 - y0, x1 - x0);
  const head = size * 0.11;
  const spread = 0.42;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#fffaf3';
  ctx.lineWidth = size * 0.055;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = '#1a120c';
  ctx.lineWidth = size * 0.03;
  ctx.stroke();
  ctx.fillStyle = '#1a120c';
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(ang - spread), y1 - head * Math.sin(ang - spread));
  ctx.lineTo(x1 - head * Math.cos(ang + spread), y1 - head * Math.sin(ang + spread));
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fffaf3';
  ctx.lineWidth = size * 0.012;
  ctx.stroke();
  // tail dot, so the direction stays obvious when the head is small on screen
  ctx.fillStyle = '#1a120c';
  ctx.beginPath();
  ctx.arc(x0, y0, size * 0.028, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fffaf3';
  ctx.lineWidth = size * 0.01;
  ctx.stroke();
}

function draw(ctx: CanvasRenderingContext2D, size: number, back: boolean) {
  ctx.fillStyle = back ? BACK : FRONT;
  ctx.fillRect(0, 0, size, size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(size * 0.16)}px sans-serif`;
  for (const c of CORNERS) {
    fillMaterialRect(ctx, size, back, c.x0, c.y0, c.x1, c.y1, c.fill);
    const [tx, ty] = canvasPoint((c.x0 + c.x1) / 2, (c.y0 + c.y1) / 2, size, back);
    ctx.fillStyle = c.ink;
    ctx.fillText(c.letter, tx, ty);
  }
  drawArrow(ctx, size, back);
}

export const rotationCheckPaper: PaperDesign = {
  id: 'rotation-check',
  name: 'Rotation check',
  note: 'Corner letters and an arrow on both sides, for the turn check',
  reverse: BACK,
  hidden: true,
  drawFront(ctx, size) {
    draw(ctx, size, false);
  },
  drawBack(ctx, size) {
    draw(ctx, size, true);
  },
};
