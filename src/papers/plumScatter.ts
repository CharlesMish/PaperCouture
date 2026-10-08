import { PaperDesign } from './types';
import { solid } from './util';

const GROUND = '#f0d4de';
const PLUM = '#782d50';
const DEEP = '#54213e';
const LIFT = '#a04b68';
const CORAL = '#d77965';
const REVERSE = '#6a2a48';

// Each petal grows from a shared throat, widening toward an uneven rounded
// rim. Overlap comes from the silhouette rather than separate circular heads.
function petal(ctx: CanvasRenderingContext2D, angle: number, length: number,
  width: number, colour: string, lean = 0) {
  ctx.save();
  ctx.rotate(angle);
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(-width * 0.10, length * 0.04);
  ctx.bezierCurveTo(-width * 0.28, -length * 0.26,
    -width * 0.94, -length * 0.53, -width * 0.70 + lean, -length * 0.82);
  ctx.bezierCurveTo(-width * 0.52 + lean, -length * 1.08,
    width * 0.10 + lean, -length * 0.96, width * 0.28 + lean, -length * 0.98);
  ctx.bezierCurveTo(width * 0.90 + lean, -length * 1.01,
    width * 0.88, -length * 0.66, width * 0.57, -length * 0.44);
  ctx.bezierCurveTo(width * 0.31, -length * 0.23,
    width * 0.16, -length * 0.09, width * 0.10, length * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function centre(ctx: CanvasRenderingContext2D) {
  // A small fan of stamens joins the petals without becoming a glossy dot.
  ctx.strokeStyle = CORAL;
  ctx.lineWidth = 0.0028;
  ctx.lineCap = 'round';
  const tips = [[-0.019, -0.019], [-0.007, -0.027], [0.009, -0.023],
    [0.020, -0.008], [0.012, 0.011]];
  for (const [x, y] of tips) {
    ctx.beginPath();
    ctx.moveTo(0.001, 0.004);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = '#efb78d';
    ctx.beginPath();
    ctx.ellipse(x, y, 0.0038, 0.0028, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function blossom(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  petal(ctx, -0.30, 0.103, 0.066, PLUM, -0.004);
  petal(ctx, 1.05, 0.091, 0.063, DEEP, 0.006);
  petal(ctx, 4.88, 0.094, 0.068, '#8d3b5c', -0.004);
  petal(ctx, 3.64, 0.086, 0.064, PLUM, 0.005);
  petal(ctx, 2.30, 0.083, 0.069, LIFT, -0.006);
  centre(ctx);
  ctx.restore();
}

function bud(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.35);
  petal(ctx, -0.22, 0.040, 0.019, DEEP);
  petal(ctx, 0.20, 0.034, 0.019, PLUM, 0.003);
  ctx.strokeStyle = CORAL;
  ctx.lineWidth = 0.002;
  ctx.beginPath();
  ctx.moveTo(0.001, -0.005);
  ctx.quadraticCurveTo(0.008, -0.018, 0.005, -0.029);
  ctx.stroke();
  ctx.restore();
}

function halfOpen(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(0.7);
  petal(ctx, -0.58, 0.050, 0.028, DEEP, -0.002);
  petal(ctx, 0.42, 0.055, 0.033, PLUM, 0.002);
  petal(ctx, -0.08, 0.031, 0.034, LIFT, -0.002);
  ctx.restore();
}

function drawInk(ctx: CanvasRenderingContext2D, S: number) {
  ctx.save();
  ctx.scale(S, S);
  blossom(ctx, 0.40, 0.38);
  bud(ctx, 0.55, 0.54);
  halfOpen(ctx, 0.66, 0.65);
  ctx.save();
  ctx.translate(0.75, 0.75);
  petal(ctx, 0.7, 0.042, 0.024, PLUM, 0.003);
  ctx.restore();
  ctx.translate(0.67, 0.83);
  petal(ctx, 2.3, 0.034, 0.021, CORAL, -0.003);
  ctx.restore();
}

export const plumScatter: PaperDesign = {
  id: 'plum-scatter',
  name: 'Plum scatter',
  note: 'Open plum petals and a small diagonal drift on blush',
  reverse: REVERSE,
  placement: { kind: 'slide', limit: .3, frontGround: GROUND, backGround: REVERSE, front: drawInk },
  drawFront(ctx, S) {
    solid(ctx, S, GROUND);
    drawInk(ctx, S);
  },
  drawBack(ctx, S) {
    solid(ctx, S, REVERSE);
  },
};
