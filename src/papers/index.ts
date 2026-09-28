import { botanical } from './botanical';
import { diagnosticPaper } from './diagnostic';
import { indigoLattice } from './indigoLattice';
import { ivoryBorder } from './ivoryBorder';
import { stripeDisc } from './stripeDisc';
import { PaperDesign } from './types';

export type { PaperDesign } from './types';

/**
 * Every paper, in swatch order. To add one: write a PaperDesign (see types.ts)
 * and list it here. Hidden papers are reachable with ?paper=<id>.
 */
export const PAPERS: PaperDesign[] = [stripeDisc, ivoryBorder, indigoLattice, botanical, diagnosticPaper];

export const DEFAULT_PAPER_ID = 'stripe-disc';

export function findPaper(id: string | null | undefined): PaperDesign {
  return PAPERS.find((p) => p.id === id) ?? PAPERS.find((p) => p.id === DEFAULT_PAPER_ID)!;
}
