import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { buildGarment, garmentDisplayAngle } from '../src/fold/garments';
import { recommendedSquareCm } from '../src/fold/paperSize';
import { checkState, findAdjacency, modelPoly } from '../src/fold/engine';
import { centroid, signedArea } from '../src/fold/geometry';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../src/fold/timeline';
import { FoldController } from '../src/app/controller';
import { landings, materialPoint } from './paperLanding';
import { interiorPiercing } from './experiment-collision';
import { buildNotchCrop } from './external-review/notchCrop';
import { buildReconstructedBolero } from './external-review/reconstructedBolero';
const distance=(a:number[],b:number[])=>Math.hypot(...a.map((v,i)=>v-b[i]));
const report=[];
for(const id of ['necktie','notch-crop','bolero-study','capelet','camp-shirt'] as const){
 const c=id==='notch-crop'?buildNotchCrop():id==='bolero-study'?buildReconstructedBolero():buildGarment(id),tl=buildTimeline(c.ops);let gap=0,stretch=0,z=Infinity,piercings=0,continuity=0;
 for(const [i,s]of tl.states.entries()){
  assert.deepEqual(checkState(s,id+':'+i),[]);assert(Math.abs(s.facets.reduce((n,f)=>n+signedArea(f.poly),0)-4)<1e-9);
  const seen=new Set([s.facets[0].id]),adj=findAdjacency(s.facets);for(let i=0;i<s.facets.length;i++)for(const h of adj)if(seen.has(h.a.id)||seen.has(h.b.id)){seen.add(h.a.id);seen.add(h.b.id)}assert.equal(seen.size,s.facets.length);
 }
 for(const op of tl.ops)for(let n=0;n<=160;n++){
  const M=evaluateFrame(op,n/160);
  for(const p of op.pieces)for(let j=0;j<p.poly.length;j++){const a=p.poly[j],b=p.poly[(j+1)%p.poly.length];stretch=Math.max(stretch,Math.abs(distance(posePoint(M,p.index*12,a.x,a.y),posePoint(M,p.index*12,b.x,b.y))-Math.hypot(a.x-b.x,a.y-b.y)));z=Math.min(z,posePoint(M,p.index*12,a.x,a.y)[2]);}
  for(const h of op.hinges)for(const p of [h.m0,h.m1])gap=Math.max(gap,distance(posePoint(M,h.a*12,p.x,p.y),posePoint(M,h.b*12,p.x,p.y)));
  const tris=op.pieces.flatMap(p=>p.poly.slice(1,-1).map((_,j)=>({id:p.id,p:[p.poly[0],p.poly[j+1],p.poly[j+2]].map(m=>posePoint(M,p.index*12,m.x,m.y))})));
  for(let a=0;a<tris.length;a++)for(let b=a+1;b<tris.length;b++)if(tris[a].id!==tris[b].id&&interiorPiercing(tris[a].p,tris[b].p))piercings++;
 }
 for(let n=1;n<tl.ops.length;n++){
  const a=tl.ops[n-1],b=tl.ops[n],A=evaluateFrame(a,1),B=evaluateFrame(b,0);
  for(const p of b.pieces){const m=centroid(p.poly),q=a.pieces.find(p=>p.poly.every((v,j)=>{const w=p.poly[(j+1)%p.poly.length];return(w.x-v.x)*(m.y-v.y)-(w.y-v.y)*(m.x-v.x)>=-1e-10}));assert(q);for(const m of p.poly)continuity=Math.max(continuity,distance(posePoint(A,q.index*12,m.x,m.y),posePoint(B,p.index*12,m.x,m.y)));}
 }
 assert(gap<=8*LAYER_GAP+1e-12&&z>=-1e-9&&stretch<1e-9&&continuity<1e-9);assert.equal(piercings,0);
 const ctrl=new FoldController(c.ops.length,()=>1);for(let n=0;n<c.ops.length;n++){ctrl.next();ctrl.update(.42);const mid=ctrl.pose();ctrl.prev();assert.deepEqual(ctrl.pose(),mid);ctrl.update(2);assert.equal(ctrl.step,n);ctrl.next();ctrl.update(2)}for(let n=c.ops.length;n>0;n--){ctrl.prev();ctrl.update(2);assert.equal(ctrl.step,n-1)}
 const final=tl.states.at(-1)!,angle=id==='necktie'?garmentDisplayAngle(id):0,pts=final.facets.flatMap(modelPoly).map(p=>({x:p.x*Math.cos(angle)-p.y*Math.sin(angle),y:p.x*Math.sin(angle)+p.y*Math.cos(angle)}));
 const dims=[Math.max(...pts.map(p=>p.x))-Math.min(...pts.map(p=>p.x)),Math.max(...pts.map(p=>p.y))-Math.min(...pts.map(p=>p.y))];
 const L=landings(final,48),visible={frontPrint:L.filter(x=>x.front==='print').length,frontReverse:L.filter(x=>x.front==='reverse').length,backPrint:L.filter(x=>x.back==='print').length,backReverse:L.filter(x=>x.back==='reverse').length};
 const bloom=[0,1,2,3].map(q=>{const m=materialPoint(.3,.66,'print',q),nearest=L.reduce((a,b)=>Math.hypot(a.m.x-m.x,a.m.y-m.y)<Math.hypot(b.m.x-m.x,b.m.y-m.y)?a:b);return{turn:q,originalCentreFront:nearest.front,originalMaterial:m}});
 const cm=id==='notch-crop'?18:id==='bolero-study'?16:recommendedSquareCm(id);
 report.push({id,provenance:id==='bolero-study'?'reconstructed from supplied notes, not supplied source':'actual source',steps:c.ops.length,facets:final.facets.length,area:4,model:dims,cm,board:dims.map(v=>v*cm/20),samplesPerOp:161,maxHingeGap:gap,hingeLimit:8*LAYER_GAP,minZ:z,stretch,continuity,piercings,visible48:visible,bloom});
}
writeFileSync(process.env.REVIEW_REPORT || 'docs/external-review/independent-geometry.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
