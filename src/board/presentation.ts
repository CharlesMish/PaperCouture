import * as THREE from 'three';
import { BoardState, GuideId, GuideTransform } from './model';
import { makeFigureGuides, makePin, disposeDecor } from './decor';
import { BOARD_MARGIN } from './layout';

interface GuideSlot {
  object: THREE.Object3D; baseX: number; baseScale: number; bounds: THREE.Box3;
  pose: GuideTransform; maxScale: number;
}

/** Presentation objects never enter captured geometry, garment bounds, or picking. */
export class BoardDecor {
  readonly root = new THREE.Group();
  private pins = new Map<string, THREE.Group>();
  private anchors = new Map<string, THREE.Vector3>();
  private bounds = new Map<string, THREE.Box3>();
  private pinStyle = 'none';
  private guideKey = '';
  private guide?: THREE.Group;
  private guides = new Map<GuideId, GuideSlot>();
  private width = 3.6;
  private height = 4.2;
  private ray = new THREE.Raycaster();

  private hit(x: number, y: number, groups: THREE.Object3D[]) {
    this.ray.set(new THREE.Vector3(x, y, 8), new THREE.Vector3(0, 0, -1));
    return this.ray.intersectObjects(groups, true).find(h => h.object instanceof THREE.Mesh);
  }

  guideInfo(id: GuideId) { return this.guides.get(id); }

  constrainGuide(id: GuideId, pose: GuideTransform): GuideTransform {
    const slot = this.guides.get(id); if (!slot) return pose;
    const scale = THREE.MathUtils.clamp(pose.scale, .5, slot.maxScale), b = slot.bounds;
    return { scale,
      x: THREE.MathUtils.clamp(pose.x, -this.width/2 + BOARD_MARGIN - b.min.x*scale, this.width/2 - BOARD_MARGIN - b.max.x*scale),
      y: THREE.MathUtils.clamp(pose.y, -this.height/2 + BOARD_MARGIN - b.min.y*scale, this.height/2 - BOARD_MARGIN - b.max.y*scale) };
  }

  sync(state: BoardState, groups: Map<string, THREE.Group>, width: number, height: number, photograph: boolean) {
    this.width = width; this.height = height;
    const a = state.appearance, style = a?.pins ?? 'none';
    const guideKey = `${a?.guide ?? 'none'}:${a?.surface}:${width}:${height}`;
    if (guideKey !== this.guideKey) {
      if (this.guide) { disposeDecor(this.guide); this.guide.removeFromParent(); this.guide = undefined; }
      this.guides.clear();
      this.guideKey = guideKey;
      if (a && a.guide !== 'none') {
        this.guide = makeFigureGuides(a.guide === 'one' ? 1 : 2, width, height, a.surface === 'slate' ? 'light' : 'dark');
        for (const [index, figure] of this.guide.children.entries()) {
          const id: GuideId = a.guide === 'one' ? 'one' : index === 0 ? 'left' : 'right';
          const bounds = new THREE.Box3().setFromObject(figure, true).translate(new THREE.Vector3(-figure.position.x, 0, 0));
          const size = bounds.getSize(new THREE.Vector3());
          this.guides.set(id, { object: figure, baseX: figure.position.x, baseScale: figure.scale.x, bounds,
            pose: { x: figure.position.x, y: 0, scale: 1 },
            maxScale: Math.floor(100 * Math.min(1.5, (width-2*BOARD_MARGIN)/size.x, (height-2*BOARD_MARGIN)/size.y)) / 100 });
        }
        this.guide.position.z = -.135; this.root.add(this.guide);
      }
    }
    if (this.guide) this.guide.visible = !photograph || !!a?.guideInPhoto;
    for (const [id, slot] of this.guides) {
      // Saved choices remain intact when switching board formats; only the
      // visible reference is fitted. Restoring Roomy recovers the chosen pose.
      slot.pose = this.constrainGuide(id, a?.guideTransforms?.[id] ?? { x: slot.baseX, y: 0, scale: 1 });
      slot.object.position.set(slot.pose.x, slot.pose.y, 0);
      slot.object.scale.setScalar(slot.baseScale * slot.pose.scale);
    }
    if (style !== this.pinStyle) {
      for (const pin of this.pins.values()) { disposeDecor(pin); pin.removeFromParent(); }
      this.pins.clear(); this.pinStyle = style;
    }
    for (const [id, pin] of this.pins) if (!groups.has(id)) {
      disposeDecor(pin); pin.removeFromParent(); this.pins.delete(id); this.anchors.delete(id);
    }
    // Remove cached anchors even when visible pins have been switched off.
    for (const id of this.anchors.keys()) if (!groups.has(id)) this.anchors.delete(id);
    for (const id of this.bounds.keys()) if (!groups.has(id)) this.bounds.delete(id);
    if (style === 'none') return;
    const all = [...groups.values()];
    for (const item of state.items) {
      const group = groups.get(item.id); if (!group) continue;
      let box = this.bounds.get(item.id);
      if (!box) {
        // Restored parts are direct children with frozen matrices. Use local
        // geometry so tilt, drag, style switches and reload select the same pin.
        box = new THREE.Box3();
        for (const child of group.children) if (child instanceof THREE.Mesh)
          box.union(new THREE.Box3().setFromBufferAttribute(child.geometry.getAttribute('position') as THREE.BufferAttribute).applyMatrix4(child.matrix));
        this.bounds.set(item.id, box);
      }
      let pin = this.pins.get(item.id);
      if (!pin) {
        pin = makePin(style, Math.min(.036, Math.max(.018, Math.min(box.max.x-box.min.x, box.max.y-box.min.y)*.07)));
        this.pins.set(item.id, pin); this.root.add(pin);
      }
      let anchor = item.pin ? new THREE.Vector3(item.pin.x, item.pin.y, 0) : this.anchors.get(item.id)?.clone();
      if (!anchor) {
        // Search actual facets near the upper edge; centre alone can be a neck/hole.
        for (const y of [.14, .24, .36, .5, .66, .8]) {
          for (const x of [.5, .38, .62, .25, .75, .12, .88]) {
            const candidate = group.localToWorld(new THREE.Vector3(THREE.MathUtils.lerp(box.min.x, box.max.x, x), THREE.MathUtils.lerp(box.max.y, box.min.y, y), 0));
            const hit = this.hit(candidate.x, candidate.y, [group]);
            if (hit) { anchor = group.worldToLocal(hit.point.clone()); this.anchors.set(item.id, anchor.clone()); break; }
          }
          if (anchor) break;
        }
      }
      pin.visible = false;
      if (!anchor) continue;
      const p = group.localToWorld(anchor.clone()), hit = this.hit(p.x, p.y, all);
      if (!hit) continue;
      let owner = hit.object;
      while (owner.parent && owner !== group && owner.parent !== group.parent) owner = owner.parent;
      // A covered pin stays under the covering paper, rather than jumping forward.
      if (owner !== group) continue;
      pin.position.copy(hit.point); pin.position.z += .002; pin.rotation.z = group.rotation.z;
      pin.visible = true;
    }
    this.root.updateMatrixWorld(true);
  }
}
