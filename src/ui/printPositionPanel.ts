import type { Construction } from '../fold/construction';
import type { SheetState } from '../fold/engine';
import type { PaperDesign, PrintPosition } from '../papers/types';
import { normalizePosition, ORIGINAL, placementNote } from '../papers/printPosition';
import { findStarts, hiddenVeil } from '../papers/landing';
import { StartingPoint, forgetStart, sameStart, saveStart, savedStart, suggestedStarts } from '../papers/startingPoints';
import { FlatView, drawFinished, finishedState, paperFaces } from '../render/flatPreview';

/** The piece the paper is being placed on. `key` names it for saved starting points. */
export interface PlacementPiece { key: string; designId: string; name: string; construction: Construction; angle: number }
export interface PlacementHandlers {
  change(p: PrintPosition): void;
  start(s: StartingPoint, saved: boolean): void;
  saved(): void;
  piece(): PlacementPiece;
}

const VEIL_KEY = 'paper-couture:placement-veil:v1';
const states = new WeakMap<Construction, SheetState>();
function stateOf(c: Construction) {
  let s = states.get(c);
  if (!s) states.set(c, s = finishedState(c));
  return s;
}

export class PrintPositionPanel {
  readonly dialog = document.createElement('dialog');
  readonly preview = document.createElement('canvas');
  readonly finished = document.createElement('canvas');
  private title = document.createElement('h2');
  private note = document.createElement('p');
  private controls = document.createElement('div');
  private readout = document.createElement('p');
  private finishedCaption = document.createElement('span');
  private flip = document.createElement('button');
  private veilToggle = document.createElement('input');
  private starts = document.createElement('div');
  private save = document.createElement('button');
  private forget = document.createElement('button');
  private saveNote = document.createElement('p');
  private paper?: PaperDesign;
  private turn = 0;
  private front?: HTMLCanvasElement;
  private position: PrintPosition = { ...ORIGINAL };
  private drag?: { id: number; x: number; y: number; start: PrintPosition };
  private pending?: PrintPosition;
  private raf = 0;
  private view: FlatView = 'front';
  private startsFor = '';
  private startsJob = 0;

