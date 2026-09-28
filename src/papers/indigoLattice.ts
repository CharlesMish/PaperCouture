import { PaperDesign } from './types';
import { solid } from './util';

// Indigo ground with a pale diagonal lattice, small diamonds in alternate
// cells and ochre dots at the others. A regular repeat: folds show up as
// places where the lattice changes direction.

const INDIGO = '#243760';
const PALE = '#d9d3c3';
const OCHRE = '#c49a45';

export const indigoLattice: PaperDesign = {
  id: 'indigo-lattice',
  name: 'Indigo lattice',
  note: 'A regular diagonal lattice, pale on indigo',
  reverse: OCHRE,
  drawFront(ctx, S) {
    solid(ctx, S, INDIGO);
    const n = 11;
    const c = S / n;
    ctx.strokeStyle = PALE;
    ctx.globalAlpha = 0.85;
    ctx.lineWidth = S * 0.0028;
    ctx.beginPath();
    for (let i = -n; i <= 2 * n; i++) {
      ctx.moveTo(i * c, 0);
      ctx.lineTo(i * c + S, S);
      ctx.moveTo(i * c, 0);
      ctx.lineTo(i * c - S, S);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    // cell centres sit on a half-cell checkerboard
    for (let i = 0; i <= 2 * n; i++) {
      for (let j = 0; j <= 2 * n; j++) {
        if ((i + j) % 2 === 0) continue;
        const x = (i * c) / 2;
        const y = (j * c) / 2;
        if ((i + j) % 4 === 1) {
          const k = c * 0.14;
          ctx.fillStyle = PALE;
          ctx.beginPath();
          ctx.moveTo(x, y - k);
          ctx.lineTo(x + k, y);
          ctx.lineTo(x, y + k);
          ctx.lineTo(x - k, y);
          ctx.closePath();
          ctx.fill();
        } else {
          ctx.fillStyle = OCHRE;
          ctx.beginPath();
          ctx.arc(x, y, c * 0.055, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  },
  drawBack(ctx, S) {
    solid(ctx, S, OCHRE);
  },
};
