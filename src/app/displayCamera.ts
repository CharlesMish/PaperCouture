import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Stage } from '../render/stage';

// Camera for the display view: orbit and zoom around the standing piece,
// named viewpoints that glide from wherever the camera is, and a slow
// turntable that runs only when asked for. Pan is off so the piece always
// stays centred. Any drag cancels a glide in progress.

export type Viewpoint = 'front' | 'angle' | 'back';

const VIEWS: Record<Viewpoint, { theta: number; phi: number }> = {
  front: { theta: 0, phi: 0.46 * Math.PI },
  angle: { theta: 0.24 * Math.PI, phi: 0.4 * Math.PI },
  back: { theta: Math.PI, phi: 0.46 * Math.PI },
};

const GLIDE = 0.75;

interface Glide {
  from: THREE.Spherical;
  to: THREE.Spherical;
  t: number;
}

export class DisplayCamera {
  readonly controls: OrbitControls;
  readonly target = new THREE.Vector3();
  private halfW = 1;
  private halfH = 1;
  private glide: Glide | null = null;
  private listeners = new Set<() => void>();

  constructor(
    private stage: Stage,
    dom: HTMLElement,
  ) {
    const c = new OrbitControls(stage.camera, dom);
    c.enabled = false;
    c.enablePan = false;
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.rotateSpeed = 0.7;
    c.zoomSpeed = 0.8;
    c.minPolarAngle = 0.12 * Math.PI;
    c.maxPolarAngle = 0.53 * Math.PI;
    c.autoRotateSpeed = 1.3;
    c.addEventListener('start', () => {
      this.glide = null;
      c.enableDamping = true;
    });
    this.controls = c;
  }

  onChange(fn: () => void): void {
    this.listeners.add(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  get turntable(): boolean {
    return this.controls.autoRotate;
  }

  /** What to frame: world-space centre and half-extents of the piece on its stand. */
  setSubject(center: THREE.Vector3, halfW: number, halfH: number): void {
    this.target.copy(center);
    this.controls.target.copy(center);
    this.halfW = halfW;
    this.halfH = halfH;
    this.updateLimits();
  }

  updateLimits(): void {
    const d = this.defaultDistance();
    this.controls.minDistance = d * 0.45;
    this.controls.maxDistance = d * 1.7;
    // At the furthest permitted zoom even a slight downward orbit used to
    // put the eye below y=0. Bound that worst case, including after resize.
    this.controls.maxPolarAngle = Math.min(0.53 * Math.PI,
      Math.acos(THREE.MathUtils.clamp((0.025 - this.target.y) / this.controls.maxDistance, -1, 1)));
  }

  /** Preserve orbit and relative zoom when the available viewport changes. */
  reframe(ratio: number): void {
    this.glide = null;
    this.stage.camera.position.sub(this.target).multiplyScalar(ratio).add(this.target);
    this.controls.update();
  }

  defaultDistance(): number {
    return this.stage.fitDistance(this.halfW, this.halfH);
  }

  /** Camera position for a viewpoint (default distance unless given). */
  positionFor(view: Viewpoint, distance = this.defaultDistance()): THREE.Vector3 {
    const v = VIEWS[view];
    return new THREE.Vector3().setFromSpherical(new THREE.Spherical(distance, v.phi, v.theta)).add(this.target);
  }

  setEnabled(on: boolean): void {
    this.controls.enabled = on;
    if (on) {
      this.controls.target.copy(this.target);
      this.controls.update();
    } else {
      this.glide = null;
      this.setTurntable(false);
    }
  }

  /** Glide to a viewpoint, keeping the current zoom. */
  show(view: Viewpoint): void {
    this.setTurntable(false);
    const r = this.stage.camera.position.distanceTo(this.target);
    this.startGlide(VIEWS[view].theta, VIEWS[view].phi, r);
  }

  /** Glide back to the front at the default zoom. */
  resetView(): void {
    this.setTurntable(false);
    this.startGlide(VIEWS.front.theta, VIEWS.front.phi, this.defaultDistance());
  }

  setTurntable(on: boolean): void {
    if (this.controls.autoRotate === on) return;
    this.controls.autoRotate = on;
    if (on) this.glide = null;
    this.emit();
  }

  private startGlide(theta: number, phi: number, radius: number) {
    const from = new THREE.Spherical().setFromVector3(this.stage.camera.position.clone().sub(this.target));
    // shortest way round
    let dTheta = theta - from.theta;
    dTheta = ((((dTheta + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
    this.glide = { from, to: new THREE.Spherical(radius, phi, from.theta + dTheta), t: 0 };
    this.controls.enableDamping = false; // clears leftover drag momentum
  }

  update(dt: number): void {
    // OrbitControls.update() re-aims the camera even when disabled; never let
    // it touch the workshop camera.
    if (!this.controls.enabled) return;
    const g = this.glide;
    if (g) {
      g.t = Math.min(1, g.t + dt / GLIDE);
      const e = 0.5 - 0.5 * Math.cos(Math.PI * g.t);
      const s = new THREE.Spherical(
        g.from.radius + (g.to.radius - g.from.radius) * e,
        g.from.phi + (g.to.phi - g.from.phi) * e,
        g.from.theta + (g.to.theta - g.from.theta) * e,
      );
      this.stage.camera.position.setFromSpherical(s).add(this.target);
      this.stage.camera.lookAt(this.target);
      if (g.t >= 1) {
        this.glide = null;
        this.controls.enableDamping = true;
      }
    }
    this.controls.update(dt);
  }
}
