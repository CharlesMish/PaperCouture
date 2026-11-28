// Parts for the figure study: a kimono as it is worn, made as an assembly.
//
// The studio's kimono (src/fold/kimono.ts) is the garment laid flat, sleeves
// out. Worn, a kimono is a narrow column with a collar that crosses, an obi,
// and sleeves that hang. Paper dolls get that from several small folded pieces,
// so this is one too: a wrapped body from one square and a sleeve from each of
// two smaller squares, with the studio's own obi, zori and fan added.
//
// Every fold here is a plain whole-stack fold through the existing engine. These
// are sketches: not in the app's design list, not checked in CI, and not folded
// in physical paper.
import type { Construction } from '../../src/fold/construction';
import type { Op } from '../../src/fold/engine';
import { v2 } from '../../src/fold/geometry';

type Point = [number, number];
const fold = (id: string, title: string, hint: string, a: Point, b: Point, moving: Point): Op => ({
  kind: 'fold', id, title, hint, folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley' }],
});
const turn = (id: string, title: string, hint: string): Op => ({ kind: 'turn', id, title, hint });
const meta = (top: number) => ({ top, shoulderPoint: v2(0, top), sleeveCutDir: v2(1, 0) });

export interface BodyShape {
  /** width of the collar band turned down at the start */
  collar: number;
  /** half the gap left for the neck between the two fronts */
  neck: number;
  /** how far each front leans from upright, in degrees; the collar's slope is twice this */
  lean: number;
  /** half the finished width at the shoulder, and how much wider each side is at the hem */
  half: number; flare: number;
}
export const BODY: BodyShape = { collar: .09, neck: .13, lean: 21, half: .4, flare: .07 };
/** The squares each part is folded from, in cm, for a figure about 16 cm tall. */
export const SQUARES = { body: 12, sleeve: 7, obi: 4.8 };

/**
 * The worn body. The top edge is turned down first so its other colour becomes
 * the collar; each front then folds across from the neck, which lays that band
 * along the front's slanting edge. The front on the viewer's right goes on
 * last, so it lies on top: the wearer's left side over the right, as a kimono
 * is worn. The sides are folded behind to make the column.
 */
export function wornBody(s: BodyShape = BODY): Construction {
  const top = 1 - s.collar, t = Math.tan(s.lean * Math.PI / 180);
  const front = (sign: number): [Point, Point, Point] => [[sign * s.neck, top], [sign * (s.neck + t), top - 1], [sign * 1, top]];
  return { name: 'Worn kimono body', meta: meta(top), ops: [
    fold('eri', 'Turn down the collar', 'Fold the top edge down onto the print. This narrow band of the other colour becomes the collar.', [-1.5, top], [1.5, top], [0, 1]),
    turn('body-back', 'Put the print underneath', 'The collar band is underneath, along the top edge.'),
    fold('front-under', 'Fold the first front across', 'Leave a gap for the neck. Fold the corner on your left down across the middle; the collar band follows its edge.', ...front(-1)),
    fold('front-over', 'Fold the other front over it', 'Fold the corner on your right across the first. This front lies on top, as a kimono is worn.', ...front(1)),
    turn('body-turn', 'Turn over to narrow the body', 'The crossed fronts are underneath.'),
    fold('side-a', 'Fold one side in', 'Fold the side in to make a column, a little wider at the hem.', [-s.half, top], [-s.half - s.flare, -1], [-1, 0]),
    fold('side-b', 'Fold the other side in', 'Match it.', [s.half, top], [s.half + s.flare, -1], [1, 0]),
    turn('body-front', 'Turn over', 'A narrow body with a crossed collar.'),
  ] };
}

/** A sleeve: a smaller square folded in half, with the lower outer corner
 * turned behind so it hangs with a soft corner. `side` is which way the open
 * corner faces. */
export function sleeve(side: 'left' | 'right', corner = .3): Construction {
  const s = side === 'left' ? -1 : 1;
  return { name: `Sleeve, ${side}`, meta: meta(1), ops: [
    turn('sleeve-back', 'Put the print underneath', 'Start a sleeve from the reverse.'),
    fold('sleeve-half', 'Fold in half', 'Bring one edge across to the other. The fold is the top of the arm.', [0, -1.5], [0, 1.5], [-s, 0]),
    fold('sleeve-corner', 'Turn the lower corner', 'Fold the lower outer corner onto this side.', [s * (1 - corner), -1], [s * 1, -1 + corner], [s * 1, -1]),
    turn('sleeve-front', 'Turn over', 'A hanging sleeve with a soft corner.'),
  ] };
}

/** What someone needs at the table. Sizes are a first guess for a figure about 15 cm tall; none has been folded. */
export const TABLE_LIST: { part: string; paper: string; make: string }[] = [
  { part: 'Body', paper: `one ${SQUARES.body} cm square`, make: '5 folds, no cuts' },
  { part: 'Sleeves', paper: `two ${SQUARES.sleeve} cm squares`, make: '2 folds each, no cuts' },
  { part: 'Obi', paper: `one ${SQUARES.obi} cm square of a second paper`, make: 'the studio’s obi: 6 folds, no cuts' },
  { part: 'Head and neck', paper: 'white card, about 3 × 5 cm', make: 'cut: a circle on a stalk' },
  { part: 'Hair', paper: 'black paper, about 4 × 5 cm', make: 'cut: one shape behind the head, a fringe in front' },
  { part: 'Feet', paper: 'white card, two 1 cm pieces', make: 'cut, with the thong drawn on' },
  { part: 'Joins', paper: 'glue or double-sided tape', make: 'neck into the collar, sleeves behind the shoulders, obi across, hair on' },
];
