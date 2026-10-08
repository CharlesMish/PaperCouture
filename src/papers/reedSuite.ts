import type { PaperDesign } from './types';
import { rng, solid } from './util';

// Three deliberately small companions: a movable motif, a directional texture,
// and a quiet fleck. All ink is original deterministic Canvas artwork.
const INK = '#315b5b', PEARL = '#eee5d3', COPPER = '#b77957', MIST = '#a8b9ad';

function reeds(ctx: CanvasRenderingContext2D, S: number, back = false) {
  ctx.save(); ctx.scale(S, S);
  if (back) { ctx.translate(1, 0); ctx.scale(-1, 1); }
  ctx.lineCap = 'round';
  for (const [x, y, scale, angle] of [[.22,.33,.86,-.13],[.76,.65,1,.13],[.46,.83,.58,-.2]]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle); ctx.scale(scale, scale);
    for (const [dx, height, lean] of [[-.026,.13,-.023],[.014,.19,.014],[.043,.105,.029]]) {
      ctx.strokeStyle = back ? PEARL : INK; ctx.lineWidth = .003;
      ctx.beginPath(); ctx.moveTo(0, .13); ctx.quadraticCurveTo(dx, .045, dx + lean, -height); ctx.stroke();
      ctx.strokeStyle = back ? '#d1b295' : COPPER; ctx.lineWidth = .013;
      ctx.beginPath(); ctx.moveTo(dx + lean, -height); ctx.lineTo(dx + lean * 1.07, -height - .031); ctx.stroke();
    }
    for (const side of [-1, 1]) {
      ctx.fillStyle = back ? MIST : INK;
      ctx.beginPath(); ctx.moveTo(0,.10); ctx.quadraticCurveTo(side*.028,-.008,side*.091,-.018);
      ctx.quadraticCurveTo(side*.052,.041,0,.10); ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

export const reedStudy: PaperDesign = {
  id: 'reed-study', name: 'Reed study', reverse: INK,
  note: 'Copper seedheads and petrol reeds on pearl; matching pale reeds behind',
  placementNote: 'Slide a reed cluster onto a front panel. The pale reverse marks follow the same material positions; a fold can hide part of a stem.',
  placement: { kind: 'slide', limit: .25, frontGround: PEARL, backGround: INK,
    front: (ctx,S) => reeds(ctx,S), back: (ctx,S) => reeds(ctx,S,true) },
  drawFront(ctx,S) { solid(ctx,S,PEARL); reeds(ctx,S); },
  drawBack(ctx,S) { solid(ctx,S,INK); reeds(ctx,S,true); },
};

function twill(ctx: CanvasRenderingContext2D, S: number, back: boolean) {
  solid(ctx,S,back ? COPPER : INK);
  ctx.strokeStyle = back ? '#d5a987' : MIST; ctx.lineWidth = S*.0015; ctx.lineCap = 'round';
  for (let row = -1; row < 34; row++) for (let col = -1; col < 34; col++) {
    const x = col*.032 + (row%2)*.006, y = row*.032;
    const direction = Math.floor(col/4)%2 ? -1 : 1;
    ctx.beginPath(); ctx.moveTo(x*S,y*S); ctx.lineTo((x+.015)*S,(y+direction*.013)*S); ctx.stroke();
  }
}
export const brokenTwill: PaperDesign = {
  id: 'broken-twill', name: 'Broken twill', reverse: COPPER,
  note: 'Fine alternating diagonal marks on petrol, with a warm copper reverse',
  placementNote: 'A small printed twill rhythm. Quarter-turns change the diagonal direction; it is ink, not woven cloth.',
  drawFront: (ctx,S) => twill(ctx,S,false), drawBack: (ctx,S) => twill(ctx,S,true),
};

function fleck(ctx: CanvasRenderingContext2D, S: number, back: boolean) {
  solid(ctx,S,back ? PEARL : COPPER);
  const random = rng(back ? 813 : 812);
  for (let i=0;i<950;i++) {
    const x=random(),y=random(),length=.0018+random()*.004;
    ctx.fillStyle = i%3 ? (back ? '#d0bea7' : '#d6a786') : (back ? MIST : '#855743');
    ctx.beginPath(); ctx.ellipse(x*S,y*S,length*S,.0009*S,random()*Math.PI,0,Math.PI*2); ctx.fill();
  }
}
export const copperFleck: PaperDesign = {
  id: 'copper-fleck', name: 'Copper fleck', reverse: PEARL,
  note: 'Quiet copper with tiny irregular ink flecks and a pearl reverse',
  drawFront: (ctx,S) => fleck(ctx,S,false), drawBack: (ctx,S) => fleck(ctx,S,true),
};
