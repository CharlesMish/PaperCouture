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
}

export interface PanelHandlers {
  onBack(): void;
  onFold(): void;
  onReset(): void;
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
  private fold = el('button', 'btn btn-primary', 'Fold');

  constructor(root: HTMLElement, h: PanelHandlers) {
    this.dock.setAttribute('aria-label', 'Folding steps');
    const caption = el('div', 'caption');
    caption.setAttribute('aria-live', 'polite');
    caption.append(this.stepNo, this.title, this.hint);
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
  }

  setVisible(on: boolean): void {
    this.dock.hidden = !on;
    this.resetButton.hidden = !on;
  }

  /** Space the UI covers at the bottom of the screen, in CSS px. */
  bottomInset(): number {
    const r = this.dock.getBoundingClientRect();
    if (r.height === 0) return 0; // hidden
    return Math.max(0, window.innerHeight - r.top) + 12;
  }
}
