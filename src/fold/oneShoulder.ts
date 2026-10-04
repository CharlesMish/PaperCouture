// One-square study from afb1cb51dd72d89b7f016196aeb252512f3d5e36 (Library bundle; source hashes verified).
import type { Construction } from './construction';
import type { Op } from './engine';
import { v2 } from './geometry';
type P = [number, number];
const meta = {top:1,shoulderPoint:v2(0,1),sleeveCutDir:v2(1,0)};
const F=(id:string,title:string,a:P,b:P,moving:P):Op=>({kind:'fold',id,title,hint:title,folds:[{name:id,a:v2(...a),b:v2(...b),moving:v2(...moving),sense:'valley'}]});
const T=(id:string,title='Turn over'):Op=>({kind:'turn',id,title,hint:title});
export function oneShoulder():Construction{return{name:'One-shoulder wrap tunic',meta,ops:[
 F('hem','Turn up the lower band',[-1.5,-.75],[1.5,-.75],[0,-1]),T('back'),
 F('left','Narrow the left side',[-.5,-1.5],[-.5,1.5],[-1,0]),
 F('right','Narrow the right side',[.55,-1.5],[.55,1.5],[1,0]),
 F('shoulder','Fold the high corner behind',[-.15,1],[.55,.25],[.55,1]),
 T('front','Reveal the asymmetric outline'),
 F('neck-band','Turn the diagonal edge forward',[.2376,.9182],[-.4624,.1682],[.15,1]),
]}}
