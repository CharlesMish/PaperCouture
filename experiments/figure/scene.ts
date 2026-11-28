// Drawing for the figure study: folded pieces from the fold engine laid over cut
// shapes (head, hair, feet) on one canvas, in centimetres.
import type { SheetState } from '../../src/fold/engine';
import { modelPoly } from '../../src/fold/engine';
import { Vec2, signedArea } from '../../src/fold/geometry';
import { GarmentId, buildGarment, garmentDisplayAngle } from '../../src/fold/garments';
import { DEFAULT_OPTIONS, GarmentOptions } from '../../src/fold/garmentOptions';
import { buildObi } from '../../src/fold/obi';
import { findPaper } from '../../src/papers';
import { FlatFrame, drawFinished, finishedState, fitFrame, paperFaces } from '../../src/render/flatPreview';
import { BODY, SQUARES, sleeve, wornBody } from './parts';

const SPRITE = 720;
export interface Sprite { canvas: HTMLCanvasElement; frame: FlatFrame; box: { lx: number; hx: number; ly: number; hy: number } }

const states = new Map<string, SheetState>();
function stateOf(key: string, build: () => SheetState) { let s = states.get(key); if (!s) states.set(key, s = build()); return s; }
export const STATES = {
  body: (lean = BODY.lean) => stateOf('body' + lean, () => finishedState(wornBody({ ...BODY, lean }))),
  sleeve: (side: 'left' | 'right') => stateOf('sleeve-' + side, () => finishedState(sleeve(side))),
  obi: () => stateOf('obi', () => finishedState(buildObi())),
  garment: (id: GarmentId, options: Partial<GarmentOptions> = {}) => stateOf(id + JSON.stringify(options), () => finishedState(buildGarment(id, { ...DEFAULT_OPTIONS, ...options }))),
};

const inside = (poly: Vec2[], p: Vec2) => {
  const ccw = signedArea(poly) < 0 ? poly.slice().reverse() : poly;
  return ccw.every((a, i) => { const b = ccw[(i + 1) % ccw.length]; return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-10; });
};
/** The rank of the layer seen at a model point: everything above it lies in front of that layer. */
export function rankAt(state: SheetState, p: Vec2) {
  return Math.max(-Infinity, ...state.facets.filter(f => inside(modelPoly(f), p)).map(f => f.rank));
}

const faceCache = new Map<string, ReturnType<typeof paperFaces>>();
/** A paper's two faces, painted once per turn. Some papers take a moment to draw. */
function faces(paperId: string, turns: number) {
  const key = `${paperId}|${turns}`;
  let f = faceCache.get(key);
  if (!f) { faceCache.set(key, f = paperFaces(findPaper(paperId), turns, undefined, 512)); if (faceCache.size > 24) faceCache.delete(faceCache.keys().next().value!); }
  return f;
}
const cache = new Map<string, Sprite>();
/** One folded piece drawn flat on its own canvas. `keep` chooses which layers to draw. */
export function sprite(key: string, state: SheetState, paperId: string, turns = 0, keep?: (rank: number) => boolean, angle = 0): Sprite {
  const id = `${key}|${paperId}|${turns}|${keep ? keep.toString() + key : ''}`;
  let s = cache.get(id);
  if (s) return s;
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = SPRITE;
  const frame = fitFrame(state, SPRITE, 'front', angle, .04);
  const shown = keep ? { ...state, facets: state.facets.filter(f => keep(f.rank)) } : state;
  drawFinished(canvas.getContext('2d')!, shown, faces(paperId, turns), turns, { frame, angle });
  const pts = state.facets.flatMap(f => modelPoly(f)), c = Math.cos(angle), sn = Math.sin(angle);
  const xs = pts.map(p => p.x * c - p.y * sn), ys = pts.map(p => p.x * sn + p.y * c);
  s = { canvas, frame, box: { lx: Math.min(...xs), hx: Math.max(...xs), ly: Math.min(...ys), hy: Math.max(...ys) } };
  cache.set(id, s);
  if (cache.size > 160) cache.delete(cache.keys().next().value!);
  return s;
}

