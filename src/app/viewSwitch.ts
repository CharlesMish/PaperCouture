// Workshop <-> display switch. Like the fold controller, a second tap during a
// transition reverses it from where it is, so the scene is never stranded
// half-way and never jumps.

export type ViewMode = 'workshop' | 'display';

export class ViewSwitch {
  /** 0 = workshop, 1 = display */
  t = 0;
  target: 0 | 1 = 0;
  private listeners = new Set<() => void>();

  constructor(private duration = 1.0) {}

  get mode(): ViewMode {
    return this.target === 1 ? 'display' : 'workshop';
  }

  /** True only when fully settled in the display. */
  get inDisplay(): boolean {
    return this.t === 1 && this.target === 1;
  }

  get inWorkshop(): boolean {
    return this.t === 0 && this.target === 0;
  }

  onChange(fn: () => void): void {
    this.listeners.add(fn);
  }

  go(mode: ViewMode): void {
    const target = mode === 'display' ? 1 : 0;
    if (target === this.target) return;
    this.target = target;
    for (const fn of this.listeners) fn();
  }

  jump(mode: ViewMode): void {
    this.target = mode === 'display' ? 1 : 0;
    this.t = this.target;
    for (const fn of this.listeners) fn();
  }

  update(dt: number): boolean {
    if (this.t === this.target) return false;
    const step = dt / this.duration;
    this.t = this.target === 1 ? Math.min(1, this.t + step) : Math.max(0, this.t - step);
    if (this.t === this.target) for (const fn of this.listeners) fn();
    return true;
  }
}
