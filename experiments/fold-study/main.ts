import '../../src/styles.css';
import './style.css';
import * as THREE from 'three';
import { CANDIDATES, CandidateId } from './constructions';
import { buildTimeline, evaluateFrame, posePoint, LAYER_GAP, Mat34 } from '../../src/fold/timeline';
import { centroid } from '../../src/fold/geometry';
import { FoldController } from '../../src/app/controller';
import { DisplayCamera } from '../../src/app/displayCamera';
import { ViewSwitch } from '../../src/app/viewSwitch';
import { Stage } from '../../src/render/stage';
import { SheetView } from '../../src/render/sheetView';
import { FoldGuides } from '../../src/render/guides';
import { makeStand, STAND_HEIGHT, SLOT_DEPTH } from '../../src/render/stand';
import { makePaperTextures, PaperTextures } from '../../src/render/textures';
import { PAPERS, findPaper } from '../../src/papers';
import { PaperPicker } from '../../src/ui/paperPicker';
import { WorkshopPanel } from '../../src/ui/workshopPanel';
import { DisplayPanel } from '../../src/ui/displayPanel';
import { FoldHandles, FoldTarget, dragVector } from '../../src/ui/foldHandles';

const params = new URLSearchParams(location.search);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const sessions = Object.fromEntries(Object.entries(CANDIDATES).map(([id, build]) => {
  const construction = build(), timeline = buildTimeline(construction.ops);
  return [id, { construction, timeline, controller: new FoldController(construction.ops.length, i =>
    (construction.ops[i].kind === 'turn' ? 1.5 : 1.15) * (reduced ? .6 : 1)), paper: findPaper('pinstripe-lining'), turns: 0 }];
})) as Record<CandidateId, { construction: ReturnType<typeof CANDIDATES.clutch>; timeline: ReturnType<typeof buildTimeline>; controller: FoldController; paper: ReturnType<typeof findPaper>; turns: number }>;
let item: CandidateId = params.get('item') === 'apron' ? 'apron' : 'clutch';
const current = () => sessions[item];
if (params.has('paper')) current().paper = findPaper(params.get('paper'));
const initialTurn = Number(params.get('turn'));
current().turns = Number.isFinite(initialTurn) ? ((Math.round(initialTurn) % 4 + 4) % 4) : 0;
const initialStep = Number(params.get('step'));
if (Number.isFinite(initialStep) && initialStep > 0) current().controller.jumpTo(initialStep);

const app = document.getElementById('app')!, canvas = document.getElementById('stage') as HTMLCanvasElement;
const selector = document.querySelector('select')!;
const controls = document.querySelector('.study-controls')!;
const stage = new Stage(canvas), fm = new THREE.MeshStandardMaterial({ roughness: .9 }), bm = fm.clone();
const sheet = new SheetView(fm, bm), guides = new FoldGuides(), displayCam = new DisplayCamera(stage, canvas), view = new ViewSwitch(reduced ? .6 : 1.1);
stage.modelRoot.add(sheet.group, guides.group);
const stand = makeStand(); stand.setOpacity(0); stage.scene.add(stand.group);
let textures: PaperTextures | null = null;
let frame: Mat34 | undefined;
const workTarget = new THREE.Vector3(0, .08, 0), workDir = new THREE.Vector3(0, Math.sin(THREE.MathUtils.degToRad(57)), Math.cos(THREE.MathUtils.degToRad(57)));
let workCamera = new THREE.Vector3(), lastFit = 0;
const displayPosition = new THREE.Vector3(), displayCameraPosition = new THREE.Vector3();
const workQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
let displayQuat = new THREE.Quaternion();