export interface Board { ctx: CanvasRenderingContext2D; px: number /* pixels per cm */ }
export interface Place {
  /** where the anchor goes on the board, in cm */
  x: number; y: number;
  /** the folded square's side in cm (the sheet is 2 model units) */
  square: number;
  /** degrees, clockwise */
  rot?: number;
  /** the piece's own point that sits at x, y, in model units (after the piece's display angle) */
  anchor: [number, number];
  shadow?: boolean;
}
export function place(b: Board, s: Sprite, p: Place) {
  const { ctx, px } = b, k = (px * p.square / 2) / s.frame.scale;
  const ax = SPRITE / 2 + (p.anchor[0] - s.frame.cx) * s.frame.scale, ay = SPRITE / 2 - (p.anchor[1] - s.frame.cy) * s.frame.scale;
  ctx.save();
  ctx.translate(p.x * px, p.y * px); ctx.rotate((p.rot ?? 0) * Math.PI / 180); ctx.scale(k, k);
  if (p.shadow !== false) { ctx.shadowColor = 'rgba(38,28,18,.32)'; ctx.shadowBlur = px * .16; ctx.shadowOffsetX = px * .03; ctx.shadowOffsetY = px * .07; }
  ctx.drawImage(s.canvas, -ax, -ay);
  ctx.restore();
}
/** A cut shape (card or plain paper): a path in cm around the origin, placed and turned. */
export function cut(b: Board, x: number, y: number, rot: number, fill: string, path: (ctx: CanvasRenderingContext2D) => void, edge = 'rgba(48,43,38,.28)') {
  const { ctx, px } = b;
  ctx.save();
  ctx.translate(x * px, y * px); ctx.rotate(rot * Math.PI / 180); ctx.scale(px, px);
  ctx.shadowColor = 'rgba(38,28,18,.3)'; ctx.shadowBlur = px * .14; ctx.shadowOffsetY = px * .06;
  ctx.beginPath(); path(ctx); ctx.fillStyle = fill; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.lineWidth = .025; ctx.strokeStyle = edge; ctx.stroke();
  ctx.restore();
}

