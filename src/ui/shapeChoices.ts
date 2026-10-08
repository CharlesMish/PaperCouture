import type { Construction } from '../fold/construction';
import { buildTimeline, evaluateFrame, posePoint } from '../fold/timeline';
import type { DecisionId, FoldDecision, GarmentOptions } from '../fold/garmentOptions';

/** Each thumbnail is the actual finished paper geometry, on one shared scale. */
export class ShapeChoices {
  readonly root = document.createElement('fieldset');
  private signature = '';
  constructor(parent: HTMLElement, private choose: (decision: DecisionId, value: string) => void) {
    this.root.className = 'shape-choices';
    parent.prepend(this.root);
  }
  focusChoice(value: string) {
    Array.from(this.root.querySelectorAll('button')).find(b => b.dataset.choice === value)?.focus({ preventScroll: true });
  }
  render(decision: FoldDecision | undefined, options: GarmentOptions, build: (value: string) => Construction) {
    this.root.hidden = !decision;
    if (!decision) return;
    const signature = JSON.stringify([decision.id, options]);
    if (signature !== this.signature) {
      const focused = this.root.contains(document.activeElement) ? (document.activeElement as HTMLElement).dataset.choice : undefined;
      this.signature = signature;
      const legend = document.createElement('legend'); legend.textContent = decision.title;
      this.root.replaceChildren(legend);
      const previews = decision.choices.map(choice => {
        const timeline = buildTimeline(build(choice.id).ops);
        const last = timeline.ops[timeline.ops.length - 1], pose = evaluateFrame(last, 1);
        const polys = last.pieces.map(piece => ({
          points: piece.poly.map(p => posePoint(pose, piece.index * 12, p.x, p.y)),
          front: pose[piece.index * 12 + 10] > 0,
        })).sort((a, b) => a.points[0][2] - b.points[0][2]);
        return { choice, polys };
      });
      const points = previews.flatMap(p => p.polys.flatMap(poly => poly.points));
      const x = Math.min(...points.map(p => p[0])) - .08, y = Math.min(...points.map(p => -p[1])) - .08;
      const w = Math.max(...points.map(p => p[0])) - x + .08, h = Math.max(...points.map(p => -p[1])) - y + .08;
      for (const { choice, polys } of previews) {
        const button = document.createElement('button'); button.type = 'button';
        button.dataset.choice = choice.id; button.dataset.decision = decision.id;
        if (decision.id === 'silhouette') button.dataset.shape = choice.id;
        button.setAttribute('aria-label', choice.name);
        button.setAttribute('aria-pressed', String(options[decision.id] === choice.id));
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', `${x} ${y} ${w} ${h}`); svg.setAttribute('aria-hidden', 'true');
        for (const poly of polys) {
          const polygon = document.createElementNS(svg.namespaceURI, 'polygon');
          polygon.setAttribute('points', poly.points.map(p => `${p[0]},${-p[1]}`).join(' '));
          polygon.setAttribute('fill', poly.front ? '#4e655f' : '#cbbda6');
          polygon.setAttribute('stroke', '#334640'); polygon.setAttribute('stroke-width', '.008');
          svg.append(polygon);
        }
        const label = document.createElement('span'); label.textContent = choice.name;
        button.append(svg, label); button.onclick = () => this.choose(decision.id, choice.id);
        this.root.append(button);
        if (focused === choice.id) button.focus({ preventScroll: true });
      }
    }
  }
}
