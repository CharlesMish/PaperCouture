import * as THREE from 'three';
import { OpAnim } from '../fold/timeline';
import { Vec2 } from '../fold/geometry';

// Preview marks for the pending operation, drawn in model space just above the
// paper: dashed crease segments and a small arc arrow showing where the moving
// paper will land. Dashes are real quads rather than GL lines so they stay
// crisp on high-density phone screens.

const DASH = 0.055;
const GAP = 0.035;
const WIDTH = 0.012;

function dashGeometry(segments: [Vec2, Vec2][], z: number): THREE.BufferGeometry {
  const pos: number[] = [];
  for (const [a, b] of segments) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const L = Math.hypot(dx, dy);
    if (L < 1e-6) continue;
    const ux = dx / L;
    const uy = dy / L;
    const nx = -uy * (WIDTH / 2);
    const ny = ux * (WIDTH / 2);
    // centre the dash pattern on the segment
    const count = Math.max(1, Math.floor((L + GAP) / (DASH + GAP)));
    const used = count * DASH + (count - 1) * GAP;
    let s = (L - used) / 2;
    for (let i = 0; i < count; i++, s += DASH + GAP) {
      const x0 = a.x + ux * s;
      const y0 = a.y + uy * s;
      const x1 = a.x + ux * (s + DASH);
      const y1 = a.y + uy * (s + DASH);
      pos.push(x0 - nx, y0 - ny, z, x1 - nx, y1 - ny, z, x1 + nx, y1 + ny, z);
      pos.push(x0 - nx, y0 - ny, z, x1 + nx, y1 + ny, z, x0 + nx, y0 + ny, z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

function arrowObject(from: Vec2, to: Vec2, z: number, mat: THREE.Material): THREE.Object3D {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const L = Math.hypot(dx, dy);
  const trim = 0.18;
  const a = new THREE.Vector3(from.x + dx * trim, from.y + dy * trim, z);
  const b = new THREE.Vector3(to.x - dx * trim, to.y - dy * trim, z);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  mid.z += Math.max(0.12, L * 0.32);
  const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
  const obj = new THREE.Group();
  obj.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.0075, 6, false), mat));
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.075, 12), mat);
  const tan = curve.getTangent(1);
  head.position.copy(b);
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
  obj.add(head);
  return obj;
}

export class FoldGuides {
  readonly group = new THREE.Group();
  private dashMat = new THREE.MeshBasicMaterial({
    color: '#2e2a25',
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  private arrowMat = new THREE.MeshBasicMaterial({ color: '#2e2a25', transparent: true, opacity: 0.5, depthWrite: false });
  private shownFor: OpAnim | null = null;

  constructor() {
    this.group.renderOrder = 2;
  }

  show(anim: OpAnim, topZ: number): void {
    this.group.visible = true;
    if (this.shownFor === anim) return;
    this.clear();
    this.shownFor = anim;
    const z = topZ + 0.004;
    if (anim.creaseSegments.length) {
      const dashes = new THREE.Mesh(dashGeometry(anim.creaseSegments, z), this.dashMat);
      dashes.renderOrder = 2;
      this.group.add(dashes);
    }
    if (anim.op.kind === 'turn') {
      // a sideways arc in front of the paper: "roll it over"
      let minY = Infinity;
      let maxX = 0;
      for (const p of anim.pieces) {
        for (const m of p.poly) {
          const x = p.preT.a * m.x + p.preT.b * m.y + p.preT.e;
          const y = p.preT.c * m.x + p.preT.d * m.y + p.preT.f;
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, Math.abs(x));
        }
      }
      const y = minY - 0.16;
      this.group.add(arrowObject({ x: maxX * 0.75, y }, { x: -maxX * 0.75, y }, 0.01, this.arrowMat));
    } else {
      for (const ar of anim.arrows) this.group.add(arrowObject(ar.from, ar.to, z, this.arrowMat));
    }
  }

  hide(): void {
    this.group.visible = false;
  }

  private clear(): void {
    for (const o of [...this.group.children]) {
      o.traverse((c) => {
        if (c instanceof THREE.Mesh) c.geometry.dispose();
      });
      this.group.remove(o);
    }
  }
}
