// Workshop controls. Pure DOM; it is told what to show and reports clicks.

export interface PanelView {
  total: number;
  /** completed steps */
  done: number;
  /** op the caption describes (moving or pending), null when finished */
  active: number | null;
  title: string;
  hint: string;
  foldLabel: string;
  canBack: boolean;
  canFold: boolean;
  moving: boolean;
  /** "See this fold": off (not offered), offered (most of the moving paper is hidden), or showing. */
  inspect: 'off' | 'offered' | 'showing';
}

export interface PanelHandlers {
  onBack(): void;
  onFold(): void;
  onReset(): void;
  onInspect(): void;
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
    this.hintToggle.type = this.inspectButton.type = 'button';
    this.hintToggle.setAttribute('aria-controls', this.hint.id);
    this.hintToggle.setAttribute('aria-expanded', 'false');
    this.hintToggle.addEventListener('click', () => {
      this.setHintOpen(!this.hintOpen);
      if (this.hintOpen) h.onHintOpen?.();
    });
    this.inspectButton.setAttribute('aria-pressed', 'false');
    this.inspectButton.addEventListener('click', h.onInspect);
    const tools = el('div', 'caption-tools');
    tools.append(this.hintToggle, this.inspectButton);
    words.append(this.stepNo, this.title, this.hint, this.inspectNote);
    caption.append(words, tools);
    const row = el('div', 'dock-row');
    row.append(this.back, caption, this.fold);
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
    this.stepNo.textContent = v.active === null ? 'Finished' : `Step ${v.active + 1} of ${v.total}`;
    this.title.textContent = v.title;
    this.hint.textContent = v.hint;
    this.back.disabled = !v.canBack;
    this.fold.disabled = !v.canFold;
    this.fold.textContent = v.foldLabel;
    this.resetButton.disabled = v.done === 0 && !v.moving;
    this.inspectButton.hidden = v.inspect === 'off';
    this.inspectButton.setAttribute('aria-pressed', String(v.inspect === 'showing'));
    this.inspectButton.textContent = v.inspect === 'showing' ? 'Hide highlight' : 'See this fold';
    this.inspectNote.hidden = v.inspect !== 'showing';
    this.dock.classList.toggle('inspecting', v.inspect === 'showing');
  }

  get compact(): boolean { return this.dock.classList.contains('compact'); }

  /**
   * Decide whether the instructions need the Instructions button: always at a
   * height of 540 px or less, and whenever the open dock would take more than 40%
   * of the screen. Once compact at a screen size it stays so until the size
   * changes, so the dock does not switch back and forth between steps.
   */
  fit(): boolean {
    const size = `${window.innerWidth}x${window.innerHeight}`;
    if (this.dock.hidden) return this.compact;
    if (size !== this.compactFor) {
      this.compactFor = size;
      this.dock.classList.remove('compact');
    }
    if (!this.compact) {
      const tooTall = window.innerHeight <= 540 || this.dock.getBoundingClientRect().height > 0.4 * window.innerHeight;
      if (tooTall) this.dock.classList.add('compact');
    }
    return this.compact;
  }

  /** Keep opened compact instructions below `topLimit` (CSS px from the top): they scroll instead. */
  setHintRoom(topLimit: number): void {
    if (!this.compact) { this.hint.style.maxHeight = ''; return; }
    const open = this.hintOpen ? this.hint.getBoundingClientRect().height + this.inspectNote.getBoundingClientRect().height : 0;
    const closedTop = this.dock.getBoundingClientRect().top + open;
    this.hint.style.maxHeight = `${Math.max(56, closedTop - topLimit - 16)}px`;
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
