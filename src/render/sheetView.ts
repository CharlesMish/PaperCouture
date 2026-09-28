import * as THREE from 'three';
import { Mat34, OpAnim, posePoint } from '../fold/timeline';

// Draws the folded sheet for one operation's set of pieces.
//
// One non-indexed BufferGeometry holds every piece (a convex polygon, fan
// triangulated) plus a thin "hinge strip" for each crease between pieces that
// separate during the op. Two meshes share it: the front mesh renders
// front-facing triangles with the printed texture, the back mesh renders
// back-facing triangles with the reverse texture. Because UVs are the
// original material coordinates, the pattern cannot slide or stretch; which
// side you see is decided purely by the paper's orientation.
//
// Hinge strips join the edge of piece A to the same material edge on piece B.
// When the pieces lie flat together the strip has zero area; when a crease is
// folded flat the strip becomes the visible folded edge, closing the small
// rendering gap between stacked layers (LAYER_GAP).

const TINT = new THREE.Color('#ffe2b8');
const WHITE = new THREE.Color(1, 1, 1);

export class SheetView {
  /** Model space: x to the right, y toward the far edge of the table, z up. */
  readonly group = new THREE.Group();
  readonly front: THREE.Mesh;
  readonly back: THREE.Mesh;

  private geom = new THREE.BufferGeometry();
  private anim: OpAnim | null = null;
  private vPiece = new Int32Array(0);
  private vMat = new Float32Array(0);
  private pieceVerts = 0;
  private tintKey = '';

  constructor(frontMat: THREE.MeshStandardMaterial, backMat: THREE.MeshStandardMaterial) {
    frontMat.side = THREE.FrontSide;
    backMat.side = THREE.BackSide;
    frontMat.vertexColors = true;
    backMat.vertexColors = true;
    this.front = new THREE.Mesh(this.geom, frontMat);
    this.back = new THREE.Mesh(this.geom, backMat);
    for (const m of [this.front, this.back]) {
      m.castShadow = true;
      m.receiveShadow = true;
      m.frustumCulled = false;
      this.group.add(m);
    }
  }

  get current(): OpAnim | null {
    return this.anim;
  }

  /** Switch to the piece set of `anim` (rebuilds buffers only when it changes). */
  setAnim(anim: OpAnim): void {
    if (this.anim === anim) return;
    this.anim = anim;
    this.tintKey = '';

    let tris = 0;
    for (const p of anim.pieces) tris += p.poly.length - 2;
    const hingeTris = anim.hinges.length * 2;
    const n = (tris + hingeTris) * 3;
    const piece = new Int32Array(n);
    const mat = new Float32Array(n * 2);
    const uv = new Float32Array(n * 2);
    let k = 0;
    const put = (pi: number, x: number, y: number) => {
      piece[k] = pi;
      mat[k * 2] = x;
      mat[k * 2 + 1] = y;
      uv[k * 2] = (x + 1) / 2;
      uv[k * 2 + 1] = (y + 1) / 2;
      k++;
    };
    for (const p of anim.pieces) {
      const q = p.poly;
      for (let i = 1; i + 1 < q.length; i++) {
        put(p.index, q[0].x, q[0].y);
        put(p.index, q[i].x, q[i].y);
        put(p.index, q[i + 1].x, q[i + 1].y);
      }
    }
    this.pieceVerts = k;
    for (const h of anim.hinges) {
      // A0 B0 A1 / A1 B0 B1 : this winding makes the strip's front face agree
      // with the pieces it joins (see file header).
      put(h.a, h.m0.x, h.m0.y);
      put(h.b, h.m0.x, h.m0.y);
      put(h.a, h.m1.x, h.m1.y);
      put(h.a, h.m1.x, h.m1.y);
      put(h.b, h.m0.x, h.m0.y);
      put(h.b, h.m1.x, h.m1.y);
    }
    this.vPiece = piece;
    this.vMat = mat;

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3).fill(1), 3));
    this.geom.dispose();
    this.geom = g;
    this.front.geometry = g;
    this.back.geometry = g;
  }

  /** Place every vertex from the per-piece poses produced by evaluateFrame. */
  pose(M: Mat34): void {
    const pos = this.geom.getAttribute('position') as THREE.BufferAttribute;
    const nor = this.geom.getAttribute('normal') as THREE.BufferAttribute;
    const P = pos.array as Float32Array;
    const N = nor.array as Float32Array;
    const n = this.vPiece.length;
    for (let i = 0; i < n; i++) {
      const o = this.vPiece[i] * 12;
      const [x, y, z] = posePoint(M, o, this.vMat[i * 2], this.vMat[i * 2 + 1]);
      P[i * 3] = x;
      P[i * 3 + 1] = y;
      P[i * 3 + 2] = z;
      // column 2 of the pose is the direction the printed side faces
      N[i * 3] = M[o + 2];
      N[i * 3 + 1] = M[o + 6];
      N[i * 3 + 2] = M[o + 10];
    }
    // hinge strips: face normal from their own geometry
    for (let i = this.pieceVerts; i < n; i += 3) {
      const ax = P[i * 3], ay = P[i * 3 + 1], az = P[i * 3 + 2];
      const e1x = P[i * 3 + 3] - ax, e1y = P[i * 3 + 4] - ay, e1z = P[i * 3 + 5] - az;
      const e2x = P[i * 3 + 6] - ax, e2y = P[i * 3 + 7] - ay, e2z = P[i * 3 + 8] - az;
      let nx = e1y * e2z - e1z * e2y;
      let ny = e1z * e2x - e1x * e2z;
      let nz = e1x * e2y - e1y * e2x;
      const L = Math.hypot(nx, ny, nz);
      if (L < 1e-12) continue; // degenerate while flat: keep the piece normal
      nx /= L;
      ny /= L;
      nz /= L;
      for (let j = 0; j < 3; j++) {
        N[(i + j) * 3] = nx;
        N[(i + j) * 3 + 1] = ny;
        N[(i + j) * 3 + 2] = nz;
      }
    }
    pos.needsUpdate = true;
    nor.needsUpdate = true;
  }

  /** Warm tint on the pieces that the pending op will move (empty = no tint). */
  setTint(pieces: Set<number>, amount: number): void {
    const key = [...pieces].sort((a, b) => a - b).join(',') + '|' + amount.toFixed(3);
    if (key === this.tintKey) return;
    this.tintKey = key;
    const col = this.geom.getAttribute('color') as THREE.BufferAttribute;
    const C = col.array as Float32Array;
    const tint = WHITE.clone().lerp(TINT, amount);
    for (let i = 0; i < this.vPiece.length; i++) {
      const c = pieces.has(this.vPiece[i]) ? tint : WHITE;
      C[i * 3] = c.r;
      C[i * 3 + 1] = c.g;
      C[i * 3 + 2] = c.b;
    }
    col.needsUpdate = true;
  }

  /** Piece index under a raycast hit on either mesh, or -1. */
  pieceFromHit(hit: THREE.Intersection): number {
    if (hit.faceIndex == null) return -1;
    const v = hit.faceIndex * 3;
    return v < this.vPiece.length ? this.vPiece[v] : -1;
  }

  /** Model-space bounds of the current pose (used for framing). */
  bounds(target = new THREE.Box3()): THREE.Box3 {
    this.geom.computeBoundingBox();
    return target.copy(this.geom.boundingBox!);
  }
}
