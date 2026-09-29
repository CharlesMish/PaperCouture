import './styles.css';
import * as THREE from 'three';
import { buildDress } from './fold/construction';
import { buildJacket } from './fold/jacket';
import { buildPin } from './fold/pin';
import { StudioControls, GarmentId, PinPosition } from './ui/studioControls';
import { buildTimeline, evaluateFrame, Mat34, OpAnim, LAYER_GAP, posePoint } from './fold/timeline';
import { FoldController } from './app/controller';
import { ViewSwitch } from './app/viewSwitch';
import { DisplayCamera } from './app/displayCamera';
import { PAPERS, findPaper } from './papers';
import { rotationCheckPaper } from './papers/rotationCheck';
import { makePaperTextures, PaperTextures } from './render/textures';
import { SheetView } from './render/sheetView';
import { FoldGuides } from './render/guides';
import { Stage } from './render/stage';
import { makeStand, SLOT_DEPTH, STAND_HEIGHT } from './render/stand';
import { WorkshopPanel } from './ui/workshopPanel';
import { DisplayPanel } from './ui/displayPanel';
import { PaperPicker } from './ui/paperPicker';

const params = new URLSearchParams(location.search);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- folding data (pure, precomputed once)
let garmentId: GarmentId = params.get('design') === 'jacket' ? 'jacket' : 'dress';
let accessoryMode = false;
let attached = false;
let pinPosition: PinPosition = 'neckline';
let construction = garmentId === 'jacket' ? buildJacket() : buildDress();
let timeline = buildTimeline(construction.ops);
let ops = timeline.ops;
let lastOp = ops[ops.length - 1];

// extent of the finished piece in model coordinates, for the stand and framing
function measureFinished() {
  const M = evaluateFrame(lastOp, 1);
  const lo = new THREE.Vector3(Infinity, Infinity, Infinity);
  const hi = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
  for (const p of lastOp.pieces) {
    for (const m of p.poly) {
      const v = new THREE.Vector3(...posePoint(M, p.index * 12, m.x, m.y));
      lo.min(v);
      hi.max(v);
    }
  }
  return { lo, hi };
}
let finished = measureFinished();

// ---- scene
const app = document.getElementById('app')!;
const canvas = document.getElementById('stage') as HTMLCanvasElement;
const stage = new Stage(canvas);

const frontMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
const backMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
const sheet = new SheetView(frontMat, backMat);
const guides = new FoldGuides();
stage.modelRoot.add(sheet.group, guides.group);
const pinFront = new THREE.MeshStandardMaterial({ roughness: 0.9 });
const pinBack = new THREE.MeshStandardMaterial({ roughness: 0.9 });
const pinSheet = new SheetView(pinFront, pinBack);
const pinTimeline = buildTimeline(buildPin().ops);
const pinFinal = pinTimeline.ops[pinTimeline.ops.length - 1];
pinSheet.setAnim(pinFinal);
pinSheet.pose(evaluateFrame(pinFinal, 1));
pinSheet.group.scale.setScalar(0.16);
pinSheet.group.visible = false;
stage.modelRoot.add(pinSheet.group);
// Visible outlines follow the actual resting facets, not a decorative drawn cross.
const seamPoints: number[] = [];
const pinPose = evaluateFrame(pinFinal, 1);
for (const p of pinFinal.pieces) {
  if (pinPose[p.index * 12 + 10] < 0) continue;
  for (let i = 0; i < p.poly.length; i++) {
    for (const m of [p.poly[i], p.poly[(i + 1) % p.poly.length]]) {
      const point = posePoint(pinPose, p.index * 12, m.x, m.y);
      seamPoints.push(point[0], point[1], point[2] + 0.0008);
    }
  }
}
const seamGeometry = new THREE.BufferGeometry();
seamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(seamPoints, 3));
const seamMaterial = new THREE.LineBasicMaterial({ color: '#302b26', transparent: true, opacity: 0.3 });
pinSheet.group.add(new THREE.LineSegments(seamGeometry, seamMaterial));
const studySeams = new THREE.LineSegments(seamGeometry, seamMaterial);
studySeams.visible = false;
stage.modelRoot.add(studySeams);
const stand = makeStand();
stand.setOpacity(0);
stage.scene.add(stand.group);

