// The fold state machine. It knows nothing about rendering or the DOM.
//
// At rest the model is at `step` (0 = flat square, count = finished). A motion
// animates one op between its start (t = 0) and end (t = 1). Rules, chosen so
// quick repeated input is always predictable:
//  - next() while folding forward finishes that fold at once (it never skips ahead);
//  - next() while unfolding reverses the motion smoothly from where it is;
//  - prev() mirrors both rules;
//  - reset() cancels any motion or drag and returns to the flat square;
//  - `step` only changes when a motion actually reaches its end.

export interface Pose {
  /** op index to draw */
  op: number;
  /** progress of that op, 0..1 (linear; easing is applied by evaluateFrame) */
  t: number;
  /** true when resting before `op`, waiting for the user */
  pending: boolean;
}

interface Motion {
  op: number;
  t: number;
  target: 0 | 1;
}

export class FoldController {
  step = 0;
  private motion: Motion | null = null;
  private scrubbing = false;
  private listeners = new Set<() => void>();

  constructor(
    readonly count: number,
    private durationOf: (op: number) => number,
  ) {}

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  get moving(): boolean {
    return this.motion !== null;
  }

  get isScrubbing(): boolean {
    return this.scrubbing;
  }

  get finished(): boolean {
    return this.step === this.count && !this.motion;
  }

  /** The op the interface should describe: the one moving, or the one pending. */
  get activeOp(): number | null {
    if (this.motion) return this.motion.op;
    return this.step < this.count ? this.step : null;
  }

  /** Direction of the current motion: 1 folding, -1 unfolding, 0 at rest. */
  get direction(): number {
    if (!this.motion) return 0;
    return this.motion.target === 1 ? 1 : -1;
  }

  pose(): Pose {
    if (this.motion) return { op: this.motion.op, t: this.motion.t, pending: false };
    if (this.step < this.count) return { op: this.step, t: 0, pending: true };
    return { op: this.count - 1, t: 1, pending: false };
  }

  next(): void {
    if (this.scrubbing) return;
    const m = this.motion;
    if (m) {
      if (m.target === 1) this.finish();
      else m.target = 1;
    } else if (this.step < this.count) {
      this.motion = { op: this.step, t: 0, target: 1 };
    }
    this.emit();
  }

  prev(): void {
    if (this.scrubbing) return;
    const m = this.motion;
    if (m) {
      if (m.target === 0) this.finish();
      else m.target = 0;
    } else if (this.step > 0) {
      this.motion = { op: this.step - 1, t: 1, target: 0 };
    }
    this.emit();
  }

  reset(): void {
    this.motion = null;
    this.scrubbing = false;
    this.step = 0;
    this.emit();
  }

  /** Jump without animation (used by ?step= and tests). */
  jumpTo(step: number): void {
    this.motion = null;
    this.scrubbing = false;
    this.step = Math.max(0, Math.min(this.count, Math.round(step)));
    this.emit();
  }

  // --- drag gesture: only the pending fold can be scrubbed, only forward from rest.

  beginScrub(): boolean {
    if (this.motion || this.step >= this.count) return false;
    this.motion = { op: this.step, t: 0, target: 1 };
    this.scrubbing = true;
    this.emit();
    return true;
  }

  scrubTo(t: number): void {
    if (!this.scrubbing || !this.motion) return;
    this.motion.t = Math.max(0, Math.min(1, t));
  }

  endScrub(commit: boolean): void {
    if (!this.scrubbing || !this.motion) return;
    this.scrubbing = false;
    this.motion.target = commit ? 1 : 0;
    this.emit();
  }

  /** Advance time. Returns true if the pose changed. */
  update(dt: number): boolean {
    const m = this.motion;
    if (!m) return false;
    if (this.scrubbing) return true;
    const rate = dt / this.durationOf(m.op);
    m.t += m.target === 1 ? rate : -rate;
    if ((m.target === 1 && m.t >= 1) || (m.target === 0 && m.t <= 0)) this.finish();
    return true;
  }

  private finish(): void {
    const m = this.motion;
    if (!m) return;
    this.step = m.target === 1 ? m.op + 1 : m.op;
    this.motion = null;
    this.emit();
  }
}
