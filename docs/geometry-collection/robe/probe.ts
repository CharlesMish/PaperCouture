import {buildCrossFrontRobe} from './crossFrontRobeStudy';
import {buildDress} from '../../../src/fold/construction';
import {buildJacket} from '../../../src/fold/jacket';
import {buildTimeline,evaluateFrame,posePoint} from '../../../src/fold/timeline';
import {checkState,modelPoly,isFlipped} from '../../../src/fold/engine';
import {writeFileSync} from 'node:fs';
const all=[];
for(const c of [buildCrossFrontRobe(),buildDress(),buildJacket()]){
const t=buildTimeline(c.ops); const errs=t.states.flatMap((s,i)=>checkState(s,`${c.name} ${i}`)); let gap=0,minZ=1e9;
for(const o of t.ops)for(let i=0;i<=20;i++) { const m=evaluateFrame(o,i/20);for(const h of o.hinges)for(const p of[h.m0,h.m1]){const a=posePoint(m,h.a*12,p.x,p.y),b=posePoint(m,h.b*12,p.x,p.y); gap=Math.max(gap,Math.hypot(...a.map((v,j)=>v-b[j])));}for(const p of o.pieces)for(const v of p.poly)minZ=Math.min(minZ,posePoint(m,p.index*12,v.x,v.y)[2]);}
console.log(c.name,errs,gap,minZ);
all.push({name:c.name,states:t.states.map(s=>s.facets.map(f=>({poly:modelPoly(f),rank:f.rank,flip:isFlipped(f),tags:f.tags})))});
}
writeFileSync('docs/geometry-collection/robe/probe.json',JSON.stringify(all));
