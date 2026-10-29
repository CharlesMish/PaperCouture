import * as THREE from 'three';
import { Mat34, OpAnim, posePoint } from '../fold/timeline';

// "See this fold": draws the paper a step moves on top of everything, as a tinted
// silhouette with its outline, so a fold or collapse under other layers can be
// followed. It is an overlay only: the paper, the camera and the fold are
// unchanged, and nothing here is turned over.

const FILL = '#c4672c';

export class HiddenPaperOverlay {
  readonly group = new THREE.Group();
  private fill: THREE.Mesh;
  private edges: THREE.LineSegments;
  private key = '';
  private pieces: { index: number; poly: { x: number; y: number }[] }[] = [];

  constructor() {
    const fillMat = new THREE.MeshBasicMaterial({ color: FILL, transparent: true, opacity: 0.38, depthTest: false, depthWrite: false, side: THREE.DoubleSide });
    const edgeMat = new THREE.LineBasicMaterial({ color: FILL, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false });
    this.fill = new THREE.Mesh(new THREE.BufferGeometry(), fillMat);
    this.edges = new THREE.LineSegments(new THREE.BufferGeometry(), edgeMat);
    // drawn after the paper and the fold guides
    this.fill.renderOrder = 20;
    this.edges.renderOrder = 21;
    this.fill.frustumCulled = this.edges.frustumCulled = false;
    this.group.add(this.fill, this.edges);
    this.group.visible = false;
  }

  hide(): void {
    this.group.visible = false;
  }

  /** Show the moving pieces of `anim` at pose `M`. */
  show(anim: OpAnim, M: Mat34): void {
    const key = `${anim.index}:${anim.pieces.length}`;
    if (key !== this.key) {
      this.key = key;
      this.pieces = anim.pieces.filter((p) => p.spec >= 0).map((p) => ({ index: p.index, poly: p.poly }));
      const tris = this.pieces.reduce((n, p) => n + p.poly.length - 2, 0);
      const segs = this.pieces.reduce((n, p) => n + p.poly.length, 0);
      this.fill.geometry.dispose();
      this.edges.geometry.dispose();
      this.fill.geometry = new THREE.BufferGeometry();
      this.fill.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(tris * 9), 3));
      this.edges.geometry = new THREE.BufferGeometry();
      this.edges.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(segs * 6), 3));
    }
    const F = (this.fill.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    const E = (this.edges.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    let f = 0, e = 0;
    for (const p of this.pieces) {
      const pts = p.poly.map((m) => posePoint(M, p.index * 12, m.x, m.y));
      for (let i = 1; i + 1 < pts.length; i++) for (const q of [pts[0], pts[i], pts[i + 1]]) { F.set(q, f); f += 3; }
      for (let i = 0; i < pts.length; i++) { E.set(pts[i], e); E.set(pts[(i + 1) % pts.length], e + 3); e += 6; }
    }
    this.fill.geometry.getAttribute('position').needsUpdate = true;
    this.edges.geometry.getAttribute('position').needsUpdate = true;
    this.group.visible = this.pieces.length > 0;
  }
}
