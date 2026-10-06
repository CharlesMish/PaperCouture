/** Source-canvas visibility maps from the real fold engine. These are flat
 * normal-projection diagnostics, not a tilted-camera or flower-shape oracle. */
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { COMPANION_CONSTRUCTIONS } from '../src/fold/companionFolds';
import { finalState, landings, canvasPoint, materialPoint } from './paperLanding';
const out = process.argv[2] || 'docs/companion-folds/visibility';
mkdirSync(out, {recursive:true});
const N=96, S=240, margin=30, cellW=280, rowH=290;
const columns = [
  {face:'print', view:'front', label:'Print seen from Front'},
  {face:'print', view:'back', label:'Print seen from Back'},
  {face:'reverse', view:'front', label:'Reverse seen from Front'},
  {face:'reverse', view:'back', label:'Reverse seen from Back'},
] as const;
const reports=[];
for(const [id,build] of Object.entries(COMPANION_CONSTRUCTIONS)){
 const L=landings(finalState(build()),N); assert.equal(L.length,N*N);
 const rows: {quarterTurns:number; shares:number[]}[]=[];const svg=[`<svg xmlns="http://www.w3.org/2000/svg" width="1150" height="1290" viewBox="0 0 1150 1290"><rect width="1150" height="1290" fill="#f7f4ee"/><g font-family="sans-serif" fill="#1e3232"><text x="30" y="28" font-size="20">${id}: actual-engine visible paper in source-canvas coordinates</text><text x="30" y="49" font-size="13">Teal is visible material; pale is hidden. Source canvas: left→right, top→bottom. No blossom radius assumed.</text><text x="30" y="68" font-size="13">Normal projection only. Back canvas mirrors material x once. Raised edges can differ in the tilted Display presets.</text>`];
 for(let q=0;q<4;q++){
  const shares=[];
  for(let col=0;col<columns.length;col++){
   const {face,view,label}=columns[col],mask=new Uint8Array(N*N);
   for(const l of L){
    const p=canvasPoint(l.m,face,q),m=materialPoint(p.col,p.row,face,q);
    assert(Math.hypot(m.x-l.m.x,m.y-l.m.y)<1e-12);
    if(l[view]===face) mask[Math.min(N-1,Math.floor(p.row*N))*N+Math.min(N-1,Math.floor(p.col*N))]=1;
   }
   const count=mask.reduce((n,v)=>n+v,0);shares.push(count/(N*N));
   const x=margin+col*cellW,y=110+q*rowH;
   svg.push(`<text x="${x}" y="${y-17}" font-size="14">${q*90}° · ${label}</text><rect x="${x}" y="${y}" width="${S}" height="${S}" fill="#e1ddd5" stroke="#8b918b"/>`);
   for(let row=0;row<N;row++)for(let i=0;i<N;){if(!mask[row*N+i]){i++;continue;}const start=i;while(i<N&&mask[row*N+i])i++;svg.push(`<rect x="${x+start*S/N}" y="${y+row*S/N}" width="${(i-start)*S/N}" height="${S/N}" fill="#315f62"/>`)}
   svg.push(`<text x="${x}" y="${y+S+19}" font-size="13">${(count/(N*N)*100).toFixed(2)}% of this sheet face visible</text>`);
  }
  if(q)assert.deepEqual(shares,rows[0].shares,'turn must rotate source map without changing visible material');
  rows.push({quarterTurns:q,shares});
 }
 svg.push('</g></svg>');writeFileSync(`${out}/${id}.svg`,svg.join('\n'));
 reports.push({id,materialSamples:N*N,columns,rows});
}
writeFileSync(`${out}/results.json`,JSON.stringify({method:'real engine final facets and ranks, flat normal projection',sourceCoordinates:'source-canvas x right/y down; reverse mirrors material x once',noAssumedMotifShape:true,reports},null,2));
console.log(`Actual-engine source-canvas maps: ${reports.length} designs × 4 turns × 4 view/face combinations; ${N*N} material samples per design. Inverse coordinates and turn-invariant area pass.`);