export type Hair = 'bob' | 'bun' | 'long';
export interface Head { x: number; y: number; tilt: number; hair: Hair; r?: number }
const CARD = '#f6f1e7', INK = '#1f1c20';
/** The hair that sits behind the head. Drawn before the clothes. */
export function hairBack(b: Board, h: Head) {
  const r = h.r ?? 1.2;
  cut(b, h.x, h.y, h.tilt, INK, ctx => {
    if (h.hair === 'long') { ctx.moveTo(-r * 1.12, -r * .3); ctx.quadraticCurveTo(-r * 1.2, -r * 1.3, 0, -r * 1.28); ctx.quadraticCurveTo(r * 1.2, -r * 1.3, r * 1.12, -r * .3); ctx.lineTo(r * 1.3, r * 4.4); ctx.lineTo(-r * 1.3, r * 4.4); ctx.closePath(); }
    else if (h.hair === 'bun') { ctx.ellipse(0, -r * .2, r * 1.5, r * 1.02, 0, 0, Math.PI * 2); ctx.moveTo(r * .62, -r * 1.42); ctx.ellipse(0, -r * 1.42, r * .62, r * .5, 0, 0, Math.PI * 2); }
    else { ctx.moveTo(-r * 1.16, r * 1.02); ctx.lineTo(-r * 1.16, -r * .3); ctx.quadraticCurveTo(-r * 1.2, -r * 1.3, 0, -r * 1.3); ctx.quadraticCurveTo(r * 1.2, -r * 1.3, r * 1.16, -r * .3); ctx.lineTo(r * 1.16, r * 1.02); ctx.closePath(); }
  });
}
/** Neck first (it goes inside the collar), then the face and the fringe. */
export function neck(b: Board, h: Head, toY: number) {
  const r = h.r ?? 1.2;
  cut(b, h.x, h.y, h.tilt * .35, CARD, ctx => { ctx.rect(-r * .27, r * .5, r * .54, (toY - h.y) - r * .5); });
}
export function face(b: Board, h: Head) {
  const r = h.r ?? 1.2;
  cut(b, h.x, h.y, h.tilt, CARD, ctx => { ctx.ellipse(0, 0, r * .96, r, 0, 0, Math.PI * 2); });
  cut(b, h.x, h.y, h.tilt, INK, ctx => {
    if (h.hair === 'bun') { ctx.moveTo(-r * 1.0, -r * .28); ctx.quadraticCurveTo(-r * .5, -r * 1.25, 0, -r * 1.12); ctx.quadraticCurveTo(r * .5, -r * 1.25, r * 1.0, -r * .28); ctx.quadraticCurveTo(r * .45, -r * .78, 0, -r * .58); ctx.quadraticCurveTo(-r * .45, -r * .78, -r * 1.0, -r * .28); }
    else { ctx.moveTo(-r * 1.0, -r * .22); ctx.quadraticCurveTo(-r * 1.02, -r * 1.14, 0, -r * 1.12); ctx.quadraticCurveTo(r * 1.02, -r * 1.14, r * 1.0, -r * .22); ctx.closePath(); }
  });
}
export function foot(b: Board, x: number, y: number, rot: number) {
  cut(b, x, y, rot, CARD, ctx => { ctx.moveTo(-.42, 0); ctx.lineTo(-.42, .6); ctx.quadraticCurveTo(-.42, 1.02, 0, 1.02); ctx.quadraticCurveTo(.42, 1.02, .42, .6); ctx.lineTo(.42, 0); ctx.closePath(); });
  const { ctx, px } = b; // the thong of a sandal, drawn on
  ctx.save(); ctx.translate(x * px, y * px); ctx.rotate(rot * Math.PI / 180); ctx.scale(px, px);
  ctx.strokeStyle = '#8c2f2a'; ctx.lineWidth = .09; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-.3, .5); ctx.lineTo(0, .88); ctx.lineTo(.3, .5); ctx.stroke(); ctx.restore();
}

/** One arm. `raise` is degrees above a level arm (negative droops). `across` brings the arm over the body instead of out to the side. */
export interface Arm { raise: number; across?: boolean; /** out to the side, but lying over the body rather than behind it */ front?: boolean }
export interface Pose { name: string; lean: number; head: number; left: Arm; right: Arm; fan?: 'left' | 'right' }
export const POSES: Pose[] = [
  { name: 'Standing', lean: 0, head: 0, left: { raise: -5 }, right: { raise: -5 } },
  { name: 'Greeting', lean: 3, head: 9, left: { raise: -4 }, right: { raise: 52 } },
  { name: 'With a fan', lean: -2, head: -7, left: { raise: -8 }, right: { raise: -38, across: true }, fan: 'right' },
  { name: 'Bowing', lean: 9, head: 14, left: { raise: 14 }, right: { raise: -6, front: true } },
];
/** The same pose facing the other way. Only the pose turns: the collar never does, because a kimono always closes the same way. */
export const facing = (p: Pose): Pose => ({ ...p, lean: -p.lean, head: -p.head, left: p.right, right: p.left, fan: p.fan ? (p.fan === 'left' ? 'right' : 'left') : undefined });

export type Outfit = 'kimono' | 'saturday';
export interface Dress {
  outfit?: Outfit; paper: string; turns: number; obiPaper: string; hair: Hair; pose: Pose;
  /** how far the kimono's fronts lean, in degrees */
  lean?: number;
  /** a cut card hand at the end of each arm */
  hands?: boolean;
  /** how far the sleeve root is tucked behind the body, in cm. The first study used 0.95. */
  tuck?: number;
}
export const SHOULDER_TUCK = 1.75;

