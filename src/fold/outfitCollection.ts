import { type Construction } from './construction';
import type { Op } from './engine';
import { v2, sub, applyAffine, reflectionAcross } from './geometry';
import { cm, lineMeet } from './measure';

type Point = [number, number];
const fold = (id: string, title: string, hint: string, a: Point, b: Point, moving: Point): Op => ({
  kind: 'fold', id, title, hint,
  folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley' }],
});
const turn = (id: string, title: string, hint: string): Op => ({ kind: 'turn', id, title, hint });
const meta = (top: number) => ({ top, shoulderPoint: v2(0, top), sleeveCutDir: v2(1, 0) });

// Crease positions, shared by the folds and their instructions.
const BOAT = { band: .7, top: .86, waist: .54, hem: -.22 };

/** A short sleeveless top with a broad folded neckline. The upper edge is
 * continuous paper, not a cut opening. The body narrows toward its folded hem. */
export function buildBoatNeckTop(): Construction {
  const b = BOAT, taper = `from the top edge ${cm(1 - b.top)} in from the side to the bottom edge ${cm(1 - b.waist)} in from the side`;
  return { name: 'Boat-neck top', meta: meta(b.band), ops: [
    fold('boat-band', 'Fold the broad neckband', `Print side up. Fold the top edge down onto the print by ${cm(1 - b.band)}, all the way across. This wide band becomes the neckline, in the other colour.`, [-1.5, b.band], [1.5, b.band], [0, 1]),
    turn('boat-back', 'Turn over to shape the body', 'Turn it over from side to side, so the band is underneath along the top edge.'),
    fold('boat-left', 'Taper the first side', `Fold the left side in along a slanting crease ${taper}. Fold all the layers.`, [-b.top, b.band], [-b.waist, -1], [-1, 0]),
    fold('boat-right', 'Taper the other side', `Fold the right side in the same way, ${taper}. Fold all the layers.`, [b.top, b.band], [b.waist, -1], [1, 0]),
    fold('boat-corners', 'Tuck the two shoulder tips', 'The slanting side folds leave a small point sticking up above the top edge on each side. Fold both points down along the top edge, onto the paper.', [-1.5, b.band], [1.5, b.band], [0, .9]),
    fold('boat-hem', 'Fold a short hem', `Fold the bottom edge up onto the paper along a crease straight across, ${cm(1 + b.hem)} above the bottom edge. Fold all the layers. This shortens the top.`, [-1.5, b.hem], [1.5, b.hem], [0, -1]),
    turn('boat-front', 'Reveal the boat-neck top', 'Turn it over from side to side: a wide band across the top of a short, tapered printed body.'),
  ] };
}

const WRAP = { top: .60, bottom: .36, shoulderSide: [-.60, .68] as Point, shoulderTop: [-.43, 1] as Point, hem: -.25 };
const mirror = (p: Point): Point => [-p[0], p[1]];
/** Once the panels are crossed and the paper turned, the right panel's top corner peeks above the top edge at the
 * left (by symmetry, where the left panel's corner lands across its own crease). The shoulder crease ends on that
 * peeking edge, how far in from the side; and meets the side edge this far down it from the sheet's top corner. */
function shoulderEnds() {
  const w = WRAP, crease = v2(w.top - w.bottom, -2);
  const tip = applyAffine(reflectionAcross(v2(-w.top, 1), crease), v2(-1, 1));
  const a = v2(...w.shoulderSide), d = sub(v2(...w.shoulderTop), a);
  const top = lineMeet(a, d, v2(-w.top, 1), sub(tip, v2(-w.top, 1)));
  const side = lineMeet(a, d, v2(-w.top, 1), crease);
  return { in: top.x + w.top, down: Math.hypot(side.x + w.top, side.y - 1) };
}

/** Two sequential diagonal panels leave a V of the backing visible. This is
 * a flat crossed-front silhouette, not a sewn blouse or a locking closure. */