const picker = new PaperPicker(app, PAPERS, {
  onSelect(id) { current().paper = findPaper(id); applyPaper(); },
  onRotate() { current().turns = (current().turns + 1) % 4; applyPaper(); },
});
const workshop = new WorkshopPanel(app, {
  onBack() { current().controller.prev(); },
  onFold() { if (current().controller.finished) enterDisplay(); else current().controller.next(); },
  onReset() { cancelDrag(); current().controller.reset(); },
});
const display = new DisplayPanel(app, {
  onView(v) { displayCam.show(v); }, onTurntable() { displayCam.setTurntable(!displayCam.turntable); },
  onReset() { displayCam.resetView(); }, onReturn: leaveDisplay,
});
function applyPaper() {
  const s = current(); textures?.dispose(); textures = makePaperTextures(s.paper, s.turns, stage.renderer.capabilities.getMaxAnisotropy());
  fm.map = textures.front; bm.map = textures.back; fm.needsUpdate = bm.needsUpdate = true;
  document.documentElement.style.setProperty('--accent', s.paper.reverse); picker.render(s.paper, s.turns); refresh();
}
function refresh() {
  const s = current(), c = s.controller, active = c.activeOp, op = active === null ? null : s.construction.ops[active];
  workshop.render({ total: c.count, done: c.step, active, title: op?.title ?? `${s.construction.name} is folded`,
    hint: op?.hint ?? 'Inspect both faces and the edges in Display. Return to Workshop to unfold it.',
    foldLabel: c.finished ? 'Display' : c.moving ? 'Finish' : op?.kind === 'turn' ? 'Turn over' : 'Fold',
    canBack: c.step > 0 || c.moving, canFold: true, moving: c.moving });
  display.render(`${s.construction.name} · ${s.paper.name}`, displayCam.turntable);
  selector.value = item; layout();
}
function frameSubject() {
  const last = current().timeline.ops.at(-1)!, M = evaluateFrame(last, 1);
  const angle = item === 'clutch' ? -Math.PI / 4 : 0;
  displayQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), angle);
  const lo = new THREE.Vector3(Infinity, Infinity, Infinity), hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (const p of last.pieces) for (const m of p.poly) {
    const q = new THREE.Vector3(...posePoint(M, p.index * 12, m.x, m.y)).applyQuaternion(displayQuat); lo.min(q); hi.max(q);
  }
  displayPosition.set(0, STAND_HEIGHT - SLOT_DEPTH - lo.y, -(lo.z + hi.z) / 2);
  const top = displayPosition.y + hi.y;
  displayCam.setSubject(new THREE.Vector3(0, top / 2, 0), Math.max(-lo.x, hi.x) + .12, top / 2 + .1);
}
function layout() {
  stage.resize(); const p = picker.insets(), r = controls.getBoundingClientRect();
  stage.setInsets({ top: Math.max(p.top, r.bottom + 10), left: p.left, right: 0, bottom: view.target ? display.bottomInset() : workshop.bottomInset() });
  workCamera = stage.framePose(workTarget, 1.35, 1.15, workDir);
  displayCam.updateLimits(); const fit = displayCam.defaultDistance();
  if (lastFit > 0 && Math.abs(fit - lastFit) > 1e-6) {
    if (view.inDisplay) displayCam.reframe(fit / lastFit);
    else displayCameraPosition.sub(displayCam.target).multiplyScalar(fit / lastFit).add(displayCam.target);
  }
  lastFit = fit; if (view.inWorkshop) stage.placeCamera(workCamera, workTarget);
}
function enterDisplay() {
  if (!current().controller.finished) return;
  const atRest = view.inWorkshop; view.go('display');
  if (atRest) displayCameraPosition.copy(displayCam.positionFor('front'));
}
function leaveDisplay() {
  if (view.inDisplay) displayCameraPosition.copy(stage.camera.position);
  displayCam.setEnabled(false); view.go('workshop');
}
view.onChange(() => {
  workshop.setVisible(!view.target); display.setVisible(!!view.target); layout();
  if (view.inDisplay) { stage.placeCamera(displayCameraPosition, displayCam.target); displayCam.setEnabled(true); }
});
displayCam.onChange(refresh);
for (const s of Object.values(sessions)) s.controller.onChange(refresh);
selector.addEventListener('change', () => {
  const nextItem = selector.value as CandidateId;
  cancelDrag(); item = nextItem; frame = undefined; displayCam.setEnabled(false); lastFit = 0;
  frameSubject(); view.jump('workshop'); applyPaper();
});

