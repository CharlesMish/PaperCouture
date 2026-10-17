import {buildMitten} from '../../design-pass-2026-10/origami/mittenStudy';
import type {Construction} from '../../../src/fold/construction';
import {v2} from '../../../src/fold/geometry';
export const variant=(cuff:number,side:number,thumbAt:number,top:number,tip=.16):Construction=>{
 const c=buildMitten('left',{cuff,side,thumbAt,tip});
 if(top<1){
 c.ops.splice(2,0,{kind:'fold',id:'mitt-top',title:'Shorten the hand',hint:'Fold the retained upper strip behind the palm.',folds:[{name:'mitt-top',a:v2(-1.5,top),b:v2(1.5,top),moving:v2(0,1),sense:'valley'}]});
 for(const op of c.ops)if(op.kind==='fold'&&op.id.startsWith('mitt-tip-'))for(const f of op.folds){f.a.y-=1-top;f.b.y-=1-top;f.moving.y-=1-top;}
 }
 return c;
};
