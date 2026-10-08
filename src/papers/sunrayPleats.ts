import { SIDE_APEX_Y, SIDE_HALF_ANGLE } from './dressMarks';
import { PaperDesign } from './types';
import { solid } from './util';

// Sunray pleats drawn for this dress. Every pleat is a ray from the point where
// the two side creases meet above the sheet, and the outermost valleys on the
// front are those creases, so at 0° the pleats run parallel to the sides of the
// dress and the front holds a whole number of them. The hem is a band between
// circles round the same point. Because each side fold is a reflection through
// that point, the pleats and hem on the flaps land lined up on the back, and
// the reverse carries the same gold rule at the same radius: the rule runs
// round the whole hem, across both side panels and the plain back.
//
// Turning the paper moves the whole drawing off the creases, so only 0° lines
// up. It is drawn for the Classic A-line dress shape; the Straight and Wide
// flare shapes move the side creases off it.

const LIGHT = '#f6ded4';
const SHADE = '#e6b5a7';
const VALLEY = '#a2675a';
const TEAL = '#174a56';
const GOLD = '#cfa64e';

/** Pleats across the front of the dress, between the two side creases. */
const FRONT_PLEATS = 9;
const PLEAT = (2 * SIDE_HALF_ANGLE) / FRONT_PLEATS;

/** Hem band and its gold rule, as distances from the apex in sheet units. */
const BAND_FROM = 4.43;
const RULE_AT = 4.48;
const RULE_WIDTH = 0.012;

function apex(S: number) {
  // canvas y grows downward; sheet y = 1 is canvas 0
  return { x: S / 2, y: ((1 - SIDE_APEX_Y) / 2) * S, unit: S / 2 };
}

function wedge(ctx: CanvasRenderingContext2D, ax: number, ay: number, reach: number, a0: number, a1: number) {
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(ax + reach * Math.sin(a0), ay + reach * Math.cos(a0));
  ctx.lineTo(ax + reach * Math.sin(a1), ay + reach * Math.cos(a1));
  ctx.closePath();
  ctx.fill();
}

function goldRule(ctx: CanvasRenderingContext2D, S: number) {
  const a = apex(S);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = RULE_WIDTH * a.unit;
  ctx.beginPath();
  ctx.arc(a.x, a.y, RULE_AT * a.unit, 0, Math.PI);
  ctx.stroke();
}

export const sunrayPleats: PaperDesign = {
  id: 'sunray-pleats',
  name: 'Sunray pleats',
  note: 'Pleats cut to the classic A-line dress folds; the hem meets at the back',
  reverse: TEAL,
  drawFront(ctx, S) {
    solid(ctx, S, LIGHT);
    const a = apex(S);
    const reach = 6 * a.unit;
    // Light falls from the left: each pleat is a light face then a shaded one.
    // Pleat k is centred on angle k * PLEAT; the side creases sit at ±FRONT_PLEATS/2.
    const n = Math.ceil(0.5 / PLEAT) + 1;
    ctx.fillStyle = SHADE;
    for (let k = -n; k <= n; k++) wedge(ctx, a.x, a.y, reach, k * PLEAT, (k + 0.5) * PLEAT);
    ctx.strokeStyle = VALLEY;
    ctx.lineWidth = S * 0.0022;
    for (let k = -n; k <= n; k++) {
      const t = (k + 0.5) * PLEAT;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(a.x + reach * Math.sin(t), a.y + reach * Math.cos(t));
      ctx.stroke();
    }
    // hem band: everything beyond one circle round the apex
    ctx.fillStyle = TEAL;
    ctx.beginPath();
    ctx.rect(0, 0, S, S);
    ctx.arc(a.x, a.y, BAND_FROM * a.unit, 0, Math.PI * 2);
    ctx.fill('evenodd');
    goldRule(ctx, S);
  },
  drawBack(ctx, S) {
    // Plain teal: the collar and sleeves are this side. The rule sits where the
    // back of the hem lands; the apex is on the centre line, so drawing it from
    // behind needs no mirroring.
    solid(ctx, S, TEAL);
    goldRule(ctx, S);
  },
};
