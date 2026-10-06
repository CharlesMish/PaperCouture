import type { Construction } from '../../../src/fold/construction';
import type { Op } from '../../../src/fold/engine';
import { v2 } from '../../../src/fold/geometry';
type P=[number,number];
const f=(id:string,a:P,b:P,m:P,only?:string):Op=>({kind:'fold',id,title:id,hint:id,folds:[{name:id,a:v2(...a),b:v2(...b),moving:v2(...m),sense:'valley',...(only?{only}:{})}]});
const t=(id:string):Op=>({kind:'turn',id,title:id,hint:id});
export function concept(mode:number,gateTop=.53,gateBottom=.69,collar=true):Construction{
 const ops:Op[]=[];
 if(mode===1)ops.push(t('reverse'));
 ops.push(f('shorten',[-1.5,0],[1.5,0],[0,-1]));
 if(mode===2)ops.push(t('reverse'));
 if(collar)ops.push(f('neckband',[-1.5,.76],[1.5,.76],[0,1]));
 const top=collar?.76:1;
 ops.push(f('panel-left',[-gateTop,top],[-gateBottom,0],[-1,.4]),f('panel-right',[gateTop,top],[gateBottom,0],[1,.4]));
 return {name:`half${mode} gates${gateTop}/${gateBottom} collar${collar}`,meta:{top,shoulderPoint:v2(0,top),sleeveCutDir:v2(1,0)},ops};
}
export function fullGate(top=.55,bottom=.68,hem=-.15):Construction{
 return {name:`full gates${top}/${bottom} hem${hem}`,meta:{top:1,shoulderPoint:v2(0,1),sleeveCutDir:v2(1,0)},ops:[
 t('reverse'),f('panel-left',[-top,1],[-bottom,-1],[-1,0]),f('panel-right',[top,1],[bottom,-1],[1,0]),t('back'),f('hem',[-1.5,hem],[1.5,hem],[0,-1]),f('shoulder-left',[-top, .7],[-top+.18,1],[-top,1]),f('shoulder-right',[top,.7],[top-.18,1],[top,1]),t('front')]};
}
export const CONCEPTS=Object.fromEntries([
 ...[0,1,2].flatMap(mode=>[false,true].flatMap(c=>[[.53,.69],[.58,.72]].map(([a,b])=>[`half-${mode}-${c}-${a}`,concept(mode,a,b,c)] as const))),
 ...[.55,.58].flatMap(top=>[-.15,-.05].map(hem=>[`full-${top}-${hem}`,fullGate(top,.7,hem)] as const)),
]);
export function openCape(top=.52,bottom=.78,hem=0,collar=.78):Construction {
 const ops:Op[]=[t('reverse'),f('panel-left',[-top,1],[-bottom,-1],[-1,0]),f('panel-right',[top,1],[bottom,-1],[1,0]),t('back'),f('hem',[-1.5,hem],[1.5,hem],[0,-1]),f('shoulder-left',[-.63,.5],[-.35,1],[-top,1]),f('shoulder-right',[.63,.5],[.35,1],[top,1]),t('front')];
 if(collar)ops.push(f('collar',[-1.5,collar],[1.5,collar],[0,1]));
 return{name:`open cape ${top}/${bottom} hem${hem} collar${collar}`,meta:{top:collar||1,shoulderPoint:v2(0,collar||1),sleeveCutDir:v2(1,0)},ops};
}
for(const top of [.52,.58])for(const bottom of [.68,.78])for(const collar of [0,.78]) CONCEPTS[`open-${top}-${bottom}-${collar}`]=openCape(top,bottom,0,collar);
export function collarCape(collarFirst=false,gateTop=.53,gateBottom=.73,hem=-.1):Construction {
 const collar=f('collar',[-1.5,.75],[1.5,.75],[0,1]);
 return{name:'collar before panels',meta:{top:.75,shoulderPoint:v2(0,.75),sleeveCutDir:v2(1,0)},ops:[...(collarFirst?[collar,t('reverse')]:[t('reverse'),collar]),f('panel-left',[-gateTop,.75],[-gateBottom,-1],[-1,0]),f('panel-right',[gateTop,.75],[gateBottom,-1],[1,0]),t('back'),f('hem',[-1.5,hem],[1.5,hem],[0,-1]),f('shoulder-left',[-.32,.75],[-.68,.15],[-gateTop,.75]),f('shoulder-right',[.32,.75],[.68,.15],[gateTop,.75]),t('front')]};
}
for(const first of [false,true])for(const top of [.53,.57])for(const hem of [-.1,0])CONCEPTS[`collarFirst-${first}-${top}-${hem}`]=collarCape(first,top,.73,hem);
export function shortCape(topFold=.6,hem=-.2,shoulders=true,topFirst=false):Construction {
 const a=f('top',[-1.5,topFold],[1.5,topFold],[0,1]),b=f('hem',[-1.5,hem],[1.5,hem],[0,-1]);
 return{name:'short cape with back tucks',meta:{top:topFold,shoulderPoint:v2(0,topFold),sleeveCutDir:v2(1,0)},ops:[t('reverse'),f('panel-left',[-.53,1],[-.78,-1],[-1,0]),f('panel-right',[.53,1],[.78,-1],[1,0]),t('back'),...(topFirst?[a,b]:[b,a]),...(shoulders?[f('shoulder-left',[-.35,topFold],[-.74,.05],[-.6,topFold]),f('shoulder-right',[.35,topFold],[.74,.05],[.6,topFold])]:[]),t('front')]};
}
for(const top of [.6,.7])for(const shoulders of [false,true])for(const first of [false,true])CONCEPTS[`short-${top}-${shoulders}-${first}`]=shortCape(top,-.2,shoulders,first);
for(const ordering of ['sthb','shtb','tsbh','thbs','hbst','hbts']) {
 const c=shortCape(.6,-.2,true,false); const [r,l,rr,back,hem,top,sl,sr,front]=c.ops; const groups:Record<string,Op[]>={s:[sl,sr],t:[top],h:[hem],b:[]}; c.ops=[r,l,rr,back,...[...ordering].flatMap(x=>groups[x]),front]; CONCEPTS[`order-${ordering}`]=c;
}
for(const a of [.6,.66])for(const b of [.82,.9])CONCEPTS[`wide-${a}-${b}`]=openCape(a,b,0,0);
export function rectBrooch():Construction{return{name:'Rectangle brooch',meta:{top:.4,shoulderPoint:v2(0,.4),sleeveCutDir:v2(1,0)},ops:[t('reverse'),f('shorten',[-1.5,.6],[1.5,.6],[0,1]),t('front'),f('top',[-1.5,.4],[1.5,.4],[0,.6]),f('bottom',[-1.5,-.8],[1.5,-.8],[0,-1]),f('left',[-.8,-1.5],[-.8,1.5],[-1,0]),f('right',[.8,-1.5],[.8,1.5],[1,0])]}}
CONCEPTS['rectangle-brooch']=rectBrooch();