  constructor(parent: HTMLElement, private h: PlacementHandlers) {
    this.dialog.className = 'editor-dialog print-dialog';
    this.title.id = 'print-position-title';
    this.dialog.setAttribute('aria-labelledby', this.title.id);
    this.preview.width = this.preview.height = 512;
    this.preview.className = 'print-preview';
    this.preview.setAttribute('aria-label', 'Flat printed side of the current paper. Drag to slide its artwork.');
    this.preview.tabIndex = 0;
    this.finished.width = this.finished.height = 512;
    this.finished.className = 'print-finished';
    this.finished.setAttribute('role', 'img');
    const close = this.button('Done', () => this.dialog.close());
    close.className = 'btn btn-primary';
    this.readout.className = 'editor-readout';
    this.readout.setAttribute('aria-live', 'polite');
    this.controls.className = 'editor-actions';
    const sheetView = document.createElement('figure'); sheetView.className = 'print-view';
    const sheetCaption = document.createElement('figcaption');
    const veilLabel = document.createElement('label'); veilLabel.className = 'print-veil';
    this.veilToggle.type = 'checkbox';
    try { this.veilToggle.checked = localStorage.getItem(VEIL_KEY) !== 'off'; } catch { this.veilToggle.checked = true; }
    this.veilToggle.addEventListener('change', () => {
      try { localStorage.setItem(VEIL_KEY, this.veilToggle.checked ? 'on' : 'off'); } catch { /* the choice lasts for this visit */ }
      this.drawSheet();
    });
    veilLabel.append(this.veilToggle, 'Dim what the fold hides');
    sheetCaption.append('Flat sheet', veilLabel);
    sheetView.append(this.preview, sheetCaption);
    const finishedView = document.createElement('figure'); finishedView.className = 'print-view';
    const finishedCaption = document.createElement('figcaption');
    this.flip.className = 'print-flip'; this.flip.type = 'button';
    this.flip.addEventListener('click', () => { this.view = this.view === 'front' ? 'back' : 'front'; this.drawFinished(); });
    finishedCaption.append(this.finishedCaption, this.flip);
    finishedView.append(this.finished, finishedCaption);
    const views = document.createElement('div'); views.className = 'print-views';
    views.append(sheetView, finishedView);
    const startsTitle = document.createElement('h3'); startsTitle.textContent = 'Starting points';
    this.starts.className = 'print-starts';
    this.save = this.button('Save as my start', () => this.keep());
    this.forget = this.button('Forget my start', () => this.drop());
    this.saveNote.className = 'editor-readout'; this.saveNote.setAttribute('aria-live', 'polite');
    const foot = document.createElement('div'); foot.className = 'print-foot';
    foot.append(this.save, this.forget, close);
    this.dialog.append(this.title, this.note, views, this.readout, this.controls, startsTitle, this.starts, this.saveNote, foot);
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
  private nudge(x: number, y: number) { this.h.change({ x: this.position.x + x / 32, y: this.position.y + y / 32 }); }
  private flush() {
    cancelAnimationFrame(this.raf); this.raf = 0;
    const p = this.pending; this.pending = undefined;
    if (p) this.h.change(p);
  }
  private finish() {
    this.flush();
    if (this.drag && this.preview.hasPointerCapture(this.drag.id)) this.preview.releasePointerCapture(this.drag.id);
    this.drag = undefined;
  }
  open() { this.view = 'front'; this.dialog.showModal(); this.refresh(); }

  /** Redraw the parts that depend on the piece; cheap enough to run on every change while open. */
  private refresh() {
    if (!this.dialog.open || !this.paper) return;
    this.drawSheet(); this.drawFinished(); this.renderStarts();
  }
  private drawSheet() {
    if (!this.front) return;
    const ctx = this.preview.getContext('2d')!, S = this.preview.width;
    ctx.clearRect(0, 0, S, S); ctx.save(); ctx.translate(S / 2, S / 2);
    ctx.rotate(this.turn * Math.PI / 2); ctx.drawImage(this.front, -S / 2, -S / 2, S, S); ctx.restore();
    if (this.dialog.open && this.veilToggle.checked) { const piece = this.h.piece(); ctx.drawImage(hiddenVeil({ state: stateOf(piece.construction), angle: piece.angle }), 0, 0, S, S); }
  }
  private drawFinished() {
    if (!this.paper) return;
    const piece = this.h.piece(), ctx = this.finished.getContext('2d')!, S = this.finished.width;
    ctx.clearRect(0, 0, S, S);
    drawFinished(ctx, stateOf(piece.construction), paperFaces(this.paper, this.turn, this.position, 512), this.turn, { view: this.view, angle: piece.angle, shadow: true });
    this.finishedCaption.textContent = `Finished ${piece.name.toLowerCase()} · ${this.view}`;
    this.finished.setAttribute('aria-label', `The finished ${piece.name.toLowerCase()} in this paper, seen from the ${this.view}.`);
    this.flip.textContent = this.view === 'front' ? 'Show the back' : 'Show the front';
  }
  private current(): StartingPoint { return { turns: this.turn, x: this.position.x, y: this.position.y }; }
  private startButton(label: string, kind: string, start: StartingPoint): HTMLButtonElement {
    const piece = this.h.piece(), b = document.createElement('button'), c = document.createElement('canvas'), name = document.createElement('span');
    b.type = 'button'; b.className = 'print-start'; b.dataset.kind = kind;
    b.dataset.turns = String(start.turns); b.dataset.x = String(start.x); b.dataset.y = String(start.y);
    c.width = c.height = 176;
    drawFinished(c.getContext('2d')!, stateOf(piece.construction), paperFaces(this.paper!, start.turns, start, 192), start.turns, { angle: piece.angle });
    name.textContent = label;
    b.append(c, name);
    b.addEventListener('click', () => this.h.start(start, kind === 'saved'));
    return b;
  }
  private markStarts() {
    const now = this.current();
    for (const b of this.starts.querySelectorAll<HTMLButtonElement>('.print-start'))
      b.setAttribute('aria-pressed', String(sameStart(now, { turns: Number(b.dataset.turns), x: Number(b.dataset.x), y: Number(b.dataset.y) })));
    const piece = this.h.piece(), mine = this.paper && savedStart(piece.key, this.paper.id);
    this.forget.hidden = !mine;
    this.save.disabled = !!mine && sameStart(mine, now);
  }
  private renderStarts(force = false) {
    const paper = this.paper!, piece = this.h.piece(), key = `${piece.key}|${paper.id}|${piece.construction.name}`;
    if (!force && key === this.startsFor) { this.markStarts(); return; }
    this.startsFor = key; this.saveNote.textContent = '';
    const job = ++this.startsJob, subject = { state: stateOf(piece.construction), angle: piece.angle };
    this.starts.replaceChildren();
    const mine = savedStart(piece.key, paper.id);
    if (mine) this.starts.append(this.startButton('Yours', 'saved', normalizeStart(paper, mine)));
    const suggested = suggestedStarts(paper.id, piece.designId).map(s => ({ name: s.name, start: normalizeStart(paper, s) }));
    for (const s of suggested) this.starts.append(this.startButton(s.name, 'suggested', s.start));
    const busy = document.createElement('span'); busy.className = 'print-starts-busy'; busy.textContent = 'Looking at where this paper lands…';
    this.starts.append(busy);
    this.markStarts();
    // Measuring a sliding print takes a moment; let the dialog paint first.
    setTimeout(() => {
      if (job !== this.startsJob) return;
      const found = findStarts(subject, paper);
      busy.remove();
      for (const f of found.filter(f => !suggested.some(s => sameStart(s.start, f.start)))) this.starts.append(this.startButton(f.label, f.label.includes('turn') || f.label === 'As drawn' ? 'turn' : 'found', f.start));
      this.markStarts();
    }, 30);
  }
  private keep() {
    const piece = this.h.piece(), paper = this.paper!;
    const ok = saveStart(piece.key, paper.id, this.current());
    if (ok) this.h.saved();
    this.renderStarts(true);
    this.saveNote.textContent = ok ? `Saved. ${paper.name} will start here whenever you choose it for the ${piece.name.toLowerCase()}.` : 'This browser would not keep a saved start.';
  }
  private drop() {
    const piece = this.h.piece();
    const ok = forgetStart(piece.key, this.paper!.id);
    this.renderStarts(true);
    this.saveNote.textContent = ok ? 'Saved start removed.' : 'This browser could not remove the saved start.';
  }

  render(paper: PaperDesign, turn: number, position: PrintPosition, front: HTMLCanvasElement): void {
    const changed = this.paper !== paper;
    this.paper = paper; this.position = normalizePosition(paper, position); this.turn = turn; this.front = front;
    this.title.textContent = `Position print · ${paper.name}`;
    this.note.textContent = placementNote(paper);
    this.preview.classList.toggle('can-slide', paper.placement?.kind === 'slide');
    this.drawSheet();
    this.refresh();
    this.readout.textContent = paper.placement
      ? `Right ${Math.round(position.x * 100)}% · Up ${Math.round(position.y * 100)}% of the sheet. A new paper starts as drawn, or from its starting point for this piece.`
      : 'Placement fixed for this paper.';
    if (changed) {
      this.controls.replaceChildren();
      const p = paper.placement;
      if (p?.kind === 'slide') {
        for (const [label, x, y] of [['Left', -1, 0], ['Right', 1, 0], ['Up', 0, 1], ['Down', 0, -1]] as const)
          this.controls.append(this.button(label, () => this.nudge(x, y)));
        this.controls.append(this.button('Reset print', () => this.h.change({ ...ORIGINAL })));
      } else if (p?.kind === 'snap') {
        for (const s of p.positions) {
          const b = this.button(s.label, () => this.h.change(s)); b.dataset.x = String(s.x); b.dataset.y = String(s.y);
          this.controls.append(b);
        }
      }
    }
    for (const b of this.controls.querySelectorAll<HTMLButtonElement>('button[data-x]'))
      b.setAttribute('aria-pressed', String(Number(b.dataset.x) === position.x && Number(b.dataset.y) === position.y));
  }
}

function normalizeStart(paper: PaperDesign, s: StartingPoint): StartingPoint {
  return { turns: ((Math.trunc(s.turns) % 4) + 4) % 4, ...normalizePosition(paper, s) };
}