// ---- paper
function resolvePaper(id: string | null | undefined) {
  if (id === rotationCheckPaper.id) return rotationCheckPaper;
  return findPaper(id);
}

let paper = resolvePaper(params.get('paper'));
let quarterTurns = ((Number(params.get('turn')) || 0) % 4 + 4) % 4;
let textures: PaperTextures | null = null;
let garmentPaper = paper;
let garmentTurns = quarterTurns;
let pinPaper = findPaper('tidal-bands');
let pinTurns = 0;
let pinTextures: PaperTextures | null = null;
function applyPinPaper() {
  pinTextures?.dispose();
  pinTextures = makePaperTextures(pinPaper, pinTurns, stage.renderer.capabilities.getMaxAnisotropy());
  pinFront.map = pinTextures.front; pinBack.map = pinTextures.back;
  pinFront.needsUpdate = pinBack.needsUpdate = true;
}
function applyPaper() {
  if (accessoryMode) { pinPaper = paper; pinTurns = quarterTurns; applyPinPaper(); }
  else { garmentPaper = paper; garmentTurns = quarterTurns; }
  textures?.dispose();
  textures = makePaperTextures(paper, quarterTurns, stage.renderer.capabilities.getMaxAnisotropy());
  frontMat.map = textures.front;
  backMat.map = textures.back;
  frontMat.needsUpdate = backMat.needsUpdate = true;
  document.documentElement.style.setProperty('--accent', paper.reverse);
  picker?.render(paper, quarterTurns);
  refreshDisplayPanel();
}

// ---- state
let controller = new FoldController(ops.length, (i) => {
  const base = ops[i].op.kind === 'turn' ? 1.5 : 1.15;
  return reducedMotion ? base * 0.6 : base;
});
const view = new ViewSwitch(reducedMotion ? 0.6 : 1.1);
const displayCam = new DisplayCamera(stage, canvas);

// ---- interface
const picker = new PaperPicker(app, PAPERS, {
  onSelect: (id) => {
    paper = findPaper(id);
    applyPaper();
  },
  onRotate: () => {
    quarterTurns = (quarterTurns + 1) % 4;
    applyPaper();
  },
});

const workshopPanel = new WorkshopPanel(app, {
  onBack: () => controller.prev(),
  onFold: () => (controller.finished ? accessoryMode ? finishPin() : enterDisplay() : controller.next()),
  onReset: () => controller.reset(),
});

const displayPanel = new DisplayPanel(app, {
  onView: (v) => displayCam.show(v),
  onTurntable: () => displayCam.setTurntable(!displayCam.turntable),
  onReset: () => displayCam.resetView(),
  onReturn: () => leaveDisplay(),
});

function refreshWorkshopPanel() {
  studio.render(garmentId, accessoryMode, controller.finished, attached, pinPosition);
  const a = controller.activeOp;
  const op = a === null ? null : ops[a].op;
  workshopPanel.render({
    total: ops.length,
    done: controller.step,
    active: a,
    title: op ? op.title : `${construction.name} is folded`,
    hint: op ? op.hint : accessoryMode ? 'Attach this separate paper pin, or return to the garment without adding it.' : 'Put it on display, or fold a small pin from another paper.',
    foldLabel: controller.finished ? accessoryMode ? 'Attach pin' : 'Display' : op?.kind === 'turn' ? 'Turn over' : 'Fold',
    canBack: controller.step > 0 || controller.moving,
    canFold: true,
    moving: controller.moving,
  });
}
function refreshDisplayPanel() {
  displayPanel.render(`${construction.name} · ${paper.name}`, displayCam.turntable);
}
const studio = new StudioControls(app, {
  onDesign: changeGarment,
  onEdit: editPin,
  onRemove: () => { attached = false; refreshWorkshopPanel(); layout(); },
  onReturn: returnToGarment,
  onPosition: (p) => { pinPosition = p; refreshWorkshopPanel(); },
});
let unsubscribeController = controller.onChange(refreshWorkshopPanel);
displayCam.onChange(refreshDisplayPanel);
refreshWorkshopPanel();
applyPaper();
applyPinPaper();