let drag: { id: number; target: HTMLElement; x: number; y: number; vx: number; vy: number; travel: number; handle: boolean } | null = null;
function cancelDrag() {
  if (drag?.target.hasPointerCapture(drag.id)) drag.target.releasePointerCapture(drag.id);
  if (current().controller.isScrubbing) current().controller.endScrub(false);
  drag = null;
}
const screen = (v: THREE.Vector3) => { const p = v.applyMatrix4(stage.modelRoot.matrixWorld).project(stage.camera); return new THREE.Vector2((p.x + 1) / 2 * canvas.clientWidth, (1 - p.y) / 2 * canvas.clientHeight); };
function startDrag(e: PointerEvent, index: number, handle = false) {
  const c = current().controller, a = current().timeline.ops[c.pose().op];
  if (!view.inWorkshop || drag || !c.pose().pending || index < 0 || a.pieces[index]?.spec < 0 || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const arrow = a.op.kind === 'turn' ? { from: { x: .8, y: 0 }, to: { x: -.8, y: 0 } } : a.arrows[a.pieces[index].spec];
  const v = screen(new THREE.Vector3(arrow.to.x, arrow.to.y, 0)).sub(screen(new THREE.Vector3(arrow.from.x, arrow.from.y, 0)));
  if (!c.beginScrub()) return;
  drag = { id: e.pointerId, target: e.currentTarget as HTMLElement, x: e.clientX, y: e.clientY, ...dragVector(v.x, v.y), travel: 0, handle };
  drag.target.setPointerCapture(e.pointerId); e.preventDefault();
}
const handles = new FoldHandles(app, (e, i) => startDrag(e, i, true), () => current().controller.next());
const raycaster = new THREE.Raycaster();
canvas.addEventListener('pointerdown', e => {
  raycaster.setFromCamera(new THREE.Vector2(2 * e.clientX / canvas.clientWidth - 1, 1 - 2 * e.clientY / canvas.clientHeight), stage.camera);
  const hit = raycaster.intersectObjects([sheet.front, sheet.back])[0]; if (hit) startDrag(e, sheet.pieceFromHit(hit));
});
window.addEventListener('pointermove', e => {
  if (!drag || drag.id !== e.pointerId) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.travel = Math.max(drag.travel, Math.hypot(dx, dy));
  current().controller.scrubTo((dx * drag.vx + dy * drag.vy) / (drag.vx ** 2 + drag.vy ** 2));
});
function endDrag(e: PointerEvent, cancelled = false) {
  if (!drag || drag.id !== e.pointerId) return;
  const commit = !cancelled && ((drag.handle && drag.travel < 6) || current().controller.pose().t > .35);
  const target = drag.target; drag = null;
  if (target.hasPointerCapture(e.pointerId)) target.releasePointerCapture(e.pointerId);
  current().controller.endScrub(commit);
}
window.addEventListener('pointerup', e => endDrag(e)); window.addEventListener('pointercancel', e => endDrag(e, true));
window.addEventListener('keydown', e => {
  if (e.target instanceof HTMLElement && e.target.closest('button,select,input,textarea')) return;
  if (view.inWorkshop && e.key === 'ArrowRight') current().controller.next();
  else if (view.inWorkshop && e.key === 'ArrowLeft') current().controller.prev();
  else if (e.key === 'Escape') leaveDisplay();
});
frameSubject(); applyPaper(); refresh();
new ResizeObserver(layout).observe(app); new ResizeObserver(layout).observe(controls); new ResizeObserver(layout).observe(workshop.dock); new ResizeObserver(layout).observe(display.dock);
if (params.get('view') === 'display' && current().controller.finished) {
  view.jump('display'); displayCameraPosition.copy(displayCam.positionFor('front')); stage.placeCamera(displayCameraPosition, displayCam.target); displayCam.setEnabled(true);
}
let last = performance.now();
function tick(now: number) {
  const dt = Math.min(.05, (now - last) / 1000); last = now; current().controller.update(dt); view.update(dt);
  const e = .5 - .5 * Math.cos(Math.PI * view.t);
  stage.modelRoot.quaternion.slerpQuaternions(workQuat, displayQuat, e);
  stage.modelRoot.position.copy(displayPosition).multiplyScalar(e); stage.modelRoot.position.y += Math.sin(Math.PI * e) * .55;
  stand.setOpacity(e); stage.backLight.intensity = 1.9 * e;
  if (!view.inDisplay && !view.inWorkshop) stage.placeCamera(workCamera.clone().lerp(displayCameraPosition, e), workTarget.clone().lerp(displayCam.target, e));
  if (view.inDisplay) displayCam.update(dt);
  const s = current(), pose = s.controller.pose(), a = s.timeline.ops[pose.op], preview = view.inWorkshop && (pose.pending || s.controller.isScrubbing);
  sheet.setAnim(a); frame = evaluateFrame(a, pose.t, frame); sheet.pose(frame);
  sheet.setTint(preview && a.op.kind === 'fold' ? new Set(a.pieces.filter(p => p.spec >= 0).map(p => p.index)) : new Set(), .55);
  if (preview) guides.show(a, a.maxPreZ + LAYER_GAP); else guides.hide();
  stage.modelRoot.updateMatrixWorld(true);
  const targets: FoldTarget[] = [];
  if (preview && a.op.kind === 'fold') for (const piece of a.pieces) {
    if (piece.spec < 0) continue;
    const pts = piece.poly.map(m => screen(new THREE.Vector3(...posePoint(frame!, piece.index * 12, m.x, m.y))));
    const w = Math.max(...pts.map(p => p.x)) - Math.min(...pts.map(p => p.x)), h = Math.max(...pts.map(p => p.y)) - Math.min(...pts.map(p => p.y));
    // This triangular tip can have a broad bounding box but little reachable paper.
    const clutchTip = item === 'clutch' && a.op.id === 'tip';
    if (!clutchTip && Math.min(w, h) >= 28 && w * h >= 1300) continue;
    const c = centroid(piece.poly), p = screen(new THREE.Vector3(...posePoint(frame, piece.index * 12, c.x, c.y))), arrow = a.arrows[piece.spec];
    const v = screen(new THREE.Vector3(arrow.to.x, arrow.to.y, 0)).sub(screen(new THREE.Vector3(arrow.from.x, arrow.from.y, 0)));
    targets.push({ piece: piece.index, x: p.x, y: p.y, vx: v.x, vy: v.y });
  }
  handles.render(targets, s.controller.isScrubbing); stage.render(); requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
Object.assign(window, { foldStudy: { get item() { return item; }, get controller() { return current().controller; }, get timeline() { return current().timeline; }, get paperId() { return current().paper.id; }, get turns() { return current().turns; }, view, stage, sheet, displayCam } });
