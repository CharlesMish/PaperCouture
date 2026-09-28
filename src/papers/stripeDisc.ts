import { PaperDesign } from './types';
import { rng, solid } from './util';

// Bold asymmetric study: diagonal stripes in an irregular rhythm with one
// large disc placed off-centre, left of the middle. Stripes reflect into
// chevrons wherever the paper folds, and the disc is easy to follow: by
// default it sits across the left side crease, half on the dress front and
// half wrapped round to the back. Rotate the pattern to send it elsewhere.

const GROUND = '#ece3cf';
const INK = '#2d2a27';
const OCHRE = '#c69438';
const DISC = '#b4492f';

export const stripeDisc: PaperDesign = {
  id: 'stripe-disc',
  name: 'Stripe and disc',
  note: 'Irregular diagonal stripes with one off-centre disc',
  reverse: '#56697f',
  drawFront(ctx, S) {
    solid(ctx, S, GROUND);
    const r = rng(11);
    ctx.save();
    ctx.translate(S / 2, S / 2);
    ctx.rotate(-Math.PI / 4);
    const R = S * 0.75;
    let x = -R;
    while (x < R) {
      // one "phrase": a heavy stripe, a thin ochre line, sometimes a hairline
      const heavy = S * (0.018 + r() * 0.03);
      ctx.fillStyle = INK;
      ctx.fillRect(x, -R, heavy, 2 * R);
      x += heavy + S * (0.012 + r() * 0.012);
      const thin = S * (0.006 + r() * 0.008);
      ctx.fillStyle = OCHRE;
      ctx.fillRect(x, -R, thin, 2 * R);
      x += thin;
      if (r() > 0.45) {
        x += S * 0.012;
        ctx.fillStyle = INK;
        ctx.fillRect(x, -R, S * 0.003, 2 * R);
        x += S * 0.003;
      }
      x += S * (0.04 + r() * 0.07);
    }
    ctx.restore();
    // the disc, with a ground-coloured ring so it separates from the stripes
    const cx = S * 0.28;
    const cy = S * 0.6;
    ctx.beginPath();
    ctx.arc(cx, cy, S * 0.165, 0, Math.PI * 2);
    ctx.fillStyle = GROUND;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, S * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = DISC;
    ctx.fill();
  },
  drawBack(ctx, S) {
    solid(ctx, S, '#56697f');
  },
};
