import { PaperDesign } from './types';
import { solid } from './util';

// One large flower, low and left of centre, big enough that the left side
// crease cuts through its outer petals. The rest of the sheet is bare, so
// turning the pattern moves the whole motif onto a different part of the dress.

const GROUND = '#f6f0e4';
const LEAF = '#2f4a3c';
const LEAF_PALE = '#6d8c60';
const PETAL = '#c4483a';
const PETAL_LIT = '#e38974';
const HEART = '#f0c36a';
const SEED = '#3c2a24';

export const cornerBloom: PaperDesign = {
  id: 'corner-bloom',
  name: 'Corner bloom',
  note: 'One large flower set low and to the left',
  reverse: LEAF,
  drawFront(ctx, S) {
    solid(ctx, S, GROUND);
    const cx = S * 0.3;
    const cy = S * 0.66;
    ctx.save();
    ctx.translate(cx, cy);

    // two leaves reaching toward the left edge, across the side crease
    const leaf = (rot: number, len: number, wid: number, colour: string) => {
      ctx.save();
      ctx.rotate(rot);
      ctx.fillStyle = colour;
      ctx.beginPath();
      ctx.ellipse(-len * 0.45, 0, len * 0.5, wid, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    leaf(0.55, S * 0.2, S * 0.055, LEAF);
    leaf(2.35, S * 0.16, S * 0.042, LEAF_PALE);

    const ring = (n: number, radius: number, len: number, wid: number, colour: string, spin: number) => {
      for (let i = 0; i < n; i++) {
        const a = spin + (i / n) * Math.PI * 2;
        ctx.save();
        ctx.rotate(a);
        ctx.translate(0, -radius);
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.ellipse(0, 0, wid, len, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };
    ring(8, S * 0.02, S * 0.095, S * 0.04, PETAL, 0.15);
    ring(6, S * 0.012, S * 0.058, S * 0.026, PETAL_LIT, 0.45);
    ctx.beginPath();
    ctx.arc(0, 0, S * 0.028, 0, Math.PI * 2);
    ctx.fillStyle = HEART;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, S * 0.012, 0, Math.PI * 2);
    ctx.fillStyle = SEED;
    ctx.fill();
    ctx.restore();
  },
  drawBack(ctx, S) {
    solid(ctx, S, LEAF);
  },
};