// ---- views
const WORK_TARGET = new THREE.Vector3(0, 0.08, 0);
const WORK_DIR = new THREE.Vector3(0, Math.sin(THREE.MathUtils.degToRad(57)), Math.cos(THREE.MathUtils.degToRad(57)));
let workCamPos = new THREE.Vector3();
let lastDisplayFit = 0;
/** The display end of the camera transition: default front view going in, wherever the user left it coming out. */
const displayCamPos = new THREE.Vector3();

const QUAT_WORK = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
const QUAT_DISPLAY = new THREE.Quaternion();
const POS_DISPLAY = new THREE.Vector3();
function frameSubject() {
  POS_DISPLAY.set(0, STAND_HEIGHT - SLOT_DEPTH - finished.lo.y, -(finished.lo.z + finished.hi.z) / 2);
  const pieceTop = POS_DISPLAY.y + finished.hi.y;
  displayCam.setSubject(new THREE.Vector3(0, pieceTop / 2, 0), Math.max(-finished.lo.x, finished.hi.x) + 0.12, pieceTop / 2 + 0.1);
}
frameSubject();
let savedGarment: { construction: typeof construction; timeline: typeof timeline; controller: FoldController } | null = null;
let savedPinStep = 0;
function replaceConstruction(next: typeof construction, nextTimeline = buildTimeline(next.ops), nextController?: FoldController) {
  cancelDrag();
  unsubscribeController();
  construction = next; timeline = nextTimeline; ops = timeline.ops; lastOp = ops[ops.length - 1];
  controller = nextController ?? new FoldController(ops.length, i => (ops[i].op.kind === 'turn' ? 1.5 : 1.15) * (reducedMotion ? 0.6 : 1));
  unsubscribeController = controller.onChange(refreshWorkshopPanel);
  frame = undefined;
  finished = measureFinished(); frameSubject();
  displayCam.setEnabled(false); displayCam.setTurntable(false);
  view.jump('workshop');
  refreshWorkshopPanel(); applyPaper(); layout();
}
function changeGarment(id: GarmentId) {
  if (accessoryMode || id === garmentId) return;
  garmentId = id;
  replaceConstruction(id === 'jacket' ? buildJacket() : buildDress());
}
function editPin() {
  if (accessoryMode || !controller.finished) return;
  savedGarment = { construction, timeline, controller };
  accessoryMode = true; paper = pinPaper; quarterTurns = pinTurns;
  replaceConstruction(buildPin(), pinTimeline);
  controller.jumpTo(savedPinStep);
}
function returnToGarment() {
  if (!accessoryMode || !savedGarment) return;
  savedPinStep = controller.step;
  if (!controller.finished) attached = false;
  const saved = savedGarment; savedGarment = null;
  accessoryMode = false; paper = garmentPaper; quarterTurns = garmentTurns;
  replaceConstruction(saved.construction, saved.timeline, saved.controller);
  enterDisplay();
}
function finishPin() {
  if (!accessoryMode || !controller.finished) return;
  attached = true;
  returnToGarment();
}

// Endpoints are only re-captured from a settled view, so reversing mid-transition
// retraces the same path instead of jumping.
function enterDisplay() {
  if (!controller.finished) return;
  const fromRest = view.inWorkshop;
  view.go('display'); // shows the display controls and re-measures the free area
  if (fromRest) displayCamPos.copy(displayCam.positionFor('front'));
}
function leaveDisplay() {
  if (view.inDisplay) displayCamPos.copy(stage.camera.position);
  displayCam.setEnabled(false);
  view.go('workshop');
}

view.onChange(() => {
  const toDisplay = view.target === 1;
  workshopPanel.setVisible(!toDisplay);
  displayPanel.setVisible(toDisplay);
  if (view.inDisplay) displayCam.setEnabled(true);
  layout();
});

