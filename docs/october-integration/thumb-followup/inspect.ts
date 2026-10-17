import { thumbVariant } from './variants';
import { buildTimeline } from '../../../src/fold/timeline';
import { modelPoly, isFlipped } from '../../../src/fold/engine';
import { signedArea } from '../../../src/fold/geometry';
const inside=(poly: {x:number;y:number}[],x:number,y:number)=>poly.every((a,i)=>{const b=poly[(i+1)%poly.length];return (b.x-a.x)*(y-a.y)-(b.y-a.y)*(x-a.x)>-1e-10;});
for (const cuff of [.3,.25,.2]) for (const hand of ['left','right'] as const) {
 const c=thumbVariant(cuff===.3?'baseline':'proposed',hand,cuff),state=buildTimeline(c.ops).states.at(-1)!;
 const visible=(x:number,y:number)=>{const f=state.facets.filter(f=>{const p=modelPoly(f);return inside(signedArea(p)<0?p.reverse():p,x,y);}).sort((a,b)=>b.rank-a.rank)[0];return f?{id:f.id,reverse:isFlipped(f),rank:f.rank}:null;};
 const all=state.facets.flatMap(modelPoly),s=hand==='left'?-1:1;
 const tip=all.filter(p=>s*p.x>.5+1e-8).sort((a,b)=>s*(b.x-a.x))[0],cuffTop=-1+2*cuff;
 console.log(JSON.stringify({cuff,hand,thumbTip:tip,cuffTop,thumbRiseCm:(tip.y-cuffTop)*3,widthCm:(Math.max(...all.map(p=>p.x))-Math.min(...all.map(p=>p.x)))*3,heightCm:(Math.max(...all.map(p=>p.y))-Math.min(...all.map(p=>p.y)))*3,oldCuffSample:visible(0,-.55),cuffMidpointSample:visible(0,-1+1.5*cuff),oldThumbSample:visible(s*.70,-.42)}));
}
