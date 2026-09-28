// A paper design is two drawings on a square canvas. Adding a paper never
// touches folding code: write a PaperDesign and list it in papers/index.ts.
//
// Canvas orientation:
//  - drawFront: canvas top-left is the sheet's top-left corner as it first lies
//    on the table, printed side up (material corner (-1, 1)).
//  - drawBack: drawn as seen from BEHIND the sheet, so text and asymmetric
//    motifs read correctly once the paper is turned over. Canvas top-left is
//    then material corner (1, 1).

export interface PaperDesign {
  id: string;
  name: string;
  /** One short line shown with the swatch. */
  note: string;
  /** CSS colour of the reverse side; the interface borrows it as an accent. */
  reverse: string;
  drawFront(ctx: CanvasRenderingContext2D, size: number): void;
  drawBack(ctx: CanvasRenderingContext2D, size: number): void;
  /** Hidden from the swatch row (diagnostic papers). */
  hidden?: boolean;
}