function hand(b: Board, x: number, y: number, rot: number, length = .75, width = .5) {
  cut(b, x, y, rot, CARD, ctx => { ctx.moveTo(0, -width / 2); ctx.lineTo(length - width / 2, -width / 2); ctx.arc(length - width / 2, 0, width / 2, -Math.PI / 2, Math.PI / 2); ctx.lineTo(0, width / 2); ctx.closePath(); });
}
function fanAt(b: Board, x: number, y: number, rot: number, paper: string) {
  const f = sprite('sensu', STATES.garment('sensu'), paper, 2, undefined, garmentDisplayAngle('sensu'));
  place(b, f, { x, y, square: 5.2, rot, anchor: [(f.box.lx + f.box.hx) / 2, f.box.ly + .06] });
}
/** Turn the whole figure about its neck, so a lean keeps the head where it was pinned. */
function leaning(b: Board, x: number, y: number, deg: number, draw: () => void) {
  const { ctx, px } = b;
  ctx.save(); ctx.translate(x * px, y * px); ctx.rotate(deg * Math.PI / 180); ctx.translate(-x * px, -y * px);
  draw(); ctx.restore();
}

/** The assembled figure in a worn kimono, with its neck at x, y. About 16 cm from crown to sole. */
export function wornFigure(b: Board, x: number, y: number, d: Dress) {
  const lean = d.lean ?? BODY.lean, body = STATES.body(lean), top = 1 - BODY.collar, SQ = SQUARES.body, u = SQ / 2;
  const tuck = d.tuck ?? SHOULDER_TUCK, W = SQUARES.sleeve / 2;
  leaning(b, x, y, d.pose.lean, () => {
    const head: Head = { x: x + Math.sin(d.pose.head * Math.PI / 180) * 1.0, y: y - 1.75, tilt: d.pose.head, hair: d.hair };
    const split = rankAt(body, { x: 0, y: top - .08 }), hemY = y + (top + 1) * u;
    /**
     * A sleeve hangs from its top edge, which is the line of the arm. Out to the side, the root is tucked
     * behind the body and the sleeve is drawn before it. Across, it starts at the outer shoulder and lies in front.
     */
    const arm = (side: 'left' | 'right', a: Arm) => {
      const s = side === 'left' ? -1 : 1, across = !!a.across;
      // Across the body the sleeve points the other way, so it is the other sleeve's fold.
      const sp = sprite('sleeve-' + (across ? (side === 'left' ? 'right' : 'left') : side), STATES.sleeve(across ? (side === 'left' ? 'right' : 'left') : side), d.paper, d.turns);
      const out = across ? -s : s; // which way the arm runs from the shoulder
      // The first study put the root .95 cm in and .3 cm down; it is kept only for the comparison in Trial 3.
      const root = a.front ? .95 : tuck;
      const px0 = across ? x + s * (BODY.half * u - .35) : x + s * (BODY.half * u - root), py0 = y + (across ? .5 : root < 1 ? .3 : .55);
      const rot = -out * a.raise; // clockwise degrees: a raised arm on the right turns anticlockwise
      place(b, sp, { x: px0, y: py0, square: SQUARES.sleeve, rot, anchor: [out > 0 ? sp.box.lx : sp.box.hx, sp.box.hy] });
      const r = rot * Math.PI / 180, ex = out * (W - .05), ey = .42; // the wrist, just inside the sleeve's far top corner
      const wx = px0 + ex * Math.cos(r) - ey * Math.sin(r), wy = py0 + ex * Math.sin(r) + ey * Math.cos(r);
      return () => {
        if (d.pose.fan === side) fanAt(b, wx, wy, out > 0 ? rot + 30 : rot - 30, d.obiPaper);
        if (d.hands) hand(b, wx - out * .15 * Math.cos(r), wy - out * .15 * Math.sin(r), out > 0 ? rot : rot + 180);
      };
    };
    hairBack(b, head);
    foot(b, x - .75, hemY - .45, 6); foot(b, x + .75, hemY - .45, -6);
    const after: (() => void)[] = [];
    for (const side of ['left', 'right'] as const) if (!d.pose[side].across && !d.pose[side].front) arm(side, d.pose[side])();
    place(b, sprite('body-under' + lean, body, d.paper, d.turns, r => r <= split), { x, y, square: SQ, anchor: [0, top] });
    neck(b, head, y + 1.1);
    place(b, sprite('body-over' + lean, body, d.paper, d.turns, r => r > split), { x, y, square: SQ, anchor: [0, top] });
    place(b, sprite('obi', STATES.obi(), d.obiPaper, 0), { x, y: y + 3.5, square: SQUARES.obi, anchor: [0, 0] });
    for (const side of ['left', 'right'] as const) if (d.pose[side].across || d.pose[side].front) after.push(arm(side, d.pose[side]));
    for (const h of after) h();
    face(b, head);
  });
}

