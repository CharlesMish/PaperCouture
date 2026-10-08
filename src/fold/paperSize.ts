/** New captures use one board unit per 10 cm of starting paper. The folding
 * workshop is a close-up; its unchanged material square is two model units.
 * This convention does not assign a paper size to older frozen captures. */
export const REFERENCE_SQUARE_CM = 20;

/** A smaller square preserves the authored folds and placement of the print.
 * Extra folds would change both the silhouette and which ink remains visible. */
const recommended: Readonly<Record<string, number>> = {
  clutch: 8,
  apron: 14,
  'boat-top': 16,
  'wrap-top': 18,
  hat: 8,
  capelet: 18,
  necktie: 7,
  'camp-shirt': 18,
  'boot-left': 8,
  'boot-right': 8,
  'framed-brooch': 4.5,
};
export function recommendedSquareCm(designId: string): number {
  return recommended[designId] ?? REFERENCE_SQUARE_CM;
}

export interface PaperSizeSource {
  /** Stable only during this workshop session, to remember the chosen size. */
  key: string;
  /** Side of the main square represented by the source object's current scale. */
  referenceCm: number;
  recommendedCm: number;
  /** Other squares in this capture, at its current scale (e.g. both bow wings). */
  companionCm?: number[];
}
export interface StartingPaperSize { sideCm: number; companionCm?: number[] }
const rounded = (n: number) => Math.round(n * 100) / 100;
export function squareChoices(source: PaperSizeSource): number[] {
  return [...new Set([source.recommendedCm * .8, source.recommendedCm, source.recommendedCm * 1.2, source.referenceCm].map(rounded))].sort((a, b) => a - b);
}
export function startingPaperSize(source: PaperSizeSource, sideCm: number): StartingPaperSize {
  return { sideCm, ...(source.companionCm?.length ? { companionCm: source.companionCm.map(n => rounded(n * sideCm / source.referenceCm)) } : {}) };
}
export function describePaperSize(size: StartingPaperSize): string {
  return `${size.sideCm} cm square${size.companionCm?.length ? ` + ${size.companionCm.map(n => `${n} cm`).join(', ')} accessory square${size.companionCm.length === 1 ? '' : 's'}` : ''}`;
}