export function buildCrossWrapTop(): Construction {
  const w = WRAP, panel = `from the top edge ${cm(1 - w.top)} in from the side to the bottom edge ${cm(1 - w.bottom)} in from the side`, s = shoulderEnds();
  const shoulder = `along a short slanting crease from the side edge ${cm(s.down)} below the corner, up to the top ${cm(s.in)} in from the corner (on the panel point peeking up from behind). Fold all the layers.`;
  return { name: 'Cross-wrap top', meta: meta(1), ops: [
    turn('wrap-reverse', 'Turn over for the front panels', 'Start print side up and turn it over from side to side, so the other colour faces you.'),
    fold('wrap-panel-left', 'Cross the first front panel', `Fold the left side over along a slanting crease ${panel}. Its top corner peeks just above the top edge.`, [-w.top, 1], [-w.bottom, -1], [-1, 0]),
    fold('wrap-panel-right', 'Cross the second front panel', `Fold the right side over the first panel the same way, ${panel}. The two printed edges cross, leaving a V of the other colour at the top.`, [w.top, 1], [w.bottom, -1], [1, 0]),
    turn('wrap-back', 'Turn over to shorten the top', 'Turn it over from side to side, so the crossed panels are underneath.'),
    fold('wrap-shoulder-left', 'Soften the first shoulder', `Fold the top left corner down onto the paper ${shoulder}`, w.shoulderSide, w.shoulderTop, [-w.top, 1]),
    fold('wrap-shoulder-right', 'Soften the other shoulder', `Fold the top right corner down the same way ${shoulder}`, mirror(w.shoulderSide), mirror(w.shoulderTop), [w.top, 1]),
    fold('wrap-hem', 'Lift the lower panel', `Fold the bottom edge up onto the paper along a crease straight across, ${cm(1 + w.hem)} above the bottom edge. Fold all the layers. This makes a short top.`, [-1.5, w.hem], [1.5, w.hem], [0, -1]),
    turn('wrap-front', 'Reveal the crossed front', 'Turn it over from side to side: two printed panels cross over a V of the other colour.'),
  ] };
}

// Crease positions, shared by the folds and their instructions.
const HAT = { body: -.18, crownSide: .18, crownTop: .38, top: .78, brim: -.02 };
/** A flat crown and brim silhouette from one complete square. It is not
 * opened into a wearable hat: the underside remains folded paper. */
export function buildFoldedHat(): Construction {
  const h = HAT, crown = `from the top edge ${cm(1 - h.crownTop)} in from the corner to the side edge ${cm(1 - h.crownSide)} below it`;
  return { name: 'Folded hat', meta: meta(h.top), ops: [
    turn('hat-reverse', 'Put the print underneath', 'Start print side up and turn it over from side to side, so the other colour faces you.'),
    fold('hat-body', 'Fold up the lower panel', `Fold the bottom edge up onto the paper along a crease straight across, ${cm(1 - h.body)} below the top edge. The folded panel shows the print.`, [-1.5, h.body], [1.5, h.body], [0, -1]),
    fold('hat-crown-left', 'Shape the first crown corner', `Fold the top left corner down along a slanting crease ${crown}. Fold all the layers, the panel too.`, [-1, h.crownSide], [-h.crownTop, 1], [-1, 1]),
    fold('hat-crown-right', 'Shape the other crown corner', `Fold the top right corner down the same way: crease ${crown}. Fold all the layers. This tapers the crown.`, [1, h.crownSide], [h.crownTop, 1], [1, 1]),
    fold('hat-top', 'Flatten the crown top', `Fold the top edge down by ${cm(1 - h.top)}, along a crease straight across between the two crown folds. Fold all the layers.`, [-1.5, h.top], [1.5, h.top], [0, 1]),
    turn('hat-front', 'Turn to the printed crown', 'Turn it over from side to side, so the print faces you and the crown folds are behind.'),
    fold('hat-brim', 'Turn up the brim', `Fold the bottom edge up by ${cm(h.brim - h.body)}, all the way across and all the layers. This doubled strip becomes the brim.`, [-1.5, h.brim], [1.5, h.brim], [0, h.body]),
  ] };
}

export const OUTFIT_CONSTRUCTIONS = { 'boat-top': buildBoatNeckTop, 'wrap-top': buildCrossWrapTop, hat: buildFoldedHat };