/** The studio's kimono as it is, with the same head: the kimono laid flat, not worn. */
export function flatKimonoFigure(b: Board, x: number, y: number, d: Dress) {
  const k = sprite('kimono', STATES.garment('kimono'), d.paper, d.turns), head: Head = { x, y: y - 1.75, tilt: 0, hair: d.hair };
  hairBack(b, head); neck(b, head, y + .9);
  place(b, k, { x, y, square: 15, anchor: [0, k.box.hy] });
  place(b, sprite('obi', STATES.obi(), d.obiPaper, 0), { x, y: y + (k.box.hy - (k.box.hy + k.box.ly) / 2 + .1) * 7.5, square: 15 * .33, anchor: [0, 0] });
  face(b, head);
}

/**
 * The same head with the camp-collar shirt and deep pleated skirt of Fish Market Saturday.
 * The shirt's sleeves are part of its fold, so the arms are cut card: `raise` 0 hangs, 90 is level, 150 waves.
 */
export function westernFigure(b: Board, x: number, y: number, d: Pick<Dress, 'hair' | 'paper' | 'pose' | 'hands'>) {
  const shirt = sprite('camp-shirt', STATES.garment('camp-shirt'), d.paper, 0), skirt = sprite('pleats-deep', STATES.garment('pleats', { pleatDepth: 'deep' }), d.paper, 1);
  const SHIRT = 9.4, SKIRT = 10.4, u = SHIRT / 2;
  leaning(b, x, y, d.pose.lean, () => {
    const head: Head = { x: x + Math.sin(d.pose.head * Math.PI / 180) * 1.0, y: y - 1.75, tilt: d.pose.head, hair: d.hair };
    const shirtH = (shirt.box.hy - shirt.box.ly) * u, skirtH = (skirt.box.hy - skirt.box.ly) * SKIRT / 2, top = y - .35;
    hairBack(b, head);
    foot(b, x - .8, y + shirtH + skirtH - 1.5, 5); foot(b, x + .8, y + shirtH + skirtH - 1.5, -5);
    if (d.hands) for (const side of ['left', 'right'] as const) {
      // From the sleeve's hem: a forearm and hand in one piece of card.
      const s = side === 'left' ? -1 : 1, a = d.pose[side].raise;
      hand(b, x + s * .64 * u, top + (shirt.box.hy - .42) * u, s > 0 ? 90 - a : 90 + a, 3.1, .62);
    }
    place(b, skirt, { x, y: y + shirtH - .9, square: SKIRT, anchor: [(skirt.box.lx + skirt.box.hx) / 2, skirt.box.hy] });
    neck(b, head, y + .9);
    place(b, shirt, { x, y: top, square: SHIRT, anchor: [(shirt.box.lx + shirt.box.hx) / 2, shirt.box.hy] });
    face(b, head);
  });
}

/** Either outfit, by name. */
export function figure(b: Board, x: number, y: number, d: Dress) {
  if (d.outfit === 'saturday') westernFigure(b, x, y, d); else wornFigure(b, x, y, d);
}
