import { type Construction } from './construction';
import type { Op } from './engine';
import { v2 } from './geometry';

type Point = [number, number];
const fold = (id: string, title: string, hint: string, a: Point, b: Point, moving: Point): Op => ({
  kind: 'fold', id, title, hint,
  folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley' }],
});
const turn = (id: string, title: string, hint: string): Op => ({ kind: 'turn', id, title, hint });
const meta = (top: number) => ({ top, shoulderPoint: v2(0, top), sleeveCutDir: v2(1, 0) });

/** A short sleeveless top with a broad folded neckline. The upper edge is
 * continuous paper, not a cut opening. The body narrows toward its folded hem. */
export function buildBoatNeckTop(): Construction {
  return { name: 'Boat-neck top', meta: meta(.7), ops: [
    fold('boat-band', 'Fold the broad neckband', 'Turn down the top edge. Its reverse becomes a wide, straight neckband; the sheet stays uncut.', [-1.5, .7], [1.5, .7], [0, 1]),
    turn('boat-back', 'Turn over to shape the body', 'Keep the band underneath while you narrow the waist.'),
    fold('boat-left', 'Taper the first side', 'Follow the sloping guide from the wide shoulder to the narrower waist.', [-.86, .7], [-.54, -1], [-1, 0]),
    fold('boat-right', 'Taper the other side', 'Fold the matching edge onto the back.', [.86, .7], [.54, -1], [1, 0]),
    fold('boat-corners', 'Tuck the two shoulder tips', 'Fold the tiny points above the straight neckband onto the back.', [-1.5, .7], [1.5, .7], [0, .9]),
    fold('boat-hem', 'Fold a short hem', 'Bring the lower panel up behind the top. All of the square remains inside the short body.', [-1.5, -.22], [1.5, -.22], [0, -1]),
    turn('boat-front', 'Reveal the boat-neck top', 'A broad band over a short tapered body. It is a flat silhouette without a neck opening or armholes.'),
  ] };
}

/** Two sequential diagonal panels leave a V of the backing visible. This is
 * a flat crossed-front silhouette, not a sewn blouse or a locking closure. */
export function buildCrossWrapTop(): Construction {
  return { name: 'Cross-wrap top', meta: meta(1), ops: [
    turn('wrap-reverse', 'Turn over for the front panels', 'The reverse faces you. The next folds bring the print back as overlapping panels.'),
    fold('wrap-panel-left', 'Cross the first front panel', 'Bring the side over on the sloping crease. The diagonal edge leaves a V of the backing visible.', [-.60, 1], [-.36, -1], [-1, 0]),
    fold('wrap-panel-right', 'Cross the second front panel', 'Lay this panel over the first. The lower panels overlap; they are not a cut or a slit.', [.60, 1], [.36, -1], [1, 0]),
    turn('wrap-back', 'Turn over to shorten the top', 'Keep the crossed panels underneath while you fold the hem.'),
    fold('wrap-shoulder-left', 'Soften the first shoulder', 'Turn the little outer corner behind the front to form a sloped shoulder.', [-.60, .68], [-.43, 1], [-.6, 1]),
    fold('wrap-shoulder-right', 'Soften the other shoulder', 'Make the matching shoulder corner.', [.60, .68], [.43, 1], [.6, 1]),
    fold('wrap-hem', 'Lift the lower panel', 'Fold the lower panel onto the back for a short top that can sit above a skirt.', [-1.5, -.25], [1.5, -.25], [0, -1]),
    turn('wrap-front', 'Reveal the crossed front', 'Two printed panels over a continuous backing. No neck opening, ties or locked closure.'),
  ] };
}

/** A flat crown and brim silhouette from one complete square. It is not
 * opened into a wearable hat: the underside remains folded paper. */
export function buildFoldedHat(): Construction {
  return { name: 'Folded hat', meta: meta(.78), ops: [
    turn('hat-reverse', 'Put the print underneath', 'Shape the crown from the reverse so its broad printed face will stay clear.'),
    fold('hat-body', 'Fold up the lower panel', 'Bring the lower part up onto this side. The following crown folds will shape this panel too, keeping it behind the outline.', [-1.5, -.18], [1.5, -.18], [0, -1]),
    fold('hat-crown-left', 'Shape the first crown corner', 'Fold the upper corner down to begin a tapered crown.', [-1, .18], [-.38, 1], [-1, 1]),
    fold('hat-crown-right', 'Shape the other crown corner', 'Follow the matching guide; the crown keeps a short, flat top.', [1, .18], [.38, 1], [1, 1]),
    fold('hat-top', 'Flatten the crown top', 'Turn the little top band down onto this side.', [-1.5, .78], [1.5, .78], [0, 1]),
    turn('hat-front', 'Turn to the printed crown', 'The crown folds are now behind. A final small band becomes the brim.'),
    fold('hat-brim', 'Turn up the brim', 'Lift the narrow lower strip as one stack. Both the crown and this doubled brim show the print; a folded edge separates them.', [-1.5, -.02], [1.5, -.02], [0, -.18]),
  ] };
}

export const OUTFIT_CONSTRUCTIONS = { 'boat-top': buildBoatNeckTop, 'wrap-top': buildCrossWrapTop, hat: buildFoldedHat };
