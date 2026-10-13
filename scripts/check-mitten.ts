// Focused regression for the recovered flat mitten. Geometry diagnostics are
// not physical-paper certification or a continuous-collision proof.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { buildMitten } from '../src/fold/mitten';
import { buildGarment, GARMENTS, attachmentAnchors } from '../src/fold/garments';
import { recommendedSquareCm } from '../src/fold/paperSize';
import { checkState, modelPoly, findAdjacency, isFlipped, type SheetState } from '../src/fold/engine';
import { centroid, signedArea, type Vec2 } from '../src/fold/geometry';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../src/fold/timeline';
import { creasePattern, vertexProblems } from './crease_pattern';
import { hingeProblems } from './hingeCheck';
import { interiorPiercing } from './experiment-collision';
import { FoldController } from '../src/app/controller';

const inside = (poly: Vec2[], p: Vec2) => poly.every((a, i) => {
  const b = poly[(i + 1) % poly.length];
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1e-10;
});
const visibleAt=(s: SheetState,x:number,y:number)=>s.facets.filter(f=>{
  const poly=modelPoly(f);return inside(signedArea(poly)<0?poly.reverse():poly,{x,y});
}).sort((a,b)=>b.rank-a.rank)[0];
const dist=(a:number[],b:number[])=>Math.hypot(...a.map((x,i)=>x-b[i]));
const results=[];
for(const hand of ['left','right'] as const){
  const c=buildMitten(hand), tl=buildTimeline(c.ops);
  const id = `mitten-${hand}` as const;
  assert.deepEqual(buildGarment(id), c, 'registry resolves to the reviewed construction');
  assert(GARMENTS.find(g => g.id === id)?.experiment?.includes('no hand opening'));
  assert.equal(recommendedSquareCm(id), 6);
  assert.deepEqual(attachmentAnchors(id, .75, -.7), []);
  assert.equal(c.ops.length,9);
  assert.equal(new Set(c.ops.map(op=>op.id)).size,c.ops.length);
  assert(c.ops.every(op=>op.kind==='turn'||(op.kind==='fold'&&op.folds.every(f=>f.sense==='valley'))));
  for(const [i,s] of tl.states.entries()){
    assert.deepEqual(checkState(s,`${hand}:${i}`),[]);
    assert(Math.abs(s.facets.reduce((n,f)=>n+signedArea(f.poly),0)-4)<1e-9);
    for(const f of s.facets)for(const p of f.poly)assert(Math.abs(p.x)<=1+1e-9&&Math.abs(p.y)<=1+1e-9);
    const adjacency=findAdjacency(s.facets),visited=new Set([s.facets[0].id]);
    while(true){const n=visited.size;for(const h of adjacency)if(visited.has(h.a.id)||visited.has(h.b.id)){visited.add(h.a.id);visited.add(h.b.id);}if(n===visited.size)break;}
    assert.equal(visited.size,s.facets.length,'all retained facets belong to one continuous sheet');
  }
  let maxEdgeError=0,maxHingeGap=0,maxIdealHingeGap=0,minZ=Infinity;const operations=[];
  for(const op of tl.ops){
    assert.deepEqual(hingeProblems(op),[]);
    let piercings=0,gap=0;
    // Diagnostic only: remove artificial layer spacing, leaving exactly the same
    // crease transforms and path. This is not a renderer or construction change.
    const ideal={...op,maxPreZ:0,pieces:op.pieces.map(p=>({...p,preZ:0,postZ:0}))};
    for(let k=0;k<=160;k++){
      const M=evaluateFrame(op,k/160),I=evaluateFrame(ideal,k/160);
      for(const h of ideal.hinges)for(const m of [h.m0,h.m1])maxIdealHingeGap=Math.max(maxIdealHingeGap,dist(posePoint(I,h.a*12,m.x,m.y),posePoint(I,h.b*12,m.x,m.y)));
      for(const p of op.pieces)for(let i=0;i<p.poly.length;i++){
        const a=p.poly[i],b=p.poly[(i+1)%p.poly.length];
        const A=posePoint(M,p.index*12,a.x,a.y),B=posePoint(M,p.index*12,b.x,b.y);
        minZ=Math.min(minZ,A[2]);maxEdgeError=Math.max(maxEdgeError,Math.abs(dist(A,B)-Math.hypot(a.x-b.x,a.y-b.y)));
      }
      for(const h of op.hinges)for(const m of [h.m0,h.m1])gap=Math.max(gap,dist(posePoint(M,h.a*12,m.x,m.y),posePoint(M,h.b*12,m.x,m.y)));
      const tris=op.pieces.flatMap(p=>p.poly.slice(1,-1).map((_,j)=>({id:p.id,points:[p.poly[0],p.poly[j+1],p.poly[j+2]].map(m=>posePoint(M,p.index*12,m.x,m.y))})));
      for(let a=0;a<tris.length;a++)for(let b=a+1;b<tris.length;b++)if(tris[a].id!==tris[b].id&&interiorPiercing(tris[a].points,tris[b].points))piercings++;
    }
    assert.equal(piercings,0,`${hand}:${op.op.id} strict thin-triangle piercing`);
    assert(gap<=8*LAYER_GAP+1e-9,`${hand}:${op.op.id} unchanged absolute hinge guard`);
    maxHingeGap=Math.max(maxHingeGap,gap);operations.push({id:op.op.id,maxHingeGap:gap,strictTrianglePiercings:piercings});
  }
  assert(maxEdgeError<1e-9);assert(minZ>=-1e-9);assert(maxIdealHingeGap<1e-9);
  for(let i=1;i<tl.ops.length;i++){
    const a=tl.ops[i-1],b=tl.ops[i],A=evaluateFrame(a,1),B=evaluateFrame(b,0);
    for(const p of b.pieces){const source=a.pieces.find(q=>inside(q.poly,centroid(p.poly)));assert(source);for(const m of p.poly)assert(dist(posePoint(A,source.index*12,m.x,m.y),posePoint(B,p.index*12,m.x,m.y))<1e-9);}
  }
  const cp=creasePattern(c);assert.deepEqual(vertexProblems(cp),[]);
  const final=tl.states.at(-1)!,s=hand==='left'?-1:1;
  assert(!isFlipped(visibleAt(final,0,0)),'palm is the original printed face');
  assert(isFlipped(visibleAt(final,0,-.55)),'cuff shows the actual reverse');
  assert(isFlipped(visibleAt(final,s*.70,-.42)),'thumb shows the actual reverse');
  for(let step=0;step<c.ops.length;step++){
    const ctrl: FoldController=new FoldController(c.ops.length,()=>1);ctrl.jumpTo(step);ctrl.next();ctrl.update(.37);const pose: ReturnType<FoldController['pose']>=ctrl.pose();ctrl.prev();assert.deepEqual(ctrl.pose(),pose);ctrl.update(2);assert.equal(ctrl.step,step);
    ctrl.beginScrub();ctrl.scrubTo(.63);ctrl.endScrub(false);ctrl.update(2);assert.equal(ctrl.step,step);
    ctrl.next();ctrl.next();assert.equal(ctrl.step,step+1);ctrl.prev();ctrl.prev();assert.equal(ctrl.step,step);
  }
  const points=final.facets.flatMap(modelPoly);const width=Math.max(...points.map(p=>p.x))-Math.min(...points.map(p=>p.x)),height=Math.max(...points.map(p=>p.y))-Math.min(...points.map(p=>p.y));
  results.push({hand,steps:c.ops.length,facets:final.facets.length,creases:cp.length,retainedArea:4,width,height,suggestedSquareCm:6,finishedCm:{width:width*3,height:height*3},maxEdgeError,maxHingeGap,maxIdealHingeGap,hingeLimit:8*LAYER_GAP,minZ,samplesPerOperation:161,operations});
}
// Both hands are built by mirrored crease coordinates, not by display scaling.
const shape=(hand:'left'|'right')=>buildTimeline(buildMitten(hand).ops).states.at(-1)!.facets.map(f=>({poly:modelPoly(f).map(p=>`${Number((hand==='left'?-p.x:p.x).toFixed(8))},${Number(p.y.toFixed(8))}`).sort(),side:isFlipped(f)})).map(f=>JSON.stringify(f)).sort();
assert.deepEqual(shape('left'),shape('right'));
console.log(JSON.stringify({mitten:results,limits:'Sampled thin facets only. Intentional coplanar layering, finite rendering gaps, no paper thickness or hand opening; no continuous-collision or physical-paper certification.'},null,2));
if(process.argv.includes('--dump')){mkdirSync('docs/october-integration/mitten/evidence',{recursive:true});writeFileSync('docs/october-integration/mitten/evidence/geometry.json',JSON.stringify(results,null,2)+'\n');}
