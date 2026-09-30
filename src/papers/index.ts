import { borderPrint } from './borderPrint';
import { botanical } from './botanical';
import { cornerBloom } from './cornerBloom';
import { cutPaperMosaic } from './cutPaperMosaic';
import { diagnosticPaper } from './diagnostic';
import { fallingChevrons } from './fallingChevrons';
import { indigoLattice } from './indigoLattice';
import { inkReverse } from './inkReverse';
import { ivoryBorder } from './ivoryBorder';
import { midnightOrchard } from './midnightOrchard';
import { openStems } from './openStems';
import { pinstripeLining } from './pinstripeLining';
import { plumScatter } from './plumScatter';
import { reverseGarden } from './reverseGarden';
import { seedDashes } from './seedDashes';
import { stripeDisc } from './stripeDisc';
import { tidalBands } from './tidalBands';
import { wideFrame } from './wideFrame';
import { wovenChecks } from './wovenChecks';
import { PaperDesign } from './types';

export type { PaperDesign } from './types';

/**
 * Every paper, in swatch order. To add one: write a PaperDesign (see types.ts)
 * and list it here. Hidden papers are reachable with ?paper=<id>.
 */
export const PAPERS: PaperDesign[] = [
  stripeDisc,
  ivoryBorder,
  indigoLattice,
  botanical,
  wideFrame,
  cornerBloom,
  openStems,
  fallingChevrons,
  seedDashes,
  inkReverse,
  midnightOrchard,
  tidalBands,
  plumScatter,
  cutPaperMosaic,
  wovenChecks,
  reverseGarden,
  pinstripeLining,
  borderPrint,
  diagnosticPaper,
];

export const DEFAULT_PAPER_ID = 'stripe-disc';

export function findPaper(id: string | null | undefined): PaperDesign {
  return PAPERS.find((p) => p.id === id) ?? PAPERS.find((p) => p.id === DEFAULT_PAPER_ID)!;
}
