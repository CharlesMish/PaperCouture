// One-square study from afb1cb51dd72d89b7f016196aeb252512f3d5e36 (Library bundle; source hashes verified).
import type { Construction } from './construction';
import type { Op } from './engine';
import { v2, sub } from './geometry';
import { cm, lineMeet } from './measure';
type P = [number, number];
const meta = {top:1,shoulderPoint:v2(0,1),sleeveCutDir:v2(1,0)};
const F=(id:string,title:string,hint:string,a:P,b:P,moving:P):Op=>({kind:'fold',id,title,hint,folds:[{name:id,a:v2(...a),b:v2(...b),moving:v2(...moving),sense:'valley'}]});
const T=(id:string,title:string,hint:string):Op=>({kind:'turn',id,title,hint});

// Crease positions, shared by the folds and their instructions.
const HEM = -.75, LEFT = -.5, RIGHT = .55;
const SHOULDER: [P, P] = [[-.15, 1], [RIGHT, .25]];
const NECK: [P, P] = [[.2376, .9182], [-.4624, .1682]];
/** Where the neckline crease meets the top edge and the left side once the paper is turned (sides at -RIGHT and -LEFT). */
function neckEnds() {
  const a = v2(...NECK[0]), d = sub(v2(...NECK[1]), a);
  const top = lineMeet(a, d, v2(0, 1), v2(1, 0)), side = lineMeet(a, d, v2(-RIGHT, 0), v2(0, 1));
  return { fromRight: -LEFT - top.x, belowTop: 1 - side.y };
}
const neck = neckEnds();

export function oneShoulder():Construction{return{name:'One-shoulder wrap tunic',meta,ops:[
 F('hem','Turn up the lower band',`Print side up. Fold the bottom edge up onto the print by ${cm(1 + HEM)}, all the way across. This band becomes the hem, in the other colour.`,[-1.5,HEM],[1.5,HEM],[0,-1]),
 T('back','Turn over','Turn it over from side to side, so the hem band is underneath along the bottom edge.'),
 F('left','Narrow the left side',`Fold the left side in so its edge meets the centre line: the crease is ${cm(LEFT + 1)} from the left edge. Fold all the layers.`,[LEFT,-1.5],[LEFT,1.5],[-1,0]),
 F('right','Narrow the right side',`Fold the right side in along a crease ${cm(1 - RIGHT)} from the right edge, all the layers. Its edge lies just past the centre line, over the edge of the left flap.`,[RIGHT,-1.5],[RIGHT,1.5],[1,0]),
 F('shoulder','Fold down the top right corner',`Fold the top right corner down onto the paper along a slanting crease from the top edge ${cm(RIGHT - SHOULDER[0][0])} in from the corner to the right side ${cm(1 - SHOULDER[1][1])} below it. Fold all the layers.`,SHOULDER[0],SHOULDER[1],[RIGHT,1]),
 T('front','Reveal the asymmetric outline','Turn it over from side to side: the slanting shoulder edge now runs down from the top to the left side.'),
 F('neck-band','Turn the diagonal edge forward',`Fold the slanting edge over onto the front along a crease parallel to it: from the top edge ${cm(neck.fromRight)} in from the right side to the left side ${cm(neck.belowTop)} below the top. Fold all the layers. This band edges the neckline.`,NECK[0],NECK[1],[.15,1]),
]}}
