import type { Construction } from './construction';
import type { GarmentId } from './garments';
import type { SilhouetteId, SleeveId } from './silhouettes';
import type { JacketLength } from './jacket';
import type { WrapDirection, WaistbandFinish } from './wrapSkirt';
import type { VestLength } from './lapelVest';

export interface GarmentOptions {
  silhouette: SilhouetteId;
  sleeves: SleeveId;
  jacketLength: JacketLength;
  wrap: WrapDirection;
  band: WaistbandFinish;
  vestLength: VestLength;
}
export const DEFAULT_OPTIONS: GarmentOptions = {
  silhouette: 'classic', sleeves: 'classic', jacketLength: 'cropped',
  wrap: 'original', band: 'double', vestLength: 'short',
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
  dress: [
    { id: 'silhouette', label: 'Side folds', title: 'Choose the side folds', before: 'sides', choices: [
      { id: 'straight', name: 'Straight' }, { id: 'classic', name: 'Classic A-line' }, { id: 'flare', name: 'Wide flare' },
    ] },
    { id: 'sleeves', label: 'Sleeves', title: 'Choose the sleeve folds', before: 'sleeves', choices: [
      { id: 'classic', name: 'Classic' }, { id: 'lifted', name: 'Lifted' }, { id: 'dropped', name: 'Dropped' },
    ] },
  ],
  jacket: [{ id: 'jacketLength', label: 'Body length', title: 'Choose the body length', before: 'jacket-hem', choices: [
    { id: 'cropped', name: 'Cropped' }, { id: 'longer', name: 'Longer' },
  ] }],
  skirt: [
    { id: 'wrap', label: 'Wrap direction', title: 'Choose the wrap direction', before: 'skirt-wrap-left', choices: [
      { id: 'original', name: 'Original wrap' }, { id: 'opposite', name: 'Opposite wrap' },
    ] },
    { id: 'band', label: 'Waistband', title: 'Choose the waistband finish', before: 'skirt-waist', choices: [
      { id: 'single', name: 'Turn once' }, { id: 'double', name: 'Turn twice' },
    ] },
  ],
  vest: [{ id: 'vestLength', label: 'Body length', title: 'Choose the body length', before: 'vest-shorten', choices: [
    { id: 'short', name: 'Short' }, { id: 'longline', name: 'Longline' },
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
/** Captions may change, but completed material operations must be identical. */
export function sharedFoldPrefix(a: Construction, b: Construction): number {
  const signature = (op: Construction['ops'][number]) => JSON.stringify(op.kind === 'fold'
    ? { kind: op.kind, id: op.id, folds: op.folds } : { kind: op.kind, id: op.id });
  let i = 0;
  while (i < a.ops.length && i < b.ops.length && signature(a.ops[i]) === signature(b.ops[i])) i++;
  return i;
}
export function optionsFromParams(params: URLSearchParams): GarmentOptions {
  let options = { ...DEFAULT_OPTIONS };
  const keys: Record<DecisionId, string> = { silhouette: 'shape', sleeves: 'sleeves', jacketLength: 'jacketLength', wrap: 'wrap', band: 'band', vestLength: 'vestLength' };
  for (const decisions of Object.values(DECISIONS)) for (const decision of decisions) {
    const value = params.get(keys[decision.id]);
    if (value) options = selectOption(options, decision, value);
  }
  return options;
}
