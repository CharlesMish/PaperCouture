import { PaperDesign } from '../papers/types';

// Paper swatches plus pattern rotation. Thumbnails are drawn with the same
// functions as the 3D textures; a folded-back corner shows each reverse.

export interface PickerHandlers {
  onSelect(id: string): void;
  onRotate(): void;
  onPosition(): void;
}

function thumbnail(p: PaperDesign): string {
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  p.drawFront(c.getContext('2d')!, 160);
  return c.toDataURL();
}

export class PaperPicker {
  readonly root = document.createElement('aside');
  private buttons = new Map<string, { btn: HTMLButtonElement; img: HTMLImageElement }>();
  private name = document.createElement('p');
  private rotate = document.createElement('button');
  private position = document.createElement('button');

  constructor(parent: HTMLElement, papers: PaperDesign[], h: PickerHandlers) {
    this.root.className = 'papers';
    const row = document.createElement('div');
    row.className = 'swatches';
    row.setAttribute('role', 'radiogroup');
    row.setAttribute('aria-label', 'Paper');
    for (const p of papers.filter((q) => !q.hidden)) {
      const btn = document.createElement('button');
      btn.className = 'swatch';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-label', p.name);
      btn.title = `${p.name}: ${p.note}`;
      btn.style.setProperty('--reverse', p.reverse);
      const img = document.createElement('img');
      img.src = thumbnail(p);
      img.alt = '';
      const corner = document.createElement('span');
      corner.className = 'corner';
      btn.append(img, corner);
      btn.addEventListener('click', () => h.onSelect(p.id));
      row.append(btn);
      this.buttons.set(p.id, { btn, img });
    }
    this.rotate.className = 'rotate';
    this.rotate.innerHTML =
      '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.5 8.5A6 6 0 1 0 14 14.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M16.4 3.8v5h-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Turn paper</span>';
    this.rotate.title = 'Turn paper';
    this.rotate.addEventListener('click', h.onRotate);
    this.position.className = 'rotate position-print';
    this.position.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2v16M2 10h16M7 5l3-3 3 3M7 15l3 3 3-3M5 7l-3 3 3 3M15 7l3 3-3 3" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Position print</span>';
    this.position.title = 'Position print';
    this.position.setAttribute('aria-label', 'Position print');
    this.position.addEventListener('click', h.onPosition);
    this.name.className = 'paper-name';
    this.name.setAttribute('aria-live', 'polite');
    this.root.append(row, this.name, this.rotate, this.position);
    parent.append(this.root);
  }

  render(current: PaperDesign, quarterTurns: number, shifted = false): void {
    for (const [id, { btn, img }] of this.buttons) {
      const on = id === current.id;
      btn.setAttribute('aria-checked', String(on));
      btn.tabIndex = on ? 0 : -1;
      // thumbnails turn with the pattern so the swatch always shows the orientation
      img.style.transform = `rotate(${quarterTurns * 90}deg)`;
    }
    const deg = (quarterTurns % 4) * 90;
    this.name.textContent = current.hidden ? current.name : `${current.name}${deg ? `, paper turned ${deg}°` : ''}`;
    this.rotate.setAttribute('aria-label', `Turn paper (now ${deg}°)`);
    this.position.classList.toggle('print-shifted', shifted);
    this.position.title = shifted ? 'Position print · shifted' : 'Position print';
  }

  /** Screen space the picker covers: { top, left } in CSS px. */
  insets(): { top: number; left: number } {
    const r = this.root.getBoundingClientRect();
    const vertical = r.height > r.width;
    return vertical ? { top: 0, left: r.right + 12 } : { top: r.bottom + 8, left: 0 };
  }
}
