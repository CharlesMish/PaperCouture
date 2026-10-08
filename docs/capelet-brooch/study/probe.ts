import {writeFileSync} from 'node:fs';
import {CONCEPTS} from './concepts';
import {buildTimeline,evaluateFrame,posePoint} from '../../../src/fold/timeline';
import {modelPoly,isFlipped,checkState} from '../../../src/fold/engine';
import {buildCollaredCapelet} from './pr25Capelet';
import {buildOpenFrontCapelet} from '../../../src/fold/companionFolds';
import {buildFramedBrooch} from '../../../src/fold/framedBrooch';
import {interiorPiercing} from '../../../scripts/experiment-collision';
const candidates={old:buildCollaredCapelet(),...CONCEPTS,candidate:buildOpenFrontCapelet(),'brooch-square':buildFramedBrooch(),'brooch-rectangle':buildFramedBrooch('rectangle')}; const report:any[]=[];const svg:string[]=[];let idx=0;
for(const[id,c]of Object.entries(candidates)){
 try{const tl=buildTimeline(c.ops),final=tl.states.at(-1)!;for(const state of tl.states)if(checkState(state).length)throw Error('state');
 let gap=0,z=Infinity,piercings=0;
 for(const op of tl.ops)for(let n=0;n<=16;n++){const M=evaluateFrame(op,n/16);for(const h of op.hinges)for(const m of [h.m0,h.m1]){const a=posePoint(M,h.a*12,m.x,m.y),b=posePoint(M,h.b*12,m.x,m.y);gap=Math.max(gap,Math.hypot(...a.map((v,i)=>v-b[i])))}for(const p of op.pieces)for(const m of p.poly)z=Math.min(z,posePoint(M,p.index*12,m.x,m.y)[2]);const triangles=op.pieces.flatMap(p=>p.poly.slice(1,-1).map((_,j)=>({id:p.id,p:[p.poly[0],p.poly[j+1],p.poly[j+2]].map(m=>posePoint(M,p.index*12,m.x,m.y))})));for(let a=0;a<triangles.length;a++)for(let b=a+1;b<triangles.length;b++)if(triangles[a].id!==triangles[b].id&&interiorPiercing(triangles[a].p,triangles[b].p))piercings++}
 const points=final.facets.flatMap(modelPoly),xs=points.map(p=>p.x),ys=points.map(p=>p.y),loX=Math.min(...xs),hiX=Math.max(...xs),loY=Math.min(...ys),hiY=Math.max(...ys);report.push({id,name:c.name,steps:c.ops.length,width:hiX-loX,height:hiY-loY,gap,z,piercings});
 const x=(idx%4)*440,y=Math.floor(idx/4)*240;idx++;svg.push(`<g transform="translate(${x},${y})"><rect x="4" y="4" width="432" height="232" fill="#f5f2e9"/><text x="15" y="25" font-size="15">${id}</text><text x="15" y="45" font-size="12">${(hiX-loX).toFixed(2)}×${(hiY-loY).toFixed(2)} gap${gap.toFixed(4)} pierce${piercings}</text>`);
 for(const back of [false,true]){const scale=140/Math.max(hiX-loX,hiY-loY);svg.push(`<g transform="translate(${back?330:115},143) scale(${back?-scale:scale},${-scale}) translate(${-(loX+hiX)/2},${-(loY+hiY)/2})">`);for(const f of [...final.facets].sort((a,b)=>back?b.rank-a.rank:a.rank-b.rank)){const p=modelPoly(f);svg.push(`<polygon points="${p.map(v=>`${v.x},${v.y}`).join(' ')}" fill="${isFlipped(f)!==back?'#6f435b':'#d9cdb2'}" stroke="#453f35" stroke-width="${.5/scale}"/>`)}svg.push('</g>')}svg.push('</g>');
 }catch(e){report.push({id,error:String(e)})}
}
writeFileSync('../output/capelet-brooch-review/concept-probe.json',JSON.stringify(report,null,2));writeFileSync('../output/capelet-brooch-review/concepts.svg',`<svg xmlns="http://www.w3.org/2000/svg" width="1760" height="${Math.ceil(idx/4)*240}" font-family="sans-serif">${svg.join('')}</svg>`);console.log(JSON.stringify(report,null,2));
