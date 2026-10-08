import { Construction } from '../../../src/fold/construction';
import { FoldSpec, Op } from '../../../src/fold/engine';
import { v2, Vec2 } from '../../../src/fold/geometry';

/** A front-built paper wrap with an actual turned edge. */
export function buildCrossFrontRobe(): Construction {
  const top = 1;
  const left = v2(-0.48, top), leftHem = v2(-0.50, -1);
  const right = v2(0.32, top), rightHem = v2(0.44, -1);
  const sleeve = (p: Vec2, h: Vec2, side: -1|1): FoldSpec => {
    const phi = Math.atan2(Math.abs(h.x) - Math.abs(p.x), top+1);
    const alpha = Math.PI/2 - 55*Math.PI/360 + phi;
    return {name: side < 0 ? 'robe-sleeve-left':'robe-sleeve-right', a:p, b:v2(p.x-side*Math.cos(alpha), p.y-Math.sin(alpha)), moving:v2(0,top), sense:'valley', only:side<0?'robe-panel-left':'robe-panel-right'};
  };
  const ops: Op[] = [
    {kind:'fold', id:'robe-edge', title:'Turn in the narrow edge', hint:'This narrow strip will frame the overlapping front in the reverse colour.', folds:[{name:'robe-edge', a:v2(-0.91,-1.5), b:v2(-0.91,1.5), moving:v2(-1,0),sense:'valley'}]},
    {kind:'turn', id:'robe-turn', title:'Turn over to shape the front', hint:'The printed side will return as you wrap the front panels.'},
    {kind:'fold', id:'robe-left', title:'Bring the first panel across', hint:'Lift the first side along the slanted guide.', folds:[{name:'robe-panel-left',a:left,b:leftHem,moving:v2(-1,0),sense:'valley'}]},
    {kind:'fold', id:'robe-left-sleeve', title:'Open the first sleeve', hint:'Lift only the upper flap.', folds:[sleeve(left,leftHem,-1)]},
    {kind:'fold', id:'robe-right', title:'Overlap the second panel', hint:'Bring the edged panel over the first panel.', folds:[{name:'robe-panel-right',a:right,b:rightHem,moving:v2(1,0),sense:'valley'}]},
    {kind:'fold', id:'robe-right-sleeve', title:'Open the second sleeve', hint:'Lift the upper flap to match the first sleeve.', folds:[sleeve(right,rightHem,1)]},
    {kind:'turn',id:'robe-back',title:'Turn over to finish the hem',hint:'The lower points now face you.'},
    {kind:'fold',id:'robe-hem',title:'Lift the lower edge',hint:'Fold a restrained hem onto the back.',folds:[{name:'robe-hem',a:v2(-1.5,-1),b:v2(1.5,-1),moving:v2(0,-2),sense:'valley'}]},
    {kind:'turn',id:'robe-front',title:'Reveal the crossed front',hint:'The two front panels overlap, with a narrow reverse-colour edge.'},
  ];
  return {name:'Cross-front robe',ops,meta:{top,shoulderPoint:left,sleeveCutDir:v2(0,-1)}};
}
