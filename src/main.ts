import './styles.css';
import * as THREE from 'three';
import { garmentDecisions, optionsFromParams, optionsToParams, decisionStep, selectOption, sharedFoldPrefix, DecisionId } from './fold/garmentOptions';
import { buildBowCentre } from './fold/bowCentre';
import { centroid } from './fold/geometry';
import { FoldHandles, FoldTarget, dragVector } from './ui/foldHandles';
import { ShapeChoices } from './ui/shapeChoices';
import { buildGarment, garmentIdFrom, attachmentAnchors, attachmentSize, garmentDisplayAngle } from './fold/garments';
import { buildPin } from './fold/pin';
import { ACCESSORIES, accessoryAnchors, findAccessory } from './fold/accessories';
import { StudioControls, GarmentId, PinPosition, AccessoryId } from './ui/studioControls';
import { buildTimeline, evaluateFrame, Mat34, OpAnim, LAYER_GAP, posePoint } from './fold/timeline';
import { FoldController } from './app/controller';
import { ViewSwitch } from './app/viewSwitch';
import { DisplayCamera } from './app/displayCamera';
import { PAPERS, findPaper } from './papers';
import { rotationCheckPaper } from './papers/rotationCheck';
import { makePaperTextures, PaperTextures } from './render/textures';
import { SheetView } from './render/sheetView';
import { LapelEdges } from './render/lapelEdges';
import { FoldGuides } from './render/guides';
import { Stage } from './render/stage';
import { makeStand, SLOT_DEPTH, STAND_HEIGHT } from './render/stand';
import { WorkshopPanel } from './ui/workshopPanel';
import { DisplayPanel } from './ui/displayPanel';
import { PaperPicker } from './ui/paperPicker';

const params = new URLSearchParams(location.search);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let ready = false;
const designProgress = new Map<GarmentId, number>();
function syncUrl() {
  if (!ready || accessoryMode) return;
  const url = new URL(location.href);
  optionsToParams(garmentOptions, url.searchParams);
  url.searchParams.set('design', garmentId);
  url.searchParams.set('paper', garmentPaper.id);
  url.searchParams.set('turn', String(garmentTurns));
  url.searchParams.set('step', String(controller.step));
  url.searchParams.set('view', view.target === 1 ? 'display' : 'workshop');
  if (url.href !== location.href) history.replaceState(history.state, '', url);
}

// ---- folding data (pure, precomputed once)
let garmentId: GarmentId = garmentIdFrom(params.get('design'));
let garmentOptions = optionsFromParams(params);
let accessoryId: AccessoryId = 'pin';
let bowWing = 0;
let savedPinStep = 0;
let accessoryMode = false;
let editingCentre = false;
let centreAttached = false;
let savedCentreStep = 0;
let attached = false;
let pinPosition: PinPosition = 'neckline';
let construction = buildGarment(garmentId, garmentOptions);
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
      if (!accessoryMode) v.applyAxisAngle(new THREE.Vector3(0, 0, 1), garmentDisplayAngle(garmentId));
      lo.min(v);
      hi.max(v);
    }
  }
  return { lo, hi };
}
let finished = measureFinished();
const garmentAnchors = () => attachmentAnchors(garmentId, finished.hi.y, finished.lo.y, garmentOptions);
/** Positions the current accessory may use on this garment (may be empty). */
const placementAnchors = () => accessoryAnchors(accessoryId, garmentAnchors());
function settlePosition() {
  const anchors = placementAnchors();
  if (anchors.length && !anchors.some(a => a.id === pinPosition)) pinPosition = anchors[0].id;
}
settlePosition();

// ---- scene
const app = document.getElementById('app')!;
const canvas = document.getElementById('stage') as HTMLCanvasElement;
const stage = new Stage(canvas);

const frontMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
const backMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
const sheet = new SheetView(frontMat, backMat);
const guides = new FoldGuides();
const lapelEdges = new LapelEdges();
stage.modelRoot.add(lapelEdges.lines);
stage.modelRoot.add(sheet.group, guides.group);
const pinFront = new THREE.MeshStandardMaterial({ roughness: 0.9 });
const pinBack = new THREE.MeshStandardMaterial({ roughness: 0.9 });
const pinSheet = new SheetView(pinFront, pinBack);
let pinTimeline = buildTimeline(buildPin().ops);
let pinFinal = pinTimeline.ops[pinTimeline.ops.length - 1];
const secondWing = new SheetView(pinFront, pinBack);
const centreFront = new THREE.MeshStandardMaterial({ roughness: .9 });
const centreBack = new THREE.MeshStandardMaterial({ roughness: .9 });
const centreSheet = new SheetView(centreFront, centreBack);
const centreTimeline = buildTimeline(buildBowCentre().ops);
const centreFinal = centreTimeline.ops[centreTimeline.ops.length - 1];
centreSheet.setAnim(centreFinal); centreSheet.pose(evaluateFrame(centreFinal, 1));
centreSheet.group.scale.setScalar(.85); centreSheet.group.position.set(0, 0, .08);
const accessoryRoot = new THREE.Group();
accessoryRoot.add(pinSheet.group, secondWing.group, centreSheet.group);
accessoryRoot.visible = false;
stage.modelRoot.add(accessoryRoot);
let seamGeometry = new THREE.BufferGeometry();
const seamMaterial = new THREE.LineBasicMaterial({ color: '#302b26', transparent: true, opacity: 0.3 });
const attachedSeams = new THREE.LineSegments(seamGeometry, seamMaterial);
const secondSeams = new THREE.LineSegments(seamGeometry, seamMaterial);
pinSheet.group.add(attachedSeams);
secondWing.group.add(secondSeams);
const studySeams = new THREE.LineSegments(seamGeometry, seamMaterial);
studySeams.visible = false;
stage.modelRoot.add(studySeams);
function accessorySeams(final: OpAnim) {
  const pose = evaluateFrame(final, 1), points: number[] = [];
  for (const piece of final.pieces) {
    if (pose[piece.index * 12 + 10] < 0) continue;
    for (let i = 0; i < piece.poly.length; i++) for (const m of [piece.poly[i], piece.poly[(i + 1) % piece.poly.length]]) {
      const p = posePoint(pose, piece.index * 12, m.x, m.y);
      points.push(p[0], p[1], p[2] + .0008);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  return geometry;
}
const centreSeamGeometry = accessorySeams(centreFinal);
centreSheet.group.add(new THREE.LineSegments(centreSeamGeometry, seamMaterial));
function prepareAccessory() {
  pinTimeline = buildTimeline(findAccessory(accessoryId).build().ops);
  pinFinal = pinTimeline.ops[pinTimeline.ops.length - 1];
  const pinPose = evaluateFrame(pinFinal, 1);
  const seamPoints: number[] = [];
  for (const p of pinFinal.pieces) {
    if (pinPose[p.index * 12 + 10] < 0) continue;
    for (let i = 0; i < p.poly.length; i++) for (const m of [p.poly[i], p.poly[(i + 1) % p.poly.length]]) {
      const point = posePoint(pinPose, p.index * 12, m.x, m.y);
      seamPoints.push(point[0], point[1], point[2] + 0.0008);
    }
  }
  seamGeometry.dispose();
  seamGeometry = new THREE.BufferGeometry();
  seamGeometry.setAttribute('position', new THREE.Float32BufferAttribute(seamPoints, 3));
  attachedSeams.geometry = secondSeams.geometry = studySeams.geometry = seamGeometry;
  for (const wing of [pinSheet, secondWing]) { wing.setAnim(pinFinal); wing.pose(pinPose); }
  const bow = accessoryId === 'bow';
  accessoryRoot.scale.setScalar(findAccessory(accessoryId).pieces[0].scale);
  secondWing.group.visible = bow;
  // Placement comes from the accessory registry (the bow's first wing is
  // -π/4 at -1.27; the tulip is turned -3π/4 to stand upright; the others are unrotated).
  const first = findAccessory(accessoryId).pieces[0];
  pinSheet.group.rotation.z = first.angle;
  pinSheet.group.position.set(first.offset, first.lift ?? 0, 0);
  secondWing.group.rotation.z = 3 * Math.PI / 4;
  secondWing.group.position.set(1.27, 0, 0.012);
}
prepareAccessory();
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
let centrePaper = findPaper('ink-reverse');
let centreTurns = 0;
let centreTextures: PaperTextures | null = null;
function applyCentrePaper() {
  centreTextures?.dispose();
  centreTextures = makePaperTextures(centrePaper, centreTurns, stage.renderer.capabilities.getMaxAnisotropy());
  centreFront.map = centreTextures.front; centreBack.map = centreTextures.back;
  centreFront.needsUpdate = centreBack.needsUpdate = true;
}
function applyPinPaper() {
  pinTextures?.dispose();
  pinTextures = makePaperTextures(pinPaper, pinTurns, stage.renderer.capabilities.getMaxAnisotropy());
  pinFront.map = pinTextures.front; pinBack.map = pinTextures.back;
  pinFront.needsUpdate = pinBack.needsUpdate = true;
}
function applyPaper() {
  if (accessoryMode && editingCentre) { centrePaper = paper; centreTurns = quarterTurns; applyCentrePaper(); }
  else if (accessoryMode) { pinPaper = paper; pinTurns = quarterTurns; applyPinPaper(); }
  else { garmentPaper = paper; garmentTurns = quarterTurns; }
  textures?.dispose();
  textures = makePaperTextures(paper, quarterTurns, stage.renderer.capabilities.getMaxAnisotropy());
  frontMat.map = textures.front;
  backMat.map = textures.back;
  frontMat.needsUpdate = backMat.needsUpdate = true;
  document.documentElement.style.setProperty('--accent', paper.reverse);
  picker?.render(paper, quarterTurns);
  refreshDisplayPanel();
  syncUrl();
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
  onReset: () => { cancelDrag(); controller.reset(); },
});

const displayPanel = new DisplayPanel(app, {
  onView: (v) => displayCam.show(v),
  onTurntable: () => displayCam.setTurntable(!displayCam.turntable),
  onReset: () => displayCam.resetView(),
  onReturn: () => leaveDisplay(),
});

const shapeChoices = new ShapeChoices(workshopPanel.dock, chooseFoldOption);
function refreshWorkshopPanel() {
  const decisions = garmentDecisions(garmentId);
  const revisit = controller.moving ? [] : decisions.filter(d => decisionStep(construction, d) >= 0 && controller.step > decisionStep(construction, d));
  const available = ACCESSORIES.filter(a => accessoryAnchors(a.id, garmentAnchors()).length > 0).map(a => a.id);
  studio.render(garmentId, accessoryMode, controller.finished, attached, pinPosition, accessoryId, bowWing, revisit, placementAnchors(), available);
  const bowReady = accessoryId === 'bow' && bowWing === 1 && savedPinStep === pinTimeline.ops.length;
  studio.renderCentre(!accessoryMode && controller.finished && bowReady && available.includes('bow'), savedCentreStep === centreTimeline.ops.length, centreAttached, editingCentre);
  const decision = !accessoryMode && !controller.moving ? decisions.find(d => decisionStep(construction, d) === controller.step) : undefined;
  shapeChoices.render(decision, garmentOptions, value => buildGarment(garmentId, selectOption(garmentOptions, decision!, value)));
  const a = controller.activeOp;
  const op = a === null ? null : ops[a].op;
  workshopPanel.render({
    total: ops.length,
    done: controller.step,
    active: a,
    title: op ? op.title : `${construction.name} is folded`,
    hint: op ? op.hint : accessoryMode ? editingCentre ? 'Both wings are kept. Add this separate folded centre to make a three-piece bow.' : accessoryId === 'bow' && bowWing === 0 ? 'One wing is ready. Fold a second square in the same paper to complete the bow.' : 'Place the folded accessory on your garment, or return without adding it. Placement is a styling step.' : available.length ? 'Put it on display, or fold an optional paper accessory.' : 'Put it on display to inspect the front, back and edges.',
    foldLabel: controller.finished ? accessoryMode ? editingCentre ? 'Attach centre' : accessoryId === 'bow' && bowWing === 0 ? 'Second wing' : 'Attach' : 'Display' : op?.kind === 'turn' ? 'Turn over' : 'Fold',
    canBack: controller.step > 0 || controller.moving,
    canFold: true,
    moving: controller.moving,
  });
  syncUrl();
}
function refreshDisplayPanel() {
  displayPanel.render(`${construction.name} · ${paper.name}`, displayCam.turntable);
}
const studio = new StudioControls(app, {
  onDesign: changeGarment,
  onEdit: editPin,
  onRevisit: revisitFold,
  onRemove: () => { attached = false; refreshWorkshopPanel(); layout(); },
  onReturn: returnToGarment,
  onPosition: (p) => { pinPosition = p; refreshWorkshopPanel(); },
  onCentre: editCentre,
  onCentreToggle: () => { centreAttached = !centreAttached; refreshWorkshopPanel(); layout(); },
});
let unsubscribeController = controller.onChange(refreshWorkshopPanel);
displayCam.onChange(refreshDisplayPanel);
refreshWorkshopPanel();
applyPaper();
applyPinPaper();
applyCentrePaper();

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
  QUAT_DISPLAY.setFromAxisAngle(new THREE.Vector3(0, 0, 1), accessoryMode ? 0 : garmentDisplayAngle(garmentId));
  POS_DISPLAY.set(0, STAND_HEIGHT - SLOT_DEPTH - finished.lo.y, -(finished.lo.z + finished.hi.z) / 2);
  const pieceTop = POS_DISPLAY.y + finished.hi.y;
  displayCam.setSubject(new THREE.Vector3(0, pieceTop / 2, 0), Math.max(-finished.lo.x, finished.hi.x) + 0.12, pieceTop / 2 + 0.1);
}
frameSubject();
let savedGarment: { construction: typeof construction; timeline: typeof timeline; controller: FoldController } | null = null;
function replaceConstruction(next: typeof construction, nextTimeline = buildTimeline(next.ops), nextController?: FoldController) {
  cancelDrag();
  unsubscribeController();
  construction = next; timeline = nextTimeline; ops = timeline.ops; lastOp = ops[ops.length - 1];
  controller = nextController ?? new FoldController(ops.length, i => (ops[i].op.kind === 'turn' ? 1.5 : 1.15) * (reducedMotion ? 0.6 : 1));
  unsubscribeController = controller.onChange(refreshWorkshopPanel);
  frame = undefined;
  finished = measureFinished(); frameSubject();
  if (!accessoryMode) {
    settlePosition();
  }
  displayCam.setEnabled(false); displayCam.setTurntable(false);
  view.jump('workshop');
  refreshWorkshopPanel(); applyPaper(); layout();
}
function changeGarment(id: GarmentId) {
  if (accessoryMode || id === garmentId) return;
  designProgress.set(garmentId, controller.step);
  garmentId = id;
  replaceConstruction(buildGarment(id, garmentOptions));
  controller.jumpTo(designProgress.get(id) ?? 0);
}
function chooseFoldOption(id: DecisionId, value: string) {
  const decision = garmentDecisions(garmentId).find(d => d.id === id);
  if (!decision || accessoryMode || controller.moving || controller.step !== decisionStep(construction, decision) || value === garmentOptions[id]) return;
  const options = selectOption(garmentOptions, decision, value);
  if (options === garmentOptions) return;
  const next = buildGarment(garmentId, options);
  const retain = Math.min(controller.step, sharedFoldPrefix(construction, next));
  const refocus = shapeChoices.root.contains(document.activeElement);
  garmentOptions = options;
  replaceConstruction(next);
  controller.jumpTo(retain);
  if (refocus) shapeChoices.focusChoice(value);
  layout();
}
function revisitFold(id: DecisionId) {
  const decision = garmentDecisions(garmentId).find(d => d.id === id);
  if (accessoryMode || controller.moving || !decision) return;
  const step = decisionStep(construction, decision);
  if (step < 0 || controller.step <= step) return;
  cancelDrag();
  view.jump('workshop'); displayCam.setEnabled(false); displayCam.setTurntable(false);
  controller.jumpTo(step); layout();
}
function editPin(id: AccessoryId) {
  if (accessoryMode || !controller.finished || !accessoryAnchors(id, garmentAnchors()).length) return;
  savedGarment = { construction, timeline, controller };
  if (id !== accessoryId) { accessoryId = id; savedPinStep = 0; bowWing = 0; attached = false; centreAttached = false; prepareAccessory(); settlePosition(); }
  studySeams.geometry = seamGeometry;
  accessoryMode = true; paper = pinPaper; quarterTurns = pinTurns;
  replaceConstruction(findAccessory(accessoryId).build(), pinTimeline);
  controller.jumpTo(savedPinStep);
}
function editCentre() {
  if (accessoryMode || !controller.finished || accessoryId !== 'bow' || bowWing !== 1 || savedPinStep !== pinTimeline.ops.length) return;
  savedGarment = { construction, timeline, controller };
  editingCentre = true; accessoryMode = true; paper = centrePaper; quarterTurns = centreTurns;
  studySeams.geometry = centreSeamGeometry;
  replaceConstruction(buildBowCentre(), centreTimeline);
  controller.jumpTo(savedCentreStep);
}
function returnToGarment() {
  if (!accessoryMode || !savedGarment) return;
  if (editingCentre) {
    savedCentreStep = controller.step;
    if (!controller.finished) centreAttached = false;
  } else {
    savedPinStep = controller.step;
    if (!controller.finished) attached = false;
  }
  const saved = savedGarment; savedGarment = null;
  accessoryMode = false; editingCentre = false; paper = garmentPaper; quarterTurns = garmentTurns;
  replaceConstruction(saved.construction, saved.timeline, saved.controller);
  enterDisplay();
}
function finishPin() {
  if (!accessoryMode || !controller.finished) return;
  if (editingCentre) { centreAttached = true; attached = true; returnToGarment(); return; }
  if (accessoryId === 'bow' && bowWing === 0) {
    bowWing = 1; savedPinStep = 0; controller.reset(); refreshWorkshopPanel(); layout(); return;
  }
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
  // Arriving in Display: land exactly on the transition's endpoint. placePiece()
  // only moves the camera while the view is between modes, so without this the
  // camera kept the last in-between frame's pose (frame-rate dependent).
  if (view.inDisplay) { stage.placeCamera(displayCamPos, displayCam.target); displayCam.setEnabled(true); }
  layout();
  syncUrl();
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
  if (lastDisplayFit > 0 && Math.abs(fit - lastDisplayFit) > 1e-6) {
    const ratio = fit / lastDisplayFit;
    if (view.inDisplay) displayCam.reframe(ratio);
    // Not settled in Display (e.g. mid-transition, when the panels swap and
    // resize): keep the pending Display endpoint at the same relative zoom.
    else displayCamPos.sub(displayCam.target).multiplyScalar(ratio).add(displayCam.target);
  }
  lastDisplayFit = fit;
  if (view.inWorkshop) stage.placeCamera(workCamPos, WORK_TARGET);
}
new ResizeObserver(layout).observe(app);
new ResizeObserver(layout).observe(studio.root);
new ResizeObserver(layout).observe(workshopPanel.dock);
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

