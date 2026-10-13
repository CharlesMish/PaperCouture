// Review-only parameter comparison; no alternate construction is registered.
import { buildMitten, type ThumbSide } from '../../../src/fold/mitten';
export function thumbVariant(version: 'baseline' | 'proposed', hand: ThumbSide, cuffOverride?: number) {
  const c = buildMitten(hand);
  const cuff = cuffOverride ?? (version === 'baseline' ? .30 : .25);
  const thumbAt = version === 'baseline' ? .50 : .20;
  for (const op of c.ops) if (op.kind === 'fold') for (const fold of op.folds) {
    if (op.id === 'mitt-cuff') fold.a.y = fold.b.y = -1 + cuff;
    if (op.id === 'mitt-thumb') { fold.a.y = -1 + cuff; fold.b.y = thumbAt; }
  }
  c.name = `${version === 'baseline' ? 'Baseline' : 'Proposed'} ${hand} mitten`;
  return c;
}
