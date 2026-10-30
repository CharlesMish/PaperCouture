// Workshop controls. Pure DOM; it is told what to show and reports clicks.
import { showLength } from '../fold/measure';

/**
 * An instruction longer than this (as shown) is a sequence for folding real paper,
 * usually a collapse: the step's title stays as the cue and the full text opens with
 * Instructions, on any screen.
 */
export const LONG_HINT = 240;

export interface PanelView {
  total: number;
  /** completed steps */
  done: number;
  /** op the caption describes (moving or pending), null when finished */
  active: number | null;
  title: string;
  hint: string;
  /** The square the instruction's measurements are for (when it has any), in cm. */
  squareCm?: number;
  foldLabel: string;
  canBack: boolean;
  canFold: boolean;
  moving: boolean;
  /** "See this fold": off (not offered), offered (most of the moving paper is hidden), or showing. */
  inspect: 'off' | 'offered' | 'showing';
  /** Start over was just pressed: offer to put the folds back. */
  undoReset?: boolean;
  /** On a finished piece: offer to pin it, or say it is pinned (and open the board). */
  pin?: 'off' | 'offer' | 'pinned';
}

export interface PanelHandlers {
  onBack(): void;
  onFold(): void;
  onReset(): void;
  onInspect(): void;
  onUndoReset?(): void;
  onPin?(): void;
  /** The short-screen instructions were opened (the page closes other disclosures). */
  onHintOpen?(): void;
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
};

export class WorkshopPanel {
  readonly dock = el('section', 'dock');
  readonly resetButton = el('button', 'start-over', 'Start over');
  private progress = el('ol', 'progress');
  private stepNo = el('p', 'step-no');
  private title = el('p', 'step-title');
  private hint = el('p', 'step-hint');
  private back = el('button', 'btn btn-quiet', 'Back');
  /** Short screens hide the step's instructions behind this; the title stays as the action cue. */
  readonly hintToggle = el('button', 'caption-tool hint-toggle', 'Instructions');
  readonly inspectButton = el('button', 'caption-tool inspect-toggle', 'See this fold');
  readonly undoResetButton = el('button', 'caption-tool undo-reset', 'Undo start over');
  /** On a finished piece: keep it, as clear a choice as Display beside it. */
  readonly pinButton = el('button', 'btn btn-quiet pin-piece', 'Pin to pinboard');
  private inspectNote = el('p', 'inspect-note', 'Highlighted: the paper this step moves, drawn through the layers above it. The paper and the view are unchanged.');
  private hintOpen = false;
  /** Instructions sit behind the Instructions button (short screens, or a dock that would crowd the paper). */
  private compactFor = '';
  private fold = el('button', 'btn btn-primary', 'Fold');

  constructor(root: HTMLElement, h: PanelHandlers) {
    this.dock.setAttribute('aria-label', 'Folding steps');
    const caption = el('div', 'caption');
    // only the words are announced; the buttons beside them are not
    const words = el('div', 'caption-text');
    words.setAttribute('aria-live', 'polite');
    this.hint.id = 'step-hint';
    this.hintToggle.type = this.inspectButton.type = this.undoResetButton.type = this.pinButton.type = 'button';
    this.undoResetButton.hidden = this.pinButton.hidden = true;
    this.undoResetButton.addEventListener('click', () => h.onUndoReset?.());
    this.pinButton.addEventListener('click', () => h.onPin?.());
    this.hintToggle.setAttribute('aria-controls', this.hint.id);
    this.hintToggle.setAttribute('aria-expanded', 'false');
    this.hintToggle.addEventListener('click', () => {
      this.setHintOpen(!this.hintOpen);
      if (this.hintOpen) h.onHintOpen?.();
    });
    this.inspectButton.setAttribute('aria-pressed', 'false');
    this.inspectButton.addEventListener('click', h.onInspect);
    const tools = el('div', 'caption-tools');
    tools.append(this.hintToggle, this.inspectButton, this.undoResetButton);
    words.append(this.stepNo, this.title, this.hint, this.inspectNote);
    caption.append(words, tools);
    const row = el('div', 'dock-row');
    const actions = el('div', 'dock-actions');
    actions.append(this.pinButton, this.fold);
    row.append(this.back, caption, actions);
    this.dock.append(this.progress, row);
    this.back.addEventListener('click', h.onBack);
    this.fold.addEventListener('click', h.onFold);
    this.resetButton.addEventListener('click', h.onReset);
    root.append(this.resetButton, this.dock);
  }

