import { PaperDesign } from './types';

// Numbered grid for checking continuity and layer order. Front cells are
// A1..H8 (row letter from the top edge, column number from the left edge).
// The back carries the same cell names in lower case directly behind each
// front cell, so a1 is always the other face of A1.

const ROWS = 'ABCDEFGH';

function grid(ctx: CanvasRenderingContext2D, size: number, bg: string, line: string, ink: string, back: boolean) {
  const c = size / 8;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = line;
  ctx.lineWidth = size / 400;
  for (let i = 1; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(i * c, 0);
    ctx.lineTo(i * c, size);
    ctx.moveTo(0, i * c);
    ctx.lineTo(size, i * c);
    ctx.stroke();
  }
  ctx.fillStyle = ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(c * 0.34)}px system-ui, sans-serif`;
  for (let r = 0; r < 8; r++) {
    for (let col = 0; col < 8; col++) {
      const label = back ? ROWS[r].toLowerCase() + (col + 1) : ROWS[r] + (col + 1);
      // back is drawn as seen from behind: material column `col` sits at canvas column 7 - col
      const x = (back ? 7 - col : col) * c + c / 2;
      ctx.fillText(label, x, r * c + c / 2);
    }
  }
}

export const diagnosticPaper: PaperDesign = {
  id: 'grid',
  name: 'Diagnostic grid',
  note: 'Numbered cells for checking the folds',
  reverse: '#4a5d7a',
  hidden: true,
  drawFront(ctx, size) {
    grid(ctx, size, '#f1e3b5', '#b09450', '#3a3120', false);
    // orientation mark in the original top-left corner
    ctx.fillStyle = '#b8452f';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size * 0.09, 0);
    ctx.lineTo(0, size * 0.09);
    ctx.fill();
  },
  drawBack(ctx, size) {
    grid(ctx, size, '#4a5d7a', '#7f93b3', '#e7edf6', true);
  },
};
