// Review reconstruction from owner-supplied shawl-bolero-NOTES.md.
// No submitted bolero source/build/images were present. This is not commit 9718ed8.
import type { Construction } from '../../src/fold/construction';
import type { Op } from '../../src/fold/engine';
import { v2 } from '../../src/fold/geometry';
type P = [number, number];
const fold = (id: string, a: P, b: P, moving: P): Op => ({kind:'fold',id,title:id,hint:'Review reconstruction of the supplied crease recipe.',folds:[{name:id,a:v2(...a),b:v2(...b),moving:v2(...moving),sense:'valley'}]});
const turn = (id: string): Op => ({kind:'turn',id,title:id,hint:'Review reconstruction: turn the paper over.'});
export function buildReconstructedBolero(): Construction {
 return {name:'Bolero · reconstructed notes',meta:{top:1,shoulderPoint:v2(0,1),sleeveCutDir:v2(1,0)},ops:[
 turn('bolero-reverse'),fold('bolero-panel-left',[-.22,1],[-.62,-.5],[-1,.2]),fold('bolero-panel-right',[.22,1],[.62,-.5],[1,.2]),turn('bolero-back'),fold('bolero-hem',[-1.5,-.18],[1.5,-.18],[0,-1]),turn('bolero-front')
 ]};
}