const foldHandles = new FoldHandles(app, (event, piece) => startDrag(event, piece, true), () => controller.next());

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
  // An accessory whose positions this garment lacks (a neckerchief on a
  // skirt) stays folded and stored, but is not shown until it fits again.
  const anchors = placementAnchors();
  const anchor = anchors.find(a => a.id === pinPosition) ?? anchors[0];
  accessoryRoot.visible = attached && !accessoryMode && controller.finished && !!anchor;
  centreSheet.group.visible = accessoryId === 'bow' && centreAttached;
  accessoryRoot.scale.setScalar(findAccessory(accessoryId).pieces[0].scale * attachmentSize(garmentId));
  if (anchor) accessoryRoot.position.set(anchor.x, anchor.y, finished.hi.z + 0.014);
  const pose = controller.pose();
  const anim = ops[pose.op];
  sheet.setAnim(anim);
  const workshop = view.inWorkshop;
  const t = pose.pending && workshop ? tForAngle(anim.op.kind === 'turn' ? PEEK_TURN : PEEK_FOLD) : pose.t;
  frame = evaluateFrame(anim, t, frame);
  sheet.pose(frame);
  const lapels = new Set(timeline.states[pose.op + 1].facets.filter(f => f.tags.some(t => t.startsWith('vest-lapel-'))).map(f => f.id));
  lapelEdges.update(anim, frame, lapels, garmentId === 'vest' && !accessoryMode && lapels.size > 0);
  const preview = workshop && (pose.pending || controller.isScrubbing);
  sheet.setTint(preview && anim.op.kind === 'fold' ? movingPieces(anim) : new Set(), 0.55);
  if (preview) guides.show(anim, anim.maxPreZ + LAYER_GAP);
  else guides.hide();
  updateFoldHandles(anim, frame, preview);
  stage.render();
}

