import type { PaperDesign, PrintPosition } from './types';

export const ORIGINAL: Readonly<PrintPosition> = { x: 0, y: 0 };

/** Offsets are fractions of the sheet, right/up as seen from its printed front. */
export function normalizePosition(paper: PaperDesign, input: PrintPosition): PrintPosition {
  const p = paper.placement;
  if (!p || !Number.isFinite(input.x) || !Number.isFinite(input.y)) return { ...ORIGINAL };
  if (p.kind === 'snap') {
    const match = p.positions.find(s => s.x === input.x && s.y === input.y);
    return match ? { x: match.x, y: match.y } : { ...ORIGINAL };
  }
  const limit = Math.floor(p.limit * 256) / 256;
  const bound = (v: number) => Math.max(-limit, Math.min(limit, Math.round(v * 256) / 256));
  return { x: bound(input.x) || 0, y: bound(input.y) || 0 };
}

export function positionFromParams(paper: PaperDesign, params: URLSearchParams): PrintPosition {
  return normalizePosition(paper, { x: Number(params.get('printX')), y: Number(params.get('printY')) });
}

export function positionToParams(p: PrintPosition, params: URLSearchParams): void {
  for (const [key, v] of [['printX', p.x], ['printY', p.y]] as const) {
    if (v) params.set(key, String(v)); else params.delete(key);
  }
}

/** Undo the sampling rotation; the back canvas then mirrors x, once. */
export function sourceShift(p: PrintPosition, quarterTurns: number): PrintPosition {
  const a = -quarterTurns * Math.PI / 2;
  return { x: Math.cos(a) * p.x + Math.sin(a) * p.y, y: -Math.sin(a) * p.x + Math.cos(a) * p.y };
}

export function placementNote(p: PaperDesign): string {
  if (p.placement?.kind === 'slide') return `Slide the artwork up to ${Math.round(p.placement.limit * 100)}% of the square in each direction. Artwork can leave the edges; it does not wrap around. The paper grain stays in place.`;
  if (p.placement?.kind === 'snap') return 'This dash repeats every 1/16 of the sheet. Try a half-cell shift; the repeat continues at the edges. The paper grain stays in place.';
  return p.placementNote ?? 'This paper keeps its authored placement. Its two sides have not been verified for sliding or seamless repeats. You can still turn the paper.';
}
