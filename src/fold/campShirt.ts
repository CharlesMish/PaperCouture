import type { Construction } from './construction';
import type { Op } from './engine';
import { v2 } from './geometry';
import { cm, lineMeet } from './measure';

type Point = [number, number];
const fold = (id: string, title: string, hint: string, a: Point, b: Point, moving: Point, only?: string): Op => ({
  kind: 'fold', id, title, hint,
  folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley', ...(only ? { only } : {}) }],
});
const turn = (id: string, title: string, hint: string): Op => ({ kind: 'turn', id, title, hint });

/** One intact square allocated to a clean front, two free sleeve corners and
 * two selected collar flaps. The initial edge turns become the real reverse
 * cuffs; the upper part of those same strips frames the short neck reveal.
 *
 * Order matters: form the collar and finish the shoulders BEFORE lifting the
 * body. The body stops below the collar tips instead of passing through them
 * to imitate a tucked/locked shirt. Sleeve hinges start at the gate seams' free
 * bottom endpoints; an interior hinge would tear their attached material.
 *
 * This is a flat garment silhouette, with continuous backing at the neck and
 * no open torso, armholes or proven lock. Rigid facets and sampled motion are
 * verified separately; they do not establish physical paper foldability.
 */
// Where the creases go (left side; the right side mirrors it). The square's side is 2.
const STRIP = .92; // cuff strips: creases this far either side of the centre line
const PANEL = .5; // long panels: creases this far either side of the centre line
const SLEEVE_TO: Point = [0, -.1]; // the sleeve crease runs from the bottom corner toward this point
const COLLAR_TO: Point = [-.08, .82]; // the collar crease runs from the top corner to this point
const SHOULDER_FROM: Point = [-.5, .62], SHOULDER_TO: Point = [-.22, 1];
const BODY_Y = -.21; // the body fold, straight across
const mirror = ([x, y]: Point): Point => [-x || 0, y];

/** Numbers for the instructions, from the same values that place the creases. */
function shirtMeasures() {
  const inner = -(2 * PANEL - STRIP); // a folded panel's inner edge, left side
  const edge = (p: Point, q: Point) => lineMeet(v2(...p), v2(q[0] - p[0], q[1] - p[1]), v2(inner, 0), v2(0, 1)).y;
  return {
    strip: 1 - STRIP,
    panel: STRIP - PANEL, // from the paper's side edge after the strips
    sleeveUp: edge([-PANEL, -1], SLEEVE_TO) + 1, // above the bottom, on the panel's inner edge
    collarDown: 1 - edge([-PANEL, 1], COLLAR_TO), // below the top, on the panel's inner edge
    shoulderDown: 1 - SHOULDER_FROM[1],
    shoulderIn: SHOULDER_TO[0] - SHOULDER_FROM[0],
    bodyUp: BODY_Y + 1,
  };
}

export function buildCampShirt(): Construction {
  const m = shirtMeasures();
  return {
    name: 'Camp-collar shirt',
    meta: { top: 1, shoulderPoint: v2(-.5, .62), sleeveCutDir: v2(1, 0) },
    ops: [
      fold('shirt-edge-left', 'Fold a narrow strip on the left edge',
        `Print side up. Fold the left edge over onto the print by ${cm(m.strip)}, all the way down. This strip becomes a cuff and the collar's edge.`,
        [-STRIP, -1.5], [-STRIP, 1.5], [-1, 0]),
      fold('shirt-edge-right', 'Fold a matching strip on the right edge',
        `Fold the right edge over onto the print by ${cm(m.strip)} in the same way.`,
        [STRIP, -1.5], [STRIP, 1.5], [1, 0]),
      turn('shirt-reverse', 'Turn the paper over',
        'Turn it over from side to side, so both strips are underneath. The other colour is up.'),
      fold('shirt-panel-left', 'Fold the left side in',
        `Fold the left side in along a crease ${cm(m.panel)} from the left edge, through all the layers. The edge stops just short of the centre line.`,
        [-PANEL, -1.5], [-PANEL, 1.5], [-1, 0]),
      fold('shirt-panel-right', 'Fold the right side in',
        `Fold the right side in along a crease ${cm(m.panel)} from the right edge, through all the layers, leaving a narrow gap between the two edges at the centre.`,
        [PANEL, -1.5], [PANEL, 1.5], [1, 0]),
      fold('shirt-sleeve-left', 'Fold the left sleeve out',
        `On the left flap only, fold the lower inner corner up and out to the left: crease from the bottom left corner to the flap's inner edge, ${cm(m.sleeveUp)} above the bottom. This corner becomes a sleeve.`,
        [-PANEL, -1], SLEEVE_TO, [0, -1], 'shirt-panel-left'),
      fold('shirt-sleeve-right', 'Fold the right sleeve out',
        `On the right flap only, fold the lower inner corner up and out to the right: crease from the bottom right corner to the flap's inner edge, ${cm(m.sleeveUp)} above the bottom.`,
        [PANEL, -1], mirror(SLEEVE_TO), [0, -1], 'shirt-panel-right'),
      fold('shirt-collar-left', 'Fold the left collar point out',
        `On the left flap only, fold the top inner corner down and out to the left: crease from the top left corner to the flap's inner edge, ${cm(m.collarDown)} below the top. It shows the other colour as a collar point.`,
        [-PANEL, 1], COLLAR_TO, [-.08, 1], 'shirt-panel-left'),
      fold('shirt-collar-right', 'Fold the right collar point out',
        `On the right flap only, fold the top inner corner down and out to the right: crease from the top right corner to the flap's inner edge, ${cm(m.collarDown)} below the top.`,
        [PANEL, 1], mirror(COLLAR_TO), [.08, 1], 'shirt-panel-right'),
      turn('shirt-shoulder-back', 'Turn the paper over',
        'Turn it over from side to side, so the collar points are underneath. The shoulders are shaped from the back.'),
      fold('shirt-shoulder-left', 'Fold the left shoulder down',
        `Fold the top left corner down along a slanting crease: from the left side ${cm(m.shoulderDown)} below the top, to the top edge ${cm(m.shoulderIn)} in from the side. Fold all the layers.`,
        SHOULDER_FROM, SHOULDER_TO, [-.5, 1]),
      fold('shirt-shoulder-right', 'Fold the right shoulder down',
        `Fold the top right corner down the same way: from the right side ${cm(m.shoulderDown)} below the top, to the top edge ${cm(m.shoulderIn)} in from the side. A straight neck edge stays between the slopes.`,
        mirror(SHOULDER_FROM), mirror(SHOULDER_TO), [.5, 1]),
      turn('shirt-front', 'Turn the paper over',
        'Turn it over from side to side, so the collar points and sleeves are on top again.'),
      fold('shirt-body', 'Fold the body up below the collar',
        `Fold the bottom edge up along a crease straight across, ${cm(m.bodyUp)} above the bottom, through all the layers. The sleeves swing up to the shoulders and the edge stops just below the collar points.`,
        [-1.5, BODY_Y], [1.5, BODY_Y], [0, -1]),
    ],
  };
}
