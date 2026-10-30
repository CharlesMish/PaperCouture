import type { Construction } from './construction';
import type { Op } from './engine';
import { applyAffine, reflectionAcross, sub, v2 } from './geometry';
import { cm, lineMeet } from './measure';

type Point = [number, number];
const fold = (id: string, title: string, hint: string, a: Point, b: Point, moving: Point, only?: string): Op => ({
  kind: 'fold', id, title, hint,
  folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley', ...(only ? { only } : {}) }],
});

// Where the creases go (left side; the right side mirrors it). The square's side is 2.
const FACING = .93; // facing strips: creases this far either side of the centre line
const PANEL_TOP: Point = [-.48, 1], PANEL_FOOT: Point = [-.58, -1]; // the slanting panel crease
const FLAP_TO: Point = [-.18, .4]; // the shoulder flap crease runs from the panel's top toward this point
const HEM_Y = -.78; // the hem fold, straight across
const mirror = ([x, y]: Point): Point => [-x || 0, y];

/** Numbers for the instructions, from the same values that place the creases. */
function coatMeasures() {
  const top = v2(...PANEL_TOP), foot = v2(...PANEL_FOOT);
  // the folded panel's inner edge is the paper's side edge (at the facing crease), reflected across the panel crease
  const across = reflectionAcross(top, sub(foot, top));
  const e0 = applyAffine(across, v2(-FACING, 1)), e1 = applyAffine(across, v2(-FACING, -1));
  const flapMeet = lineMeet(top, v2(FLAP_TO[0] - PANEL_TOP[0], FLAP_TO[1] - PANEL_TOP[1]), e0, sub(e1, e0));
  return {
    facing: 1 - FACING,
    panelTop: FACING + PANEL_TOP[0], // in from the side edge, after the facings
    panelFoot: FACING + PANEL_FOOT[0],
    flapDown: PANEL_TOP[1] - flapMeet.y, // below the top, on the panel's inner edge
    hemDown: 1 - HEM_Y, // below the top edge
  };
}

/** A long open-front silhouette: two flared panels, retained lining and
 * turned shoulder flaps. Edge turns make actual contrasting front facings.
 * No cut opening, cavity, closure or practical foldability is claimed. */
export function buildSwingCoat(): Construction {
  const m = coatMeasures();
  return { name: 'Swing coat', meta: { top: 1, shoulderPoint: v2(-.48, 1), sleeveCutDir: v2(.3, -.6) }, ops: [
    fold('coat-facing-left', 'Fold a narrow strip on the left edge',
      `Print side up. Fold the left edge over onto the print by ${cm(m.facing)}, all the way down. This strip becomes a facing in the other colour.`,
      [-FACING, -1.5], [-FACING, 1.5], [-1, 0]),
    fold('coat-facing-right', 'Fold a matching strip on the right edge',
      `Fold the right edge over onto the print by ${cm(m.facing)} in the same way.`,
      [FACING, -1.5], [FACING, 1.5], [1, 0]),
    { kind: 'turn', id: 'coat-lining', title: 'Turn the paper over',
      hint: 'Turn it over from side to side, so both strips are underneath. The other colour is up; it shows as the lining between the panels.' },
    fold('coat-panel-left', 'Fold the left side in on a slant',
      `Fold the left side in along a slanting crease: from the top edge ${cm(m.panelTop)} in from the side, to the bottom edge ${cm(m.panelFoot)} in from the side. Fold all the layers.`,
      PANEL_TOP, PANEL_FOOT, [-1, 0]),
    fold('coat-panel-right', 'Fold the right side in on a slant',
      `Fold the right side in the same way: from the top edge ${cm(m.panelTop)} in from the side, to the bottom edge ${cm(m.panelFoot)} in. The gap between the panels widens toward the hem.`,
      mirror(PANEL_TOP), mirror(PANEL_FOOT), [1, 0]),
    fold('coat-sleeve-left', 'Fold the left shoulder flap out',
      `On the left panel only, fold the top inner corner down and out to the left: crease from the top left corner to the panel's inner edge, ${cm(m.flapDown)} below the top. This becomes a shoulder flap.`,
      PANEL_TOP, FLAP_TO, [0, 1], 'coat-panel-left'),
    fold('coat-sleeve-right', 'Fold the right shoulder flap out',
      `On the right panel only, fold the top inner corner down and out to the right: crease from the top right corner to the panel's inner edge, ${cm(m.flapDown)} below the top.`,
      mirror(PANEL_TOP), mirror(FLAP_TO), [0, 1], 'coat-panel-right'),
    { kind: 'turn', id: 'coat-back', title: 'Turn the paper over', hint: 'Turn it over from side to side. The hem is folded from the back.' },
    fold('coat-hem', 'Fold the hem up',
      `Fold the bottom edge up onto the back along a crease straight across, ${cm(m.hemDown)} below the top edge, through all the layers.`,
      [-1.5, HEM_Y], [1.5, HEM_Y], [0, -1]),
    { kind: 'turn', id: 'coat-front', title: 'Turn over to reveal the swing coat',
      hint: 'Turn it over from side to side: long flared front panels with folded facings and shoulder flaps, with the hem turned up behind.' },
  ] };
}
