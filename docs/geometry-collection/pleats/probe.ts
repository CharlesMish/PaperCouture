import {writeFileSync} from 'node:fs';
import {Construction} from '../../../src/fold/construction';
import {buildTimeline} from '../../../src/fold/timeline';
import {checkState,modelPoly,isFlipped} from '../../../src/fold/engine';
import {v2} from '../../../src/fold/geometry';
const cases=[['vertical',.62,.62,.38,.38], ['flare',.56,.76,.36,.56], ['flare-small',.58,.7,.36,.48]] as const;
const out=[];
for(const [name,ta,ba,tb,bb] of cases){
 const mirror=(x:number)=>-x;
 const c:Construction={name,meta:{top:.72,shoulderPoint:v2(0,.72),sleeveCutDir:v2(1,0)},ops:[
  {kind:'fold',id:'pleats',title:'pleats',hint:'',folds:[
   {name:'pleat-left',a:v2(-ta,1),b:v2(-ba,-1),moving:v2(-1,0),sense:'valley'},
   {name:'pleat-right',a:v2(ta,1),b:v2(ba,-1),moving:v2(1,0),sense:'valley'}]},
  {kind:'fold',id:'return',title:'return',hint:'',folds:[
   {name:'return-left',a:v2(-tb,1),b:v2(-bb,-1),moving:v2(0,0),sense:'valley',only:'pleat-left'},
   {name:'return-right',a:v2(tb,1),b:v2(bb,-1),moving:v2(0,0),sense:'valley',only:'pleat-right'}]},
  {kind:'turn',id:'back',title:'back',hint:''},
  {kind:'fold',id:'length',title:'length',hint:'',folds:[{name:'length',a:v2(-1.5,-.6),b:v2(1.5,-.6),moving:v2(0,-1.5),sense:'valley'}]},
  ...(name==='vertical'?[]:[{kind:'fold' as const,id:'hem-corners',title:'hem-corners',hint:'',folds:[
   {name:'hem-left',a:v2(-ta,1),b:v2(-ba,-1),moving:v2(-1,0),sense:'valley' as const,only:'length'},
   {name:'hem-right',a:v2(ta,1),b:v2(ba,-1),moving:v2(1,0),sense:'valley' as const,only:'length'}]}]),
  {kind:'turn',id:'front',title:'front',hint:''},
  {kind:'fold',id:'waist',title:'waist',hint:'',folds:[{name:'waist',a:v2(-1.5,.78),b:v2(1.5,.78),moving:v2(0,1.5),sense:'valley'}]},
 ]};
 try{const tl=buildTimeline(c.ops);const errs=tl.states.flatMap((s,i)=>checkState(s,`${name}/${i}`));console.log(name,errs);out.push({name,states:tl.states.map(s=>s.facets.map(f=>({model:modelPoly(f),material:f.poly,flipped:isFlipped(f),rank:f.rank,tags:f.tags})))})}catch(e){console.log(name,String(e))}
}
writeFileSync('docs/geometry-collection/pleats/probe.json',JSON.stringify(out));
