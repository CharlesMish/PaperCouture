import { Construction } from './construction';
import { v2 } from './geometry';
import { cm } from './measure';

export type VestLength = 'short' | 'longline' | 'pointed';
/** Draft (PR #14): the tapered hem lifts each lower outer corner of the longline
 * body along a crease from the side seam down to near the front opening, so the
 * hem tapers down to the reveal. The backing joins the two low tips, so it reads
 * as a tapered, blunt V rather than two separate points (Astra's review of PR #14);
 * the id stays `pointed` so existing URLs keep working. */
export const VEST_POINTS = { rise: 0.25, run: 0.45 };
/** Body folds: the front panels' creases (x = ±PANEL), the lapel creases (on the top
 * edge at ±LAPEL_TOP, down to the panel's inner edge at LAPEL_LOW), the shoulder
 * creases (side edge at SHOULDER_SIDE, top edge at ±SHOULDER_TOP), and the hems. */
const PANEL = 0.55, INNER = 0.1, LAPEL_TOP = 0.22, LAPEL_LOW = 0.6, SHOULDER_SIDE = 0.55, SHOULDER_TOP = 0.38;
const SHORT_HEM = -0.4, LONG_HEM = -0.78;
const lapelHint = (which: string, what: string) =>
  `${which}: crease from the top edge ${cm(LAPEL_TOP - INNER)} out from the panel's inner edge, down to that inner edge ${cm(1 - LAPEL_LOW)} below the top. ${what}`;
const hemHint = (y: number, what: string) =>
  `Fold the bottom edge up onto the back by ${cm(1 + y)}, all the layers. ${what}`;

/** Gate-fold panels and genuine flap lapels. The apparent opening exposes a
 * continuous backing layer, rather than a cut hole or a hollow garment. */
export function buildLapelVest(length: VestLength = 'short'): Construction {
  const construction: Construction = {
    name: 'Lapel vest',
    meta: { top: 1, shoulderPoint: v2(-0.55, 1), sleeveCutDir: v2(1, 0) },
    ops: [
      { kind: 'turn', id: 'vest-turn', title: 'Put the print underneath', hint: 'Turn it over from side to side, so the print side is underneath.' },
      {
        kind: 'fold', id: 'vest-panels', title: 'Bring in the two front panels',
        hint: `Fold each side in along an upright crease ${cm(1 - PANEL)} in from the side edge, all the way down. The side edges stop just short of the centre: the print side shows on the two front panels, the other colour in the gap between them.`,
        folds: [
          { name: 'vest-left', a: v2(-PANEL, -1.5), b: v2(-PANEL, 1.5), moving: v2(-1, 0), sense: 'valley' },
          { name: 'vest-right', a: v2(PANEL, -1.5), b: v2(PANEL, 1.5), moving: v2(1, 0), sense: 'valley' },
        ],
      },
      {
        kind: 'fold', id: 'vest-lapel-left', title: 'Turn out the first lapel',
        hint: lapelHint('On the left panel only, fold its top inner corner out onto the panel', 'Its other colour makes the lapel.'),
        folds: [{ name: 'vest-lapel-left', a: v2(-LAPEL_TOP, 1), b: v2(-INNER, LAPEL_LOW), moving: v2(-INNER, 1), sense: 'valley', only: 'vest-left' }],
      },
      {
        kind: 'fold', id: 'vest-lapel-right', title: 'Open the matching lapel',
        hint: lapelHint('Fold the right panel\'s top inner corner out the same way, that panel only', 'The two lapels frame the opening.'),
        folds: [{ name: 'vest-lapel-right', a: v2(LAPEL_TOP, 1), b: v2(INNER, LAPEL_LOW), moving: v2(INNER, 1), sense: 'valley', only: 'vest-right' }],
      },
      { kind: 'turn', id: 'vest-back', title: 'Turn over to finish the outline', hint: 'Turn it over from side to side, so the back is up and the lapels are underneath.' },
      {
        kind: 'fold', id: 'vest-shoulders', title: 'Tuck the outer shoulder corners',
        hint: `Fold each top corner in along a slanting crease: from the side edge ${cm(1 - SHOULDER_SIDE)} below the top, to the top edge ${cm(PANEL - SHOULDER_TOP)} in from the side. Fold all the layers. This shapes the sleeveless shoulders.`,
        folds: [
          { name: 'vest-shoulder-left', a: v2(-PANEL, SHOULDER_SIDE), b: v2(-SHOULDER_TOP, 1), moving: v2(-PANEL, 1), sense: 'valley' },
          { name: 'vest-shoulder-right', a: v2(PANEL, SHOULDER_SIDE), b: v2(SHOULDER_TOP, 1), moving: v2(PANEL, 1), sense: 'valley' },
        ],
      },
      {
        kind: 'fold', id: 'vest-shorten', title: 'Fold a short body',
        hint: hemHint(SHORT_HEM, 'This sets a short body.'),
        folds: [{ name: 'vest-shorten', a: v2(-1.5, SHORT_HEM), b: v2(1.5, SHORT_HEM), moving: v2(0, -1), sense: 'valley' }],
      },
      { kind: 'turn', id: 'vest-front', title: 'Reveal the lapels', hint: 'Turn it over from side to side to show the printed front panels and their lapels.' },
    ],
  };
  if (length === 'longline' || length === 'pointed') {
    const hem = construction.ops.find(op => op.id === 'vest-shorten');
    if (hem?.kind === 'fold') {
      hem.title = 'Finish the longline body';
      hem.hint = hemHint(LONG_HEM, 'This narrow strip leaves a longer body.');
      hem.folds[0].a.y = LONG_HEM;
      hem.folds[0].b.y = LONG_HEM;
    }
  }
  if (length === 'pointed') {
    const y = LONG_HEM, { rise, run } = VEST_POINTS;
    construction.name = 'Lapel vest, tapered hem';
    construction.ops.splice(construction.ops.findIndex(op => op.id === 'vest-shorten') + 1, 0, {
      kind: 'fold', id: 'vest-hem-points', title: 'Taper the hem',
      hint: `Fold each bottom corner up along a slanting crease: from the side edge ${cm(rise)} above the bottom, to the bottom edge ${cm(run)} in from the side. Fold all the layers. The hem now tapers down to the front opening.`,
      folds: [
        { name: 'vest-point-left', a: v2(-PANEL, y + rise), b: v2(-PANEL + run, y), moving: v2(-PANEL, y), sense: 'valley' },
        { name: 'vest-point-right', a: v2(PANEL, y + rise), b: v2(PANEL - run, y), moving: v2(PANEL, y), sense: 'valley' },
      ],
    });
  }
  return construction;
}
