import { borderPrint } from './borderPrint';
import { botanical } from './botanical';
import { compassLining } from './compassLining';
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
import { starlitLining } from './starlitLining';
import { stripeDisc } from './stripeDisc';
import { tidalBands } from './tidalBands';
import { wideFrame } from './wideFrame';
import { wovenChecks } from './wovenChecks';
import { PaperDesign } from './types';
import { runningStitch } from './runningStitch';
import { arcStudy } from './arcStudy';

export type { PaperDesign } from './types';

/**
 * One scroll: quiet/reliable pairings first, placement-dependent studies later.
 * Curation is editorial guidance, not physical-paper certification. Every old
 * visible paper remains selectable by its original id. Default stays unchanged.
 */
export const PAPERS: PaperDesign[] = [
  stripeDisc,
  runningStitch,
  pinstripeLining,
  plumScatter,
  borderPrint,
  botanical,
  indigoLattice,
  ivoryBorder,
  // More placement-dependent and bolder alternatives, in the same scroller.
  arcStudy,
  cornerBloom,
  midnightOrchard,
  tidalBands,
  wovenChecks,
  seedDashes,
  inkReverse,
  reverseGarden,
  starlitLining,
  openStems,
  fallingChevrons,
  cutPaperMosaic,
  wideFrame,
  compassLining,
  diagnosticPaper,
].map(p => ({ ...p, curation: ['stripe-disc', 'running-stitch', 'pinstripe-lining', 'plum-scatter', 'border-print', 'botanical', 'indigo-lattice', 'ivory-border'].includes(p.id) ? 'curated' : 'experimental' }));

export const DEFAULT_PAPER_ID = 'stripe-disc';

export function findPaper(id: string | null | undefined): PaperDesign {
  return PAPERS.find((p) => p.id === id) ?? PAPERS.find((p) => p.id === DEFAULT_PAPER_ID)!;
}
