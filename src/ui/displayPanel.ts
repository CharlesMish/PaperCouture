import { Viewpoint } from '../app/displayCamera';

// Display controls: viewpoints, turntable, reset and the way back.

export interface DisplayHandlers {
  onView(v: Viewpoint): void;
  onTurntable(): void;
  onReset(): void;
  onReturn(): void;
  onPinboard(): void;
}

const button = (cls: string, text: string) => {
  const b = document.createElement('button');
  b.className = cls;
  b.textContent = text;
  return b;
};

export class DisplayPanel {
  readonly dock = document.createElement('section');
  private turntable = button('btn btn-quiet toggle', 'Turntable');
  private title = document.createElement('p');

  constructor(parent: HTMLElement, h: DisplayHandlers) {
    this.dock.className = 'dock display-dock';
    this.dock.setAttribute('aria-label', 'Display controls');
    this.dock.hidden = true;

    const head = document.createElement('div');
    head.className = 'dock-row display-head';
    const caption = document.createElement('div');
    caption.className = 'caption';
    this.title.className = 'step-title';
    const hint = document.createElement('p');
    hint.className = 'step-hint';
    hint.textContent = 'Drag to turn it, pinch or scroll to look closer.';
    caption.append(this.title, hint);
    const ret = button('btn btn-quiet', 'Workshop');
    ret.setAttribute('aria-label', 'Return to the workshop');
    ret.addEventListener('click', h.onReturn);
    head.append(caption);
    const pinboard = button('btn btn-quiet', 'Pinboard');
    pinboard.addEventListener('click', h.onPinboard);
    const actions = document.createElement('div'); actions.className = 'display-actions';
    actions.append(pinboard, ret); head.append(actions);

    const tools = document.createElement('div');
    tools.className = 'display-tools';
    const views = document.createElement('div');
    views.className = 'segmented';
    views.setAttribute('role', 'group');
    views.setAttribute('aria-label', 'Viewpoint');
    for (const [v, label] of [
      ['front', 'Front'],
      ['angle', 'Angle'],
      ['back', 'Back'],
    ] as [Viewpoint, string][]) {
      const b = button('seg', label);
      b.addEventListener('click', () => h.onView(v));
      views.append(b);
    }
    this.turntable.setAttribute('aria-pressed', 'false');
    this.turntable.addEventListener('click', h.onTurntable);
    const reset = button('btn btn-quiet', 'Reset view');
    reset.addEventListener('click', h.onReset);
    tools.append(views, this.turntable, reset);

    this.dock.append(head, tools);
    parent.append(this.dock);
  }

  render(paperName: string, turntable: boolean): void {
    this.title.textContent = paperName;
    this.turntable.setAttribute('aria-pressed', String(turntable));
  }

  setVisible(on: boolean): void {
    this.dock.hidden = !on;
  }

  bottomInset(): number {
    const r = this.dock.getBoundingClientRect();
    if (r.height === 0) return 0; // hidden
    return Math.max(0, window.innerHeight - r.top) + 12;
  }
}
