// An unregistered-design harness using the real pinboard capture/export code.
import '../../../src/styles.css';
import * as THREE from 'three';
import { Pinboard, type BoardSource } from '../../../src/ui/pinboard';
import { SheetView } from '../../../src/render/sheetView';
import { makePaperTextures } from '../../../src/render/textures';
import { findPaper } from '../../../src/papers';
import { buildTimeline, evaluateFrame } from '../../../src/fold/timeline';
import { thumbVariant } from './variants';
import { buildSwingCoat } from '../../../src/fold/swingCoat';
const defs=[
  {label:'Swing coat · 20 cm square',construction:buildSwingCoat(),paper:'slate-grain',cm:20},
  {label:'Baseline mitten left · 6 cm',construction:thumbVariant('baseline','left'),paper:'oat-linen',cm:6},
  {label:'Baseline mitten right · 6 cm',construction:thumbVariant('baseline','right'),paper:'oat-linen',cm:6},
  {label:'Proposed mitten left · 6 cm',construction:thumbVariant('proposed','left'),paper:'oat-linen',cm:6},
  {label:'Proposed mitten right · 6 cm',construction:thumbVariant('proposed','right'),paper:'oat-linen',cm:6},
];
const sources:BoardSource[]=defs.map((d,i)=>{
  const fm=new THREE.MeshStandardMaterial({roughness:.9}),bm=fm.clone(),textures=makePaperTextures(findPaper(d.paper),0,1);
  fm.map=textures.front;bm.map=textures.back;
  const sheet=new SheetView(fm,bm),tl=buildTimeline(d.construction.ops),op=tl.ops.at(-1)!;sheet.setAnim(op);sheet.pose(evaluateFrame(op,1));
  return {title:d.label,objects:[sheet.group],angle:0,paperSize:{key:String(i),referenceCm:20,recommendedCm:d.cm}};
});
const board=new Pinboard(document.getElementById('app')!,{sources:()=>sources,workshop:()=>{}});board.open();
(window as any).mittenBoard={board,definitions:defs.map(d=>({label:d.label,cm:d.cm}))};
