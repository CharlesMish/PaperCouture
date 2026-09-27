import { PaperDesign } from './types';
import { solid } from './util';

// Every chevron points toward the bottom edge, and the marks get heavier in
// that same direction. A quarter turn points them at a side; a half turn
// points them at the collar and puts the heavy row at the neck.

const GROUND = '#f2efe8';

export const fallingChevrons: PaperDesign = {
  id: 'falling-chevrons',
  name: 'Falling chevrons',
  note: 'Chevrons and weight both point toward one edge',
  reverse: '#8d8a84',
  drawFront(ctx, S) {
    solid(ctx, S, GROUND);
    const cols = 7;
    const rows = 9;
    const gx = S / cols;
    const gy = S / rows;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let row = 0; row < rows; row++) {
      const t = row / (rows - 1);
      const width = S * (0.007 + t * 0.012);
      const ink = Math.round(150 - t * 115);
      ctx.strokeStyle = `rgb(${ink},${ink - 4},${ink - 8})`;
      ctx.lineWidth = width;
      const arm = gx * 0.26;
      const drop = gy * 0.22;
      for (let col = 0; col < cols; col++) {
        const x = (col + 0.5) * gx;
        const y = (row + 0.55) * gy;
        ctx.beginPath();
        ctx.moveTo(x - arm, y - drop);
        ctx.lineTo(x, y + drop);
        ctx.lineTo(x + arm, y - drop);
        ctx.stroke();
      }
    }
  },
  drawBack(ctx, S) {
    solid(ctx, S, '#8d8a84');
  },
};
