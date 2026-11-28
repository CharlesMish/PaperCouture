// Every design at its default shape, plus the other colourway where a design has one.
import { GARMENTS, GarmentId, buildGarment, garmentDisplayAngle } from '../../src/fold/garments';
import { DEFAULT_OPTIONS, GarmentOptions, garmentDecisions } from '../../src/fold/garmentOptions';
import type { SheetState } from '../../src/fold/engine';
import { finishedState } from '../../src/render/flatPreview';
import { buildTimeline } from '../../src/fold/timeline';

export interface Piece { key: string; id: GarmentId; name: string; state: SheetState; angle: number; params: string; steps: number; experiment: boolean }

export function pieces(): Piece[] {
  const out: Piece[] = [];
  for (const g of GARMENTS) {
    const side = garmentDecisions(g.id).find(d => d.id.endsWith('Side'));
    for (const v of side ? side.choices.map(c => c.id) : [undefined]) {
      const options = side && v ? { ...DEFAULT_OPTIONS, [side.id]: v } as GarmentOptions : DEFAULT_OPTIONS;
      const isDefault = !side || DEFAULT_OPTIONS[side.id] === v;
      const choice = side?.choices.find(c => c.id === v);
      const construction = buildGarment(g.id, options);
      out.push({ key: isDefault ? g.id : `${g.id}:${v}`, id: g.id, name: side && choice ? `${g.name} · ${choice.name}` : g.name,
        state: finishedState(construction), angle: garmentDisplayAngle(g.id), steps: buildTimeline(construction.ops).ops.length, experiment: !!g.experiment,
        params: `design=${g.id}` + (side && !isDefault ? `&${side.id.replace(/Side$/, '')}=${v}` : '') });
    }
  }
  return out;
}
