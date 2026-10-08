import type { Construction } from './construction';
import type { Op } from './engine';
import { v2 } from './geometry';

type Point = [number, number];
const fold = (id: string, title: string, hint: string, a: Point, b: Point, moving: Point): Op => ({
  kind: 'fold', id, title, hint,
  folds: [{ name: id, a: v2(...a), b: v2(...b), moving: v2(...moving), sense: 'valley' }],
});

/** A long, shield-shaped garment study from one intact square. The apparent
 * neckband is a folded edge, not a neck opening. No ties or paper lock. */
export function buildPointedTabard(): Construction {
  return { name: 'Pointed tabard', meta: { top: .78, shoulderPoint: v2(0, .78), sleeveCutDir: v2(1, 0) }, ops: [
    fold('tabard-band', 'Turn down the upper band', 'This narrow edge reveals the reverse. It suggests a neckband without cutting a neck opening.', [-1.5, .78], [1.5, .78], [0, 1]),
    { kind: 'turn', id: 'tabard-back', title: 'Turn the sheet over', hint: 'Narrow the body from behind the printed face.' },
    fold('tabard-left', 'Narrow the first side', 'Bring the left edge inward to make a long, straight body.', [-.58, -1.5], [-.58, 1.5], [-1, 0]),
    fold('tabard-right', 'Narrow the other side', 'Bring the opposite edge over the first panel.', [.58, -1.5], [.58, 1.5], [1, 0]),
    fold('tabard-hem-left', 'Shape the first hem corner', 'Fold this corner behind the front to begin the pointed hem.', [-.58, -.60], [0, -1], [-.58, -1]),
    fold('tabard-hem-right', 'Shape the other hem corner', 'Follow the matching diagonal. The point is retained paper, not a slit or a pair of legs.', [.58, -.60], [0, -1], [.58, -1]),
    { kind: 'turn', id: 'tabard-front', title: 'Reveal the pointed tabard', hint: 'A long silhouette with a reverse band and pointed hem. No neck opening, ties or reviewed attachment positions.' },
  ] };
}
