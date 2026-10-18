import type { Construction } from './construction';
import type { GarmentId } from './garments';
import type { SilhouetteId, SleeveId } from './silhouettes';
import type { CuffStyle, JacketLength } from './jacket';
import type { SkirtLength, WrapDirection, WaistbandFinish } from './wrapSkirt';
import type { VestLength } from './lapelVest';
import type { BroochShape } from './framedBrooch';
import type { PleatDepth } from './pleatedSkirt';
import type { CoatSide } from './coatDress';
import type { GownSide } from './gown';
import type { KimonoSide } from './kimono';
import type { ZoriSide } from './zori';
import type { SensuSide } from './sensu';
import type { TrousersSide } from './trousers';

import type { ClocheSide } from './cloche';
import type { ShellSide } from './shellTop';
export interface GarmentOptions {
  broochShape: BroochShape;
  silhouette: SilhouetteId;
  sleeves: SleeveId;
  jacketLength: JacketLength;
  wrap: WrapDirection;
  band: WaistbandFinish;
  vestLength: VestLength;
  pleatDepth: PleatDepth;
  cuffs: CuffStyle;
  skirtLength: SkirtLength;
  coatSide: CoatSide;
  gownSide: GownSide;
  kimonoSide: KimonoSide;
  zoriSide: ZoriSide;
  sensuSide: SensuSide;
  trousersSide: TrousersSide;
  clocheSide: ClocheSide;
  shellSide: ShellSide;
}
export const DEFAULT_OPTIONS: GarmentOptions = {
  broochShape: 'square', silhouette: 'classic', sleeves: 'classic', jacketLength: 'cropped',
  wrap: 'original', band: 'double', vestLength: 'short',
  pleatDepth: 'classic', cuffs: 'plain', skirtLength: 'classic', coatSide: 'reverse', gownSide: 'print', kimonoSide: 'print',
  zoriSide: 'print', sensuSide: 'print', trousersSide: 'print', clocheSide: 'print', shellSide: 'print',
};
export type DecisionId = keyof GarmentOptions;
export interface FoldChoice { id: string; name: string }
export interface FoldDecision {
  id: DecisionId;
  label: string;
  title: string;
  before: string;
  choices: FoldChoice[];
}
const DECISIONS: Record<string, FoldDecision[]> = {
  'framed-brooch': [{ id: 'broochShape', label: 'Frame shape', title: 'Choose the folded frame', before: 'frame-top', choices: [
    { id: 'square', name: 'Square' }, { id: 'rectangle', name: 'Rectangle' },
  ] }],
  dress: [
    { id: 'silhouette', label: 'Side folds', title: 'Choose the side folds', before: 'sides', choices: [
      { id: 'straight', name: 'Straight' }, { id: 'classic', name: 'Classic A-line' }, { id: 'flare', name: 'Wide flare' },
    ] },
    { id: 'sleeves', label: 'Sleeves', title: 'Choose the sleeve folds', before: 'sleeves', choices: [
      { id: 'classic', name: 'Classic' }, { id: 'lifted', name: 'Lifted' }, { id: 'dropped', name: 'Dropped' },
    ] },
  ],
  jacket: [
    { id: 'jacketLength', label: 'Body length', title: 'Choose the body length', before: 'jacket-hem', choices: [
      { id: 'cropped', name: 'Cropped' }, { id: 'longer', name: 'Longer' },
    ] },
    // Draft: the cuff fold is worked on the front, so it follows the reveal.
    // The choice is offered at the reveal turn, the last shared operation.
    // The turned option is a printed top-layer corner, not a reverse cuff band,
    // so the choice says so before the extra fold is made.
    { id: 'cuffs', label: 'Sleeve ends', title: 'Sleeve ends: plain, or small turned corners that show the print', before: 'turn-2', choices: [
      { id: 'plain', name: 'Plain' }, { id: 'turned', name: 'Printed corners' },
    ] },
  ],
  skirt: [
    // Draft (PR #13): the length is the first crease, far from the waistband.
    { id: 'skirtLength', label: 'Skirt length', title: 'Choose the skirt length', before: 'skirt-length', choices: [
      { id: 'short', name: 'Short' }, { id: 'classic', name: 'Classic' }, { id: 'long', name: 'Long' },
    ] },
    { id: 'wrap', label: 'Wrap direction', title: 'Choose the wrap direction', before: 'skirt-wrap-left', choices: [
      { id: 'original', name: 'Original wrap' }, { id: 'opposite', name: 'Opposite wrap' },
    ] },
    { id: 'band', label: 'Waistband', title: 'Choose the waistband finish', before: 'skirt-waist', choices: [
      { id: 'single', name: 'Turn once' }, { id: 'double', name: 'Turn twice' },
    ] },
  ],
  // Draft: pleat depth changes only the return creases.
  pleats: [{ id: 'pleatDepth', label: 'Pleat depth', title: 'Choose the pleat depth', before: 'pleats-return', choices: [
    { id: 'shallow', name: 'Shallow' }, { id: 'classic', name: 'Classic' }, { id: 'deep', name: 'Deep' },
  ] }],
  // Draft (PR #14): the tapered hem (id `pointed`) joins the length choice (one decision per fold).
  // The coat and its collar always show opposite sides of the paper (one fold
  // apart). The choice is offered after the shared first turn-over; the
  // reverse-colour coat folds both collapses mirrored and adds a reveal turn.
  'coat-dress': [{ id: 'coatSide', label: 'Coat colour', title: 'Choose which side of the paper the coat shows', before: 'shoulders', choices: [
    { id: 'reverse', name: 'Reverse-colour coat' }, { id: 'print', name: 'Printed coat' },
  ] }],
  // The sash and hem band are folded once and the body never, so they always
  // show opposite sides of the paper. Both colourways start with the hem band
  // (valley, or behind and turn over), so the choice is offered at the first fold.
  gown: [{ id: 'gownSide', label: 'Gown colour', title: 'Choose which side of the paper the gown shows', before: 'hem', choices: [
    { id: 'print', name: 'Printed gown' }, { id: 'reverse', name: 'Reverse-colour gown' },
  ] }],
  // The collar bands are folded twice and the body once, so they always show
  // opposite sides. Both colourways start with the fold in half (behind and
  // turned over, or up in front), so the choice is offered at the first fold.
  kimono: [{ id: 'kimonoSide', label: 'Kimono colour', title: 'Choose which side of the paper the kimono shows', before: 'half', choices: [
    { id: 'print', name: 'Printed kimono' }, { id: 'reverse', name: 'Reverse-colour kimono' },
  ] }],
  // The sole is folded an even number of times and the thong an odd number, so
  // they always show opposite sides. The reverse-colour zori folds its first band
  // behind and turns over, so the choice is offered at the first fold.
  zori: [{ id: 'zoriSide', label: 'Zori colour', title: 'Choose which side of the paper the sole shows', before: 'zori-band', choices: [
    { id: 'print', name: 'Printed sole' }, { id: 'reverse', name: 'Reverse-colour sole' },
  ] }],
  // The trousers' legs and the stripe, the cloche and its ribbon, the shell top and
  // its bands always show opposite sides: the choice folds the first step the other
  // way (with a turn added or skipped where needed) and nothing after it changes.
  trousers: [{ id: 'trousersSide', label: 'Trousers colour', title: 'Choose which side of the paper the trousers show', before: 'tr-sides', choices: [
    { id: 'print', name: 'Printed trousers' }, { id: 'reverse', name: 'Reverse-colour trousers' },
  ] }],
  cloche: [{ id: 'clocheSide', label: 'Cloche colour', title: 'Choose which side of the paper the cloche shows', before: 'cl-bands', choices: [
    { id: 'print', name: 'Printed cloche' }, { id: 'reverse', name: 'Reverse-colour cloche' },
  ] }],
  'shell-top': [{ id: 'shellSide', label: 'Shell top colour', title: 'Choose which side of the paper the top shows', before: 'sh-bands', choices: [
    { id: 'print', name: 'Printed top' }, { id: 'reverse', name: 'Reverse-colour top' },
  ] }],
  // The fan shows whichever side faces out after the fold in half.
  sensu: [{ id: 'sensuSide', label: 'Fan colour', title: 'Choose which side of the paper the fan shows', before: 'sensu-half', choices: [
    { id: 'print', name: 'Printed fan' }, { id: 'reverse', name: 'Reverse-colour fan' },
  ] }],
  vest: [{ id: 'vestLength', label: 'Body length', title: 'Choose the body length and hem', before: 'vest-shorten', choices: [
    { id: 'short', name: 'Short' }, { id: 'longline', name: 'Longline' }, { id: 'pointed', name: 'Tapered hem' },
  ] }],
};
export function garmentDecisions(id: GarmentId): FoldDecision[] { return DECISIONS[id] ?? []; }
export function decisionStep(c: Construction, decision: FoldDecision): number {
  return c.ops.findIndex(op => op.id === decision.before);
}
export function selectOption(options: GarmentOptions, decision: FoldDecision, value: string): GarmentOptions {
  if (!decision.choices.some(c => c.id === value)) return options;
  return { ...options, [decision.id]: value };
}
/** Captions may change, but completed material operations must be identical.
 * A collapse is compared by its whole spec: two collapses can share an id and
 * still move the paper differently (the coat-dress folds its mirrored). */