function insets() {
  const p = picker.insets();
  const bottom = view.target === 1 ? displayPanel.bottomInset() : workshopPanel.bottomInset();
  const mobile = window.innerWidth < 720;
  return { top: Math.max(p.top, studio.topInset(), mobile ? 44 : 56), left: p.left, right: 0, bottom };
}

function layout() {
  stage.resize();
  stage.setInsets(insets());
  workCamPos = stage.framePose(WORK_TARGET, 1.3, 1.08, WORK_DIR);
  displayCam.updateLimits();
  const fit = displayCam.defaultDistance();
  if (view.inDisplay && lastDisplayFit > 0 && Math.abs(fit - lastDisplayFit) > 1e-6) displayCam.reframe(fit / lastDisplayFit);
  lastDisplayFit = fit;
  if (view.inWorkshop) stage.placeCamera(workCamPos, WORK_TARGET);
}
new ResizeObserver(layout).observe(app);
new ResizeObserver(layout).observe(studio.root);
layout();

window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLElement && e.target.closest('button, select, input, textarea')) return;
  if (view.inWorkshop) {
    if (e.key === 'ArrowRight') controller.next();
    else if (e.key === 'ArrowLeft') controller.prev();
  } else if (view.inDisplay && e.key === 'Escape') {
    leaveDisplay();
  }
});

// ---- pose evaluation
const PEEK_FOLD = 8; // degrees the pending flap lifts while waiting
const PEEK_TURN = 4;
const tForAngle = (deg: number) => Math.acos(1 - 2 * (deg / 180)) / Math.PI;
let frame: Mat34 | undefined;
const movingPieces = (a: OpAnim) => new Set(a.pieces.filter((p) => p.spec >= 0).map((p) => p.index));
const ease = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const smooth = (a: number, b: number, t: number) => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

function placePiece() {
  const e = ease(view.t);
  const root = stage.modelRoot;
  root.quaternion.slerpQuaternions(QUAT_WORK, QUAT_DISPLAY, e);
  root.position.lerpVectors(new THREE.Vector3(), POS_DISPLAY, e);
  root.position.y += Math.sin(Math.PI * e) * 0.55; // arc up so the swinging hem clears the table
  stand.setOpacity(smooth(0.55, 1, e));
  stage.backLight.intensity = 1.9 * e;
  if (!view.inWorkshop && !view.inDisplay) {
    const target = WORK_TARGET.clone().lerp(displayCam.target, e);
    stage.placeCamera(workCamPos.clone().lerp(displayCamPos, e), target);
  }
}

function draw() {
  studySeams.visible = accessoryMode && controller.finished;
  pinSheet.group.visible = attached && !accessoryMode && controller.finished;
  const top = finished.hi.y, bottom = finished.lo.y;
  const y = pinPosition === 'neckline' ? top - 0.17 : pinPosition === 'chest' ? top - 0.42 : bottom + (top - bottom) * 0.40;
  pinSheet.group.position.set(pinPosition === 'chest' ? -0.29 : 0, y, finished.hi.z + 0.014);
  const pose = controller.pose();
  const anim = ops[pose.op];
  sheet.setAnim(anim);
  const workshop = view.inWorkshop;
  const t = pose.pending && workshop ? tForAngle(anim.op.kind === 'turn' ? PEEK_TURN : PEEK_FOLD) : pose.t;
  frame = evaluateFrame(anim, t, frame);
  sheet.pose(frame);
  const preview = workshop && (pose.pending || controller.isScrubbing);
  sheet.setTint(preview && anim.op.kind === 'fold' ? movingPieces(anim) : new Set(), 0.55);
  if (preview) guides.show(anim, anim.maxPreZ + LAYER_GAP);
  else guides.hide();
  stage.render();
}

// ---- drag to fold: grab paper that the pending fold moves, pull it toward the arrow
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let drag: { id: number; x0: number; y0: number; vx: number; vy: number } | null = null;
function cancelDrag() {
  if (drag && canvas.hasPointerCapture(drag.id)) canvas.releasePointerCapture(drag.id);
  drag = null;
}

