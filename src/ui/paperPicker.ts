import { PaperDesign } from '../papers/types';

// Paper swatches plus pattern rotation. Thumbnails are drawn with the same
// functions as the 3D textures; a folded-back corner shows each reverse.

export interface PickerHandlers {
  onSelect(id: string): void;
  onRotate(): void;
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
  private row = document.createElement('div');

  constructor(parent: HTMLElement, papers: PaperDesign[], h: PickerHandlers) {
    this.root.className = 'papers';
    const row = this.row;
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
      '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M15.5 8.5A6 6 0 1 0 14 14.2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M16.4 3.8v5h-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Rotate pattern</span>';
    this.rotate.addEventListener('click', h.onRotate);
    this.name.className = 'paper-name';
    this.name.setAttribute('aria-live', 'polite');
    this.root.append(row, this.name, this.rotate);
    parent.append(this.root);
  }

  render(current: PaperDesign, quarterTurns: number): void {
    for (const [id, { btn, img }] of this.buttons) {
      const on = id === current.id;
      btn.setAttribute('aria-checked', String(on));
      btn.tabIndex = on ? 0 : -1;
      // thumbnails turn with the pattern so the swatch always shows the orientation
      img.style.transform = `rotate(${quarterTurns * 90}deg)`;
    }
    const deg = (quarterTurns % 4) * 90;
    this.name.textContent = current.hidden ? current.name : `${current.name}${deg ? `, turned ${deg}°` : ''}`;
    this.rotate.setAttribute('aria-label', `Rotate pattern (now ${deg}°)`);
    // after the name: a longer name takes height from the list
    const entry = this.buttons.get(current.id);
    if (entry) this.reveal(entry.btn);
  }

  /**
   * The swatch list scrolls once it outgrows the screen. Bring the chosen
   * swatch into the list's view (only the list, never the page) whenever the
   * paper or its rotation changes, including a paper chosen by link.
   */
  private reveal(btn: HTMLElement): void {
    const r = this.row.getBoundingClientRect();
    const q = btn.getBoundingClientRect();
    const pad = 6; // room for the selected swatch's ring
    if (q.top - pad < r.top) this.row.scrollTop -= r.top - q.top + pad;
    else if (q.bottom + pad > r.bottom) this.row.scrollTop += q.bottom - r.bottom + pad;
    if (q.left - pad < r.left) this.row.scrollLeft -= r.left - q.left + pad;
    else if (q.right + pad > r.right) this.row.scrollLeft += q.right - r.right + pad;
  }

  /** Screen space the picker covers: { top, left } in CSS px. */
  insets(): { top: number; left: number } {
    const r = this.root.getBoundingClientRect();
    const vertical = r.height > r.width;
    return vertical ? { top: 0, left: r.right + 12 } : { top: r.bottom + 8, left: 0 };
  }
}
