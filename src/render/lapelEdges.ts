import * as THREE from 'three';
import { Mat34, OpAnim, posePoint } from '../fold/timeline';
import { Vec2 } from '../fold/geometry';

/** A fine highlight on the actual lapel boundaries, not a painted neckline.
 * It follows the same material points and depth-tests against the other paper. */
export class LapelEdges {
  private geometry = new THREE.BufferGeometry();
  readonly lines = new THREE.LineSegments(this.geometry, new THREE.LineBasicMaterial({ color: '#f2e7d3', transparent: true, opacity: 0.5, depthWrite: false }));
  private anim: OpAnim | null = null;
  private refs: { piece: number; point: Vec2 }[] = [];
  constructor() { this.lines.frustumCulled = false; }
  update(anim: OpAnim, M: Mat34, taggedIds: Set<number>, enabled: boolean) {
    this.lines.visible = enabled;
    if (!enabled) return;
    if (this.anim !== anim) {
      this.anim = anim;
      this.refs = [];
      const selected = (i: number) => taggedIds.has(anim.pieces[i].id);
      for (const h of anim.hinges) {
        if (selected(h.a) === selected(h.b)) continue;
        const piece = selected(h.a) ? h.a : h.b;
        this.refs.push({ piece, point: h.m0 }, { piece, point: h.m1 });
      }
      for (const edge of anim.raw) if (selected(edge.piece)) {
        this.refs.push({ piece: edge.piece, point: edge.m0 }, { piece: edge.piece, point: edge.m1 });
      }
      this.geometry.dispose(); this.geometry = new THREE.BufferGeometry();
      this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(this.refs.length * 3), 3));
      this.lines.geometry = this.geometry;
    }
    const attribute = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    this.refs.forEach(({ piece, point }, i) => {
      const o = piece * 12, p = posePoint(M, o, point.x, point.y);
      // Lapels show the reverse face. Offset only a hair onto that face.
      attribute.setXYZ(i, p[0] - M[o + 2] * .001, p[1] - M[o + 6] * .001, p[2] - M[o + 10] * .001);
    });
    attribute.needsUpdate = true;
  }
}