// ---- drag to fold: grab paper that the pending fold moves, pull it toward the arrow
const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
let drag: { id: number; x0: number; y0: number; vx: number; vy: number; target: HTMLElement; handle: boolean; travel: number } | null = null;
function cancelDrag() {
  if (drag?.target.hasPointerCapture(drag.id)) drag.target.releasePointerCapture(drag.id);
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

function startDrag(e: PointerEvent, idx: number, handle = false) {
  if (!view.inWorkshop || drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
  const pose = controller.pose();
  if (!pose.pending || idx < 0) return;
  const anim = ops[pose.op];
  if (!anim.pieces[idx] || anim.pieces[idx].spec < 0) return;
  const vector = foldDirection(anim, anim.pieces[idx].spec);
  const target = e.currentTarget as HTMLElement;
  if (!controller.beginScrub()) return;
  drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, ...dragVector(vector.x, vector.y), target, handle, travel: 0 };
  target.setPointerCapture(e.pointerId);
  e.preventDefault();
}
function foldDirection(anim: OpAnim, spec: number): THREE.Vector2 {
  const ar = anim.op.kind === 'turn' ? { from: { x: 0.8, y: 0 }, to: { x: -0.8, y: 0 } } : anim.arrows[spec];
  return toScreen(new THREE.Vector3(ar.to.x, ar.to.y, 0)).sub(toScreen(new THREE.Vector3(ar.from.x, ar.from.y, 0)));
}
function updateFoldHandles(anim: OpAnim, M: Mat34, preview: boolean) {
  const targets: FoldTarget[] = [];
  if (preview && anim.op.kind === 'fold') {
    for (const piece of anim.pieces) {
      if (piece.spec < 0) continue;
      const points = piece.poly.map(p => toScreen(new THREE.Vector3(...posePoint(M, piece.index * 12, p.x, p.y))));
      const w = Math.max(...points.map(p => p.x)) - Math.min(...points.map(p => p.x));
      const h = Math.max(...points.map(p => p.y)) - Math.min(...points.map(p => p.y));
      if (Math.min(w, h) >= 28 && w * h >= 1300) continue;
      const c = centroid(piece.poly);
      const screen = toScreen(new THREE.Vector3(...posePoint(M, piece.index * 12, c.x, c.y)));
      const vector = foldDirection(anim, piece.spec);
      targets.push({ piece: piece.index, x: screen.x, y: screen.y, vx: vector.x, vy: vector.y });
    }
  }
  foldHandles.render(targets, controller.isScrubbing);
}
canvas.addEventListener('pointerdown', e => startDrag(e, pickMovingPiece(e)));

window.addEventListener('pointermove', (e) => {
  if (drag && e.pointerId === drag.id) {
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;
    drag.travel = Math.max(drag.travel, Math.hypot(dx, dy));
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
  const tap = drag.handle && drag.travel < 6;
  cancelDrag();
  controller.endScrub(!cancelled && (tap || t > 0.35));
}
window.addEventListener('pointerup', (e) => endDrag(e, false));
window.addEventListener('pointercancel', (e) => endDrag(e, true));

// ---- start-up state from the URL (?step=6&view=display&paper=grid&turn=1)
const startStep = Number(params.get('step'));
if (startStep > 0) controller.jumpTo(startStep);
if (params.get('view') === 'display' && controller.finished) {
  // Switch first: the jump re-runs layout() with the display panel's insets, so
  // the front view is seeded from the final framing (the same distance Reset
  // view uses), not from the workshop dock measured before the step jump.
  view.jump('display');
  displayCamPos.copy(displayCam.positionFor('front'));
  stage.placeCamera(displayCamPos, displayCam.target);
  displayCam.setEnabled(true);
}
ready = true;
syncUrl();

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
    get silhouetteId() { return garmentOptions.silhouette; },
    get options() { return { ...garmentOptions }; },
    get decisions() { return garmentDecisions(garmentId); },
    get accessoryId() { return accessoryId; },
    get bowWing() { return bowWing; },
    get pinPosition() { return pinPosition; },
    accessoryRoot,
    get garmentId() { return garmentId; },
    get accessoryMode() { return accessoryMode; },
    get editingCentre() { return editingCentre; },
    get centreAttached() { return centreAttached; },
    get centreComplete() { return savedCentreStep === centreTimeline.ops.length; },
    get accessoryPaperId() { return pinPaper.id; },
    get accessoryQuarterTurns() { return pinTurns; },
    get centrePaperId() { return centrePaper.id; },
    get centreQuarterTurns() { return centreTurns; },
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