  render(v: PanelView): void {
    if (this.progress.childElementCount !== v.total) {
      this.progress.replaceChildren(...Array.from({ length: v.total }, () => el('li')));
    }
    [...this.progress.children].forEach((li, i) => {
      li.classList.toggle('done', i < v.done);
      li.classList.toggle('active', i === v.active);
    });
    this.stepNo.textContent = v.active === null ? 'Finished' : `Step ${v.active + 1} of ${v.total}${v.squareCm ? ` · on a ${showLength(v.squareCm)} square` : ''}`;
    this.title.textContent = v.title;
    this.hint.textContent = v.hint;
    this.longHint = v.hint.length > LONG_HINT;
    this.applyCompact();
    this.back.disabled = !v.canBack;
    this.fold.disabled = !v.canFold;
    this.fold.textContent = v.foldLabel;
    this.resetButton.disabled = v.done === 0 && !v.moving;
    this.inspectButton.hidden = v.inspect === 'off';
    this.inspectButton.setAttribute('aria-pressed', String(v.inspect === 'showing'));
    this.inspectButton.textContent = v.inspect === 'showing' ? 'Hide highlight' : 'See this fold';
    this.inspectNote.hidden = v.inspect !== 'showing';
    this.dock.classList.toggle('inspecting', v.inspect === 'showing');
    this.undoResetButton.hidden = !v.undoReset;
    this.pinButton.hidden = !v.pin || v.pin === 'off';
    this.pinButton.textContent = v.pin === 'pinned' ? 'View on pinboard' : 'Pin to pinboard';
  }

  get compact(): boolean { return this.dock.classList.contains('compact'); }
  /** Compact because of the screen (rather than one long instruction). */
  private screenCompact = false;
  /** This step's instruction is long (a collapse, most often): its title is the cue, the rest sits behind Instructions. */
  private longHint = false;
  private applyCompact(): void {
    this.dock.classList.toggle('compact', this.screenCompact || this.longHint);
    this.dock.classList.toggle('long-hint', this.longHint);
  }

  /**
   * Decide whether the instructions need the Instructions button: always at a
   * height of 540 px or less, and whenever the open dock would take more than 40%
   * of the screen. Once compact at a screen size it stays so until the size
   * changes, so the dock does not switch back and forth between steps. (A step
   * with a long instruction is compact on any screen; see render.) Returns whether
   * the screen is cramped, which also decides the piece notes.
   */
  fit(): boolean {
    const size = `${window.innerWidth}x${window.innerHeight}`;
    if (this.dock.hidden) return this.screenCompact;
    if (size !== this.compactFor) {
      this.compactFor = size;
      this.screenCompact = false;
      this.applyCompact();
    }
    if (!this.screenCompact) {
      // a dock compacted for a long instruction is measured on the next ordinary step
      const tooTall = window.innerHeight <= 540 || (!this.longHint && this.dock.getBoundingClientRect().height > 0.4 * window.innerHeight);
      if (tooTall) { this.screenCompact = true; this.applyCompact(); }
    }
    return this.screenCompact;
  }

  /** Keep opened compact instructions below `topLimit` (CSS px from the top): they scroll instead. */
  setHintRoom(topLimit: number): void {
    if (!this.compact) { this.hint.style.maxHeight = ''; return; }
    // The highlight's explanation opens with the instructions but does not scroll
    // with them, so the scrolling text gets the room that is left after it.
    const note = this.inspectNote.getBoundingClientRect().height;
    const open = this.hintOpen ? this.hint.getBoundingClientRect().height + note : 0;
    const closedTop = this.dock.getBoundingClientRect().top + open;
    const room = closedTop - topLimit - 16 - note;
    // Too little room below the top controls (a small phone on its side): the open
    // instructions cover the controls while they are read, instead of tangling with them.
    const over = this.hintOpen && room < 72;
    this.dock.classList.toggle('over-controls', over);
    this.hint.style.maxHeight = `${Math.max(56, over ? closedTop - 8 - 16 - note : room)}px`;
  }

  /** Open or close the instructions when compact (they always show otherwise). */
  setHintOpen(open: boolean): void {
    this.hintOpen = open;
    this.hintToggle.setAttribute('aria-expanded', String(open));
    this.dock.classList.toggle('hint-open', open);
  }

  setVisible(on: boolean): void {
    this.dock.hidden = !on;
    this.resetButton.hidden = !on;
  }

  /** Space the UI covers at the bottom of the screen, in CSS px. */
  bottomInset(): number {
    const r = this.dock.getBoundingClientRect();
    if (r.height === 0) return 0; // hidden
    // Opened short-screen instructions lie over the paper for reading; the
    // paper keeps its framing instead of shrinking into what space is left.
    // The highlight's one-line explanation does too, so turning it on never reframes the view.
    const overlay = (this.hintOpen && this.compact ? this.hint.getBoundingClientRect().height : 0)
      + this.inspectNote.getBoundingClientRect().height;
    return Math.max(0, window.innerHeight - r.top - overlay) + 12;
  }
}