export function sharedFoldPrefix(a: Construction, b: Construction): number {
  const signature = (op: Construction['ops'][number]) => JSON.stringify(op.kind === 'fold'
    ? { kind: op.kind, id: op.id, folds: op.folds }
    : op.kind === 'collapse' ? { kind: op.kind, id: op.id, collapse: op.collapse } : { kind: op.kind, id: op.id });
  let i = 0;
  while (i < a.ops.length && i < b.ops.length && signature(a.ops[i]) === signature(b.ops[i])) i++;
  return i;
}
const keys: Record<DecisionId, string> = { broochShape: 'broochShape', silhouette: 'shape', sleeves: 'sleeves', jacketLength: 'jacketLength', wrap: 'wrap', band: 'band', vestLength: 'vestLength', pleatDepth: 'pleats', cuffs: 'cuffs', skirtLength: 'skirtLength', coatSide: 'coat', gownSide: 'gown', kimonoSide: 'kimono', zoriSide: 'zori', sensuSide: 'sensu', trousersSide: 'trousers', clocheSide: 'cloche', shellSide: 'shell-top' };
export function optionsToParams(options: GarmentOptions, params: URLSearchParams): void {
  for (const id of Object.keys(keys) as DecisionId[]) {
    if (options[id] === DEFAULT_OPTIONS[id]) params.delete(keys[id]);
    else params.set(keys[id], options[id]);
  }
}
export function optionsFromParams(params: URLSearchParams): GarmentOptions {
  let options = { ...DEFAULT_OPTIONS };
  for (const decisions of Object.values(DECISIONS)) for (const decision of decisions) {
    const value = params.get(keys[decision.id]);
    if (value) options = selectOption(options, decision, value);
  }
  return options;
}
