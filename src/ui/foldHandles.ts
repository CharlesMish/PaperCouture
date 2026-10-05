/** Screen-space helpers for tiny paper regions. They never change the fold geometry. */
export interface FoldTarget { piece: number; x: number; y: number; vx: number; vy: number }
export function dragVector(vx: number, vy: number): { vx: number; vy: number } {
  const length = Math.hypot(vx, vy);
  if (length < 1e-5) return { vx: 0, vy: -72 };
  const scale = Math.max(72, length) / length;
  return { vx: vx * scale, vy: vy * scale };
}
export class FoldHandles {
  readonly root = document.createElement('div');
  private key = '';
  private buttons: HTMLButtonElement[] = [];
  constructor(parent: HTMLElement, private onDown: (event: PointerEvent, piece: number) => void, private onActivate: () => void) {
    this.root.className = 'fold-handles';
    parent.append(this.root);
  }
  render(targets: FoldTarget[], scrubbing: boolean): void {
    // Keep the captured target in place throughout a drag, even while its paper moves.
    if (scrubbing) return;
    const distinct: FoldTarget[] = [];
    for (const t of targets) if (!distinct.some(q => Math.hypot(t.x - q.x, t.y - q.y) < 32)) distinct.push(t);
    this.root.hidden = !distinct.length;
    const key = distinct.map(t => t.piece).join(',');
    if (key !== this.key) {
      this.key = key;
      this.buttons = distinct.map((t, i) => {
        const button = document.createElement('button');
        button.className = 'fold-handle';
        button.type = 'button';
        button.setAttribute('aria-label', `Fold this step (handle ${i + 1})`);
        button.title = 'Drag toward the arrow, or tap to complete this fold step';
        const arrow = document.createElement('span'); arrow.textContent = '→'; arrow.setAttribute('aria-hidden', 'true');
        button.append(arrow);
        button.onpointerdown = e => this.onDown(e, t.piece);
        button.onclick = e => { if (e.detail === 0) this.onActivate(); };
        return button;
      });
      this.root.replaceChildren(...this.buttons);
    }
    distinct.forEach((t, i) => {
      const b = this.buttons[i];
      b.style.left = `${t.x}px`; b.style.top = `${t.y}px`;
      (b.firstElementChild as HTMLElement).style.transform = `rotate(${Math.atan2(t.vy, t.vx)}rad)`;
    });
  }
}
