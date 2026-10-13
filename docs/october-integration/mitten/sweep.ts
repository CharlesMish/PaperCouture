import {buildMitten, MITTEN} from '../../design-pass-2026-10/origami/mittenStudy';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP } from '../../../src/fold/timeline';
import { v2 } from '../../../src/fold/geometry';
import { modelPoly } from '../../../src/fold/engine';
import { hingeProblems } from '../../../scripts/hingeCheck';
import { creasePattern, vertexProblems } from '../../../scripts/crease_pattern';
import type { Construction } from '../../../src/fold/construction';
export const variant=(cuff:number,side:number,thumbAt:number,top:number,tip=.16):Construction=>{
 const c=buildMitten('left',{cuff,side,thumbAt,tip});
 if(top<1){
 c.ops.splice(2,0,{kind:'fold',id:'mitt-top',title:'Shorten the hand',hint:'Fold the retained upper strip behind the palm.',folds:[{name:'mitt-top',a:v2(-1.5,top),b:v2(1.5,top),moving:v2(0,1),sense:'valley'}]});
 for(const op of c.ops)if(op.kind==='fold'&&op.id.startsWith('mitt-tip-'))for(const f of op.folds){f.a.y-=1-top;f.b.y-=1-top;f.moving.y-=1-top;}
 }
 return c;
};
if(process.argv.includes('--sweep')){
for(const top of [.45,.55,.65,.75])for(const cuff of [.24,.30,.36])for(const side of [.49,.5,.52,.55,.58,.6])for(const thumbAt of [.15,.30,.50])try{
 const c=variant(cuff,side,thumbAt,top),tl=buildTimeline(c.ops);
 const fails=tl.ops.flatMap(hingeProblems);if(fails.length)continue;
 const cp=vertexProblems(creasePattern(c));if(cp.length)continue;
 let gap=0;for(const op of tl.ops)for(const t of [0,.25,.5,.75,1]){const M=evaluateFrame(op,t);for(const h of op.hinges)for(const m of [h.m0,h.m1]){const a=posePoint(M,h.a*12,m.x,m.y),b=posePoint(M,h.b*12,m.x,m.y);gap=Math.max(gap,Math.hypot(...a.map((x,i)=>x-b[i])));}}
 if(gap>8*LAYER_GAP+1e-9)continue;
 const q=tl.states.at(-1)!.facets.flatMap(modelPoly);const width=Math.max(...q.map(x=>x.x))-Math.min(...q.map(x=>x.x));
 console.log(JSON.stringify({top,cuff,side,thumbAt,gap,width,height:top+1-cuff}));
}catch(e){}
}
