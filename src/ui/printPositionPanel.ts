import type { PaperDesign, PrintPosition } from '../papers/types';
import { normalizePosition, ORIGINAL, placementNote } from '../papers/printPosition';

export class PrintPositionPanel {
  readonly dialog = document.createElement('dialog');
  readonly preview = document.createElement('canvas');
  private title = document.createElement('h2');
  private note = document.createElement('p');
  private controls = document.createElement('div');
  private readout = document.createElement('p');
  private paper?: PaperDesign;
  private position: PrintPosition = { ...ORIGINAL };
  private drag?: { id: number; x: number; y: number; start: PrintPosition };
  private pending?: PrintPosition;
  private raf = 0;

  constructor(parent: HTMLElement, private change: (p: PrintPosition) => void) {
    this.dialog.className = 'editor-dialog print-dialog';
    this.title.id = 'print-position-title';
    this.dialog.setAttribute('aria-labelledby', this.title.id);
    this.preview.width = this.preview.height = 512;
    this.preview.className = 'print-preview';
    this.preview.setAttribute('aria-label', 'Flat printed side of the current paper. Drag to slide its artwork.');
    this.preview.tabIndex = 0;
    const close = this.button('Done', () => this.dialog.close());
    close.className = 'btn btn-primary';
    this.readout.className = 'editor-readout';
    this.readout.setAttribute('aria-live', 'polite');
    this.controls.className = 'editor-actions';
    this.dialog.append(this.title, this.note, this.preview, this.readout, this.controls, close);
    parent.append(this.dialog);
    this.dialog.addEventListener('close', () => { this.finish(); });
    this.preview.addEventListener('pointerdown', e => {
      if (this.paper?.placement?.kind !== 'slide' || this.drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, start: { ...this.position } };
      this.preview.setPointerCapture(e.pointerId); e.preventDefault();
    });
    this.preview.addEventListener('pointermove', e => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const r = this.preview.getBoundingClientRect();
      this.pending = { x: this.drag.start.x + (e.clientX - this.drag.x) / r.width,
        y: this.drag.start.y - (e.clientY - this.drag.y) / r.height };
      if (!this.raf) this.raf = requestAnimationFrame(() => this.flush());
    });
    this.preview.addEventListener('pointerup', () => this.finish());
    this.preview.addEventListener('pointercancel', () => {
      if (this.drag) this.pending = this.drag.start;
      this.finish();
    });
    this.preview.addEventListener('keydown', e => {
      const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
      if (directions[e.key] && this.paper?.placement?.kind === 'slide') {
        e.preventDefault(); this.nudge(...directions[e.key]);
      }
    });
  }

  private button(label: string, click: () => void): HTMLButtonElement {
    const b = document.createElement('button'); b.className = 'btn btn-quiet'; b.textContent = label;
    b.addEventListener('click', click); return b;
  }
  private nudge(x: number, y: number) { this.change({ x: this.position.x + x / 32, y: this.position.y + y / 32 }); }
  private flush() {
    cancelAnimationFrame(this.raf); this.raf = 0;
    const p = this.pending; this.pending = undefined;
    if (p) this.change(p);
  }
  private finish() {
    this.flush();
    if (this.drag && this.preview.hasPointerCapture(this.drag.id)) this.preview.releasePointerCapture(this.drag.id);
    this.drag = undefined;
  }
  open() { this.dialog.showModal(); }

  render(paper: PaperDesign, turn: number, position: PrintPosition, front: HTMLCanvasElement): void {
    const changed = this.paper !== paper;
    this.paper = paper; this.position = normalizePosition(paper, position);
    this.title.textContent = `Position print · ${paper.name}`;
    this.note.textContent = placementNote(paper);
    this.preview.classList.toggle('can-slide', paper.placement?.kind === 'slide');
    const ctx = this.preview.getContext('2d')!, S = this.preview.width;
    ctx.clearRect(0, 0, S, S); ctx.save(); ctx.translate(S / 2, S / 2);
    ctx.rotate(turn * Math.PI / 2); ctx.drawImage(front, -S / 2, -S / 2, S, S); ctx.restore();
    this.readout.textContent = paper.placement
      ? `Right ${Math.round(position.x * 100)}% · Up ${Math.round(position.y * 100)}% of the sheet. New paper starts at its original position.`
      : 'Placement fixed for this paper.';
    if (changed) {
      this.controls.replaceChildren();
      const p = paper.placement;
      if (p?.kind === 'slide') {
        for (const [label, x, y] of [['Left', -1, 0], ['Right', 1, 0], ['Up', 0, 1], ['Down', 0, -1]] as const)
          this.controls.append(this.button(label, () => this.nudge(x, y)));
        this.controls.append(this.button('Reset print', () => this.change({ ...ORIGINAL })));
      } else if (p?.kind === 'snap') {
        for (const s of p.positions) {
          const b = this.button(s.label, () => this.change(s)); b.dataset.x = String(s.x); b.dataset.y = String(s.y);
          this.controls.append(b);
        }
      }
    }
    for (const b of this.controls.querySelectorAll<HTMLButtonElement>('button[data-x]'))
      b.setAttribute('aria-pressed', String(Number(b.dataset.x) === position.x && Number(b.dataset.y) === position.y));
  }
}