function toScreen(p: THREE.Vector3): THREE.Vector2 {
  const v = p.clone().applyMatrix4(stage.modelRoot.matrixWorld).project(stage.camera);
  return new THREE.Vector2(((v.x + 1) / 2) * canvas.clientWidth, ((1 - v.y) / 2) * canvas.clientHeight);
}

function pickMovingPiece(e: PointerEvent): number {
  const r = canvas.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  raycaster.setFromCamera(ndc, stage.camera);
  const hit = raycaster.intersectObjects([sheet.front, sheet.back], false)[0];
  if (!hit) return -1;
  const idx = sheet.pieceFromHit(hit);
  const anim = sheet.current;
  if (!anim || idx < 0) return -1;
  return anim.pieces[idx].spec >= 0 ? idx : -1;
}

canvas.addEventListener('pointerdown', (e) => {
  if (!view.inWorkshop) return;
  const pose = controller.pose();
  if (!pose.pending) return;
  const idx = pickMovingPiece(e);
  if (idx < 0) return;
  const anim = ops[pose.op];
  let from: THREE.Vector3;
  let to: THREE.Vector3;
  if (anim.op.kind === 'turn') {
    from = new THREE.Vector3(0.8, 0, 0);
    to = new THREE.Vector3(-0.8, 0, 0);
  } else {
    const ar = anim.arrows[anim.pieces[idx].spec];
    from = new THREE.Vector3(ar.from.x, ar.from.y, 0);
    to = new THREE.Vector3(ar.to.x, ar.to.y, 0);
  }
  const a = toScreen(from);
  const b = toScreen(to);
  if (!controller.beginScrub()) return;
  drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, vx: b.x - a.x, vy: b.y - a.y };
  canvas.setPointerCapture(e.pointerId);
  e.preventDefault();
});

canvas.addEventListener('pointermove', (e) => {
  if (drag && e.pointerId === drag.id) {
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;
    controller.scrubTo((dx * drag.vx + dy * drag.vy) / (drag.vx * drag.vx + drag.vy * drag.vy));
    return;
  }
  if (e.pointerType === 'mouse') {
    const grab = view.inWorkshop && controller.pose().pending && pickMovingPiece(e) >= 0;
    canvas.style.cursor = grab ? 'grab' : view.inDisplay ? 'move' : '';
  }
});

function endDrag(e: PointerEvent, cancelled: boolean) {
  if (!drag || e.pointerId !== drag.id) return;
  const t = controller.pose().t;
  drag = null;
  controller.endScrub(!cancelled && t > 0.35);
}
canvas.addEventListener('pointerup', (e) => endDrag(e, false));
canvas.addEventListener('pointercancel', (e) => endDrag(e, true));

// ---- start-up state from the URL (?step=6&view=display&paper=grid&turn=1)
const startStep = Number(params.get('step'));
if (startStep > 0) controller.jumpTo(startStep);
if (params.get('view') === 'display' && controller.finished) {
  displayCamPos.copy(displayCam.positionFor('front'));
  view.jump('display');
  stage.placeCamera(displayCamPos, displayCam.target);
  displayCam.setEnabled(true);
}

// ---- loop
let last = performance.now();
function tick(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  controller.update(dt);
  view.update(dt);
  placePiece();
  if (view.inDisplay) displayCam.update(dt);
  draw();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// Handle for manual inspection and automated checks in the browser console.
Object.assign(window, {
  paperCouture: {
    get controller() { return controller; },
    get timeline() { return timeline; },
    get garmentId() { return garmentId; },
    get accessoryMode() { return accessoryMode; },
    get attached() { return attached; },
    get paperId() { return paper.id; },
    get quarterTurns() { return quarterTurns; },
    pinSheet,
    view,
    displayCam,
    stage,
    enterDisplay,
    leaveDisplay,
    setPaper(id: string) {
      paper = resolvePaper(id);
      applyPaper();
    },
    rotatePattern(q: number) {
      quarterTurns = ((q % 4) + 4) % 4;
      applyPaper();
    },
  },
});
