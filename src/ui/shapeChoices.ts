import { SILHOUETTES, SilhouetteId } from '../fold/silhouettes';
/** The choice lives with the step it changes, not in the general settings. */
export class ShapeChoices {
  readonly root = document.createElement('fieldset');
  private buttons: HTMLButtonElement[] = [];
  constructor(parent: HTMLElement, choose: (id: SilhouetteId) => void) {
    this.root.className = 'shape-choices';
    const legend = document.createElement('legend');
    legend.textContent = 'Choose the side folds';
    this.root.append(legend);
    for (const s of SILHOUETTES) {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.shape = s.id;
      b.setAttribute('aria-label', s.name);
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 60 50'); svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS(svg.namespaceURI, 'path');
      const half = s.hem * 25;
      path.setAttribute('d', `M17 5 L43 5 L51 14 L45 19 L42 16 L${30+half} 46 L${30-half} 46 L18 16 L15 19 L9 14 Z`);
      svg.append(path);
      const text = document.createElement('span'); text.textContent = s.name;
      b.append(svg, text); b.onclick = () => choose(s.id);
      this.buttons.push(b); this.root.append(b);
    }
    parent.prepend(this.root);
  }
  render(id: SilhouetteId, visible: boolean) {
    this.root.hidden = !visible;
    for (const b of this.buttons) b.setAttribute('aria-pressed', String(b.dataset.shape === id));
  }
}
