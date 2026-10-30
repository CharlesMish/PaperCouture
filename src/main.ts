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
import { buildTimeline, evaluateFrame, frameLift, Mat34, OpAnim, LAYER_GAP, posePoint } from './fold/timeline';
import { FoldController } from './app/controller';
import { ViewSwitch } from './app/viewSwitch';
import { DisplayCamera } from './app/displayCamera';
import { PAPERS, findPaper } from './papers';
import { rotationCheckPaper } from './papers/rotationCheck';
import { makePaperTextures, PaperTextures } from './render/textures';
import { SheetView } from './render/sheetView';
import { LapelEdges } from './render/lapelEdges';
import { FoldGuides } from './render/guides';
import { HiddenPaperOverlay } from './render/hiddenPaper';
import { blendFrames, stepFrame, type WorkFrame } from './app/workFrame';
import { HIDDEN_FOLD, movingVisibility, type Visibility } from './fold/visibility';
import { Stage } from './render/stage';
import { makeStand, SLOT_DEPTH, STAND_HEIGHT } from './render/stand';
import { WorkshopPanel } from './ui/workshopPanel';
import { showStartupFailure, watchContextLoss } from './ui/startupFailure';
import { DisplayPanel } from './ui/displayPanel';
import { PaperPicker } from './ui/paperPicker';
import { PrintPositionPanel } from './ui/printPositionPanel';
import { BoardSource, Pinboard } from './ui/pinboard';
import { recommendedSquareCm, REFERENCE_SQUARE_CM } from './fold/paperSize';
import { formatHint, measuresIn } from './fold/measure';
import { normalizePosition, ORIGINAL, positionFromParams, positionToParams } from './papers/printPosition';

// A visit with no address state returns to where this device left off (the piece,
// its paper and step, and how far each design got); the board is saved separately.
const WORKSHOP_KEY = 'paper-couture.workshop.v1';
type SavedWorkshop = { search: string; progress: [string, { done: number; total: number }][] };
const savedWorkshop = ((): SavedWorkshop | null => {
  try {
    const saved = JSON.parse(localStorage.getItem(WORKSHOP_KEY) ?? 'null');
    return saved && typeof saved.search === 'string' && Array.isArray(saved.progress) ? saved : null;
  } catch { return null; }
})();
const params = new URLSearchParams(location.search || savedWorkshop?.search || '');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let ready = false;
/** The step whose moving paper is highlighted; stays set through Back and Fold, so a step can be replayed. */
let inspectingOp: number | null = null;
let lastInspect: 'off' | 'offered' | 'showing' = 'off';
let visibilityCache: { anim: OpAnim; eye: string; v: Visibility } | null = null;
/** Steps done in each design this visit (and saved on the device). */
const designProgress = new Map<GarmentId, { done: number; total: number }>(
  (savedWorkshop?.progress ?? []).filter(([id, p]) => garmentIdFrom(id) === id && Number.isFinite(p?.done) && Number.isFinite(p?.total))
    .map(([id, p]) => [id as GarmentId, { done: p.done, total: p.total }]));
/** Start over was just pressed from this step: it can be undone until the next fold. */
let undoStart: number | null = null;
/**
 * The board item last pinned from this finished piece, and what it captured: the
 * shortcut says "Pinned" only while that item is still on the board (Undo or Remove
 * take it off) and the piece has not changed since.
 */
let pinned: { id: string; recipe: string } | null = null;
let lastSaved = '';
function saveWorkshop() {
  const record = JSON.stringify({ search: location.search, progress: [...designProgress] } satisfies SavedWorkshop);
  if (record === lastSaved) return;
  try { localStorage.setItem(WORKSHOP_KEY, record); lastSaved = record; }
  catch { /* storage unavailable: the address still holds the piece */ }
}
function syncUrl() {
  if (!ready || accessoryMode) return;
  const url = new URL(location.href);
  optionsToParams(garmentOptions, url.searchParams);
  url.searchParams.set('design', garmentId);
  url.searchParams.set('paper', garmentPaper.id);
  url.searchParams.set('turn', String(garmentTurns));
  positionToParams(garmentPosition, url.searchParams);
  url.searchParams.set('step', String(controller.step));
  url.searchParams.set('view', view.target === 1 ? 'display' : 'workshop');
  if (url.href !== location.href) history.replaceState(history.state, '', url);
  saveWorkshop();
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
function startStage(): Stage {
  try {
    return new Stage(canvas);
  } catch (error) {
    // No WebGL: say so, offer to retry, show the finished pieces flat; stop here.
    showStartupFailure(app, error);
    throw error;
  }
}
const stage = startStage();
// The address holds only the main piece (syncUrl skips accessory mode), so say
// exactly what a reload keeps.
watchContextLoss(app, canvas, () => {
  const full = savedGarment?.construction.name ?? construction.name;
  const name = full.charAt(0).toLowerCase() + full.slice(1);
  if (accessoryMode) return `Reloading keeps the ${name} and its step, but not the accessory you are folding: that starts again.`;
  if (attached) return `Reloading keeps the ${name} and its step, but not the attached accessory: it would need folding again.`;
  return `Reloading keeps the ${name}, its paper and its step.`;
});

const frontMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
const backMat = new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0 });
const sheet = new SheetView(frontMat, backMat);
const guides = new FoldGuides();
const lapelEdges = new LapelEdges();
stage.modelRoot.add(lapelEdges.lines);
const hiddenPaper = new HiddenPaperOverlay();
stage.modelRoot.add(sheet.group, guides.group, hiddenPaper.group);
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
const requestedTurn = Number(params.get('turn'));
let quarterTurns = Number.isFinite(requestedTurn) ? ((Math.trunc(requestedTurn) % 4) + 4) % 4 : 0;
let printPosition = positionFromParams(paper, params);
let textures: PaperTextures | null = null;
let garmentPaper = paper;
let garmentTurns = quarterTurns;
let garmentPosition = { ...printPosition };
let pinPaper = findPaper('tidal-bands');
let pinTurns = 0;
let pinPrintPosition = { ...ORIGINAL };
let pinTextures: PaperTextures | null = null;
let centrePaper = findPaper('ink-reverse');
let centreTurns = 0;
let centrePrintPosition = { ...ORIGINAL };
let centreTextures: PaperTextures | null = null;
function applyCentrePaper() {
  centreTextures?.dispose();
  centreTextures = makePaperTextures(centrePaper, centreTurns, stage.renderer.capabilities.getMaxAnisotropy(), centrePrintPosition);
  centreFront.map = centreTextures.front; centreBack.map = centreTextures.back;
  centreFront.needsUpdate = centreBack.needsUpdate = true;
}
function applyPinPaper() {
  pinTextures?.dispose();
  pinTextures = makePaperTextures(pinPaper, pinTurns, stage.renderer.capabilities.getMaxAnisotropy(), pinPrintPosition);
  pinFront.map = pinTextures.front; pinBack.map = pinTextures.back;
  pinFront.needsUpdate = pinBack.needsUpdate = true;
}
function applyPaper() {
  printPosition = normalizePosition(paper, printPosition);
  if (accessoryMode && editingCentre) { centrePaper = paper; centreTurns = quarterTurns; centrePrintPosition = { ...printPosition }; applyCentrePaper(); }
  else if (accessoryMode) { pinPaper = paper; pinTurns = quarterTurns; pinPrintPosition = { ...printPosition }; applyPinPaper(); }
  else { garmentPaper = paper; garmentTurns = quarterTurns; garmentPosition = { ...printPosition }; }
  textures?.dispose();
  textures = makePaperTextures(paper, quarterTurns, stage.renderer.capabilities.getMaxAnisotropy(), printPosition);
  frontMat.map = textures.front;
  backMat.map = textures.back;
  frontMat.needsUpdate = backMat.needsUpdate = true;
  document.documentElement.style.setProperty('--accent', paper.reverse);
  picker?.render(paper, quarterTurns, !!(printPosition.x || printPosition.y));
  positionPanel.render(paper, quarterTurns, printPosition, textures.front.image);
  refreshDisplayPanel();
  syncUrl();
}

// ---- state
let controller = new FoldController(ops.length, (i) => {
  const kind = ops[i].op.kind;
  const base = kind === 'turn' ? 1.5 : kind === 'collapse' ? 2.6 : 1.15;
  return reducedMotion ? base * 0.6 : base;
});
const view = new ViewSwitch(reducedMotion ? 0.6 : 1.1);
const displayCam = new DisplayCamera(stage, canvas);

// ---- interface
const positionPanel = new PrintPositionPanel(app, p => {
  printPosition = normalizePosition(paper, p); applyPaper();
});
const pinboard = new Pinboard(app, {
  workshop: () => { if (!view.inWorkshop) leaveDisplay(); },
  // the finished piece itself (source 0 in the workshop) was pinned, by the shortcut or on the board
  pinned: (id, source) => { if (source === 0 && !accessoryMode) pinned = { id, recipe: pinRecipe() }; },
  sources: () => {
    if (!controller.finished || controller.moving) return [];
    draw();
    const accessory = findAccessory(accessoryId);
    const accessorySquares = accessory.pieces.map(p => REFERENCE_SQUARE_CM * p.scale * attachmentSize(garmentId));
    if (accessoryId === 'bow' && centreAttached) accessorySquares.push(accessorySquares[0] * .85);
    if (accessoryMode) {
      // A completed single-square accessory (or the separate centre) can stand alone.
      // A two-wing bow is offered as an assembly after Attach returns to the garment.
      if (accessoryId === 'bow' && !editingCentre) return [];
      const suggested = accessorySquares[0] * (editingCentre ? .85 : 1) * recommendedSquareCm(garmentId) / REFERENCE_SQUARE_CM;
      return [{ title: `${construction.name} · ${paper.name}`, objects: [sheet.group, studySeams], angle: editingCentre ? 0 : accessory.pieces[0].angle,
        paperSize: { key: `accessory:${accessoryId}:${editingCentre ? 'centre' : garmentId}`, referenceCm: REFERENCE_SQUARE_CM, recommendedCm: Math.round(suggested * 100) / 100 } }];
    }
    const sources: BoardSource[] = [{ title: `${construction.name} · ${garmentPaper.name}`, objects: [sheet.group, lapelEdges.lines, accessoryRoot], angle: garmentDisplayAngle(garmentId),
      paperSize: { key: `garment:${garmentId}`, referenceCm: REFERENCE_SQUARE_CM, recommendedCm: recommendedSquareCm(garmentId),
        ...(accessoryRoot.visible ? { companionCm: accessorySquares } : {}) } }];
    if (accessoryRoot.visible) sources.push({ title: `${accessory.name} only · ${pinPaper.name}`, objects: [accessoryRoot], angle: 0,
      paperSize: { key: `attached:${accessoryId}:${garmentId}`, referenceCm: accessorySquares[0],
        recommendedCm: Math.round(accessorySquares[0] * recommendedSquareCm(garmentId) / REFERENCE_SQUARE_CM * 100) / 100,
        companionCm: accessorySquares.slice(1) } });
    return sources;
  },
});
const picker = new PaperPicker(app, PAPERS, {
  onSelect: (id) => {
    if (id !== paper.id) printPosition = { ...ORIGINAL };
    paper = findPaper(id);
    applyPaper();
  },
  onRotate: () => {
    quarterTurns = (quarterTurns + 1) % 4;
    applyPaper();
  },
  onPosition: () => {
    cancelDrag();
    releaseScrub(false);
    positionPanel.open();
  },
});

const workshopPanel = new WorkshopPanel(app, {
  onBack: () => { scrubRelease = null; controller.prev(); },
  onFold: () => { scrubRelease = null; controller.finished ? accessoryMode ? finishPin() : enterDisplay() : controller.next(); },
  onReset: () => {
    cancelDrag();
    const from = controller.step;
    controller.reset();
    // remembered after the reset, which itself clears a pending undo
    if (from > 0) { undoStart = from; refreshWorkshopPanel(); }
  },
  onUndoReset: () => {
    if (undoStart === null || controller.step !== 0) return;
    const step = undoStart; undoStart = null;
    controller.jumpTo(step); layout();
  },
  onPin: () => pinFinishedPiece(),
  onHintOpen: () => studio.setNotesOpen(false),
  onInspect: () => {
    const a = controller.activeOp;
    inspectingOp = a !== null && inspectingOp !== a ? a : null;
    refreshWorkshopPanel();
  },
});

const displayPanel = new DisplayPanel(app, {
  onView: (v) => displayCam.show(v),
  onTurntable: () => displayCam.setTurntable(!displayCam.turntable),
  onReset: () => displayCam.resetView(),
  onReturn: () => leaveDisplay(),
  onPinboard: () => {
    if (!controller.finished || accessoryMode || !view.inDisplay) return;
    pinboard.open();
  },
});

const shapeChoices = new ShapeChoices(workshopPanel.dock, chooseFoldOption);
function refreshWorkshopPanel() {
  const decisions = garmentDecisions(garmentId);
  if (!accessoryMode) designProgress.set(garmentId, { done: controller.step, total: ops.length });
  studio.setProgress(designProgress);
  // Start over can be undone until the paper moves again
  if (undoStart !== null && (controller.step !== 0 || controller.moving || controller.isScrubbing)) undoStart = null;
  // Revisit stays in place while a fold moves (disabled, and revisitFold() refuses):
  // hiding it changed the controls' height and so the framing, mid-fold.
  const revisit = decisions.filter(d => decisionStep(construction, d) >= 0 && controller.step > decisionStep(construction, d));
  const available = ACCESSORIES.filter(a => accessoryAnchors(a.id, garmentAnchors()).length > 0).map(a => a.id);
  studio.render(garmentId, accessoryMode, controller.finished, attached, pinPosition, accessoryId, bowWing, revisit, placementAnchors(), available, controller.moving);
  const bowReady = accessoryId === 'bow' && bowWing === 1 && savedPinStep === pinTimeline.ops.length;
  studio.renderCentre(!accessoryMode && controller.finished && bowReady && available.includes('bow'), savedCentreStep === centreTimeline.ops.length, centreAttached, editingCentre);
  const decision = !accessoryMode && !controller.moving ? decisions.find(d => decisionStep(construction, d) === controller.step) : undefined;
  shapeChoices.render(decision, garmentOptions, value => buildGarment(garmentId, selectOption(garmentOptions, decision!, value)));
  const a = controller.activeOp;
  const op = a === null ? null : ops[a].op;
  const squareCm = suggestedSquareCm();
  workshopPanel.render({
    total: ops.length,
    done: controller.step,
    active: a,
    title: op ? op.title : `${construction.name} is folded`,
    squareCm: op && measuresIn(op.hint).length ? squareCm : undefined,
    hint: op ? formatHint(op.hint, squareCm) : accessoryMode ? editingCentre ? 'Both wings are kept. Add this separate folded centre to make a three-piece bow.' : accessoryId === 'bow' && bowWing === 0 ? 'One wing is ready. Fold a second square in the same paper to complete the bow.' : 'Place the folded accessory on your garment, or return without adding it. Placement is a styling step.' : available.length ? 'Put it on display, pin it to your pinboard, or fold an optional paper accessory.' : 'Put it on display to see the front, back and edges, or pin it to your pinboard.',
    foldLabel: controller.finished ? accessoryMode ? editingCentre ? 'Attach centre' : accessoryId === 'bow' && bowWing === 0 ? 'Second wing' : 'Attach' : 'Display' : op?.kind === 'turn' ? 'Turn over' : 'Fold',
    canBack: controller.step > 0 || controller.moving,
    canFold: true,
    moving: controller.moving,
    inspect: (lastInspect = inspectState()),
    undoReset: undoStart !== null,
    pin: !accessoryMode && controller.finished && !controller.moving ? isPinned() ? 'pinned' : 'offer' : 'off',
  });
  // lay out now, not a frame later: the dock's new text can change its height, and
  // the framing must follow in the same frame
  if (ready) layout();
  syncUrl();
}
/** The square the piece being folded is suggested for, in cm (what its instructions measure on). */
function suggestedSquareCm(): number {
  if (!accessoryMode) return recommendedSquareCm(garmentId);
  const side = REFERENCE_SQUARE_CM * findAccessory(accessoryId).pieces[0].scale * attachmentSize(garmentId) * (editingCentre ? .85 : 1);
  return Math.round(side * recommendedSquareCm(garmentId) / REFERENCE_SQUARE_CM * 100) / 100;
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
  onNotesOpen: () => workshopPanel.setHintOpen(false),
});
studio.root.append(pinboard.launcher);
// Undo or Remove on the board can take the pinned piece off: the shortcut says so on return
pinboard.dialog.addEventListener('close', () => refreshWorkshopPanel());
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
let workTarget = WORK_TARGET.clone();

// The workshop camera frames the paper the current step involves (src/app/workFrame.ts).
// A step's frame covers its whole motion, so the camera holds still while a fold
// waits and while it is dragged, and moves to the next step's frame only in the last
// part of the fold's own motion: it has arrived when the fold has, and Back retraces it.
const frameCache = new WeakMap<OpAnim, WorkFrame>();
const opFrame = (anim: OpAnim) => { let f = frameCache.get(anim); if (!f) frameCache.set(anim, f = stepFrame(anim)); return f; };
/** Where the last drag was let go (the fold then finishes or falls back from there). */
let scrubRelease: { op: number; t: number } | null = null;
/**
 * The camera eases over 0.35 s from where it is toward where it should be:
 * - after a drag is let go to finish the fold (released late, the rest of a fold can
 *   be a few frames long; the ease keeps the camera from jumping however little of
 *   the fold is left);
 * - when the controls around the paper change size (a step's dock is taller or
 *   shorter than the last one's, as when a long instruction waits behind
 *   Instructions), so the framing never jumps with them.
 */
// Timed in animation seconds (the capped frame steps the folds themselves advance by),
// so on a slow machine the ease and the fold keep pace with each other.
let cameraGlide: { fromPos: THREE.Vector3; fromTarget: THREE.Vector3; elapsed: number } | null = null;
const GLIDE_S = 0.35;
const startGlide = () => { cameraGlide = { fromPos: workCamPos.clone(), fromTarget: workTarget.clone(), elapsed: 0 }; };
function workshopFrame(): WorkFrame {
  const pose = controller.pose();
  const a = opFrame(ops[pose.op]);
  // a release only shapes the motion it started: forget it once that motion is over
  // (before anything else, so a waiting step cannot keep it for the next fold or Back)
  if (scrubRelease && !controller.isScrubbing && (scrubRelease.op !== pose.op || !controller.moving)) scrubRelease = null;
  // still while waiting and for the whole of a drag, however far it goes
  if (pose.pending || pose.op + 1 >= ops.length || controller.isScrubbing) return a;
  return blendFrames(a, opFrame(ops[pose.op + 1]), pose.t, scrubRelease ? Math.max(0.6, scrubRelease.t) : 0.6);
}
/** End a drag of the fold, remembering where it was let go for the camera. */
function releaseScrub(commit: boolean) {
  if (!controller.isScrubbing) return;
  const pose = controller.pose();
  scrubRelease = { op: pose.op, t: pose.t };
  // the camera held this step's own frame for the whole drag
  if (commit && pose.op + 1 < ops.length) startGlide();
  controller.endScrub(commit);
}
/** Recompute the workshop camera pose for the current step (and place it when in the workshop). */
function frameWorkshop() {
  const f = workshopFrame();
  workTarget = new THREE.Vector3(f.x, WORK_TARGET.y, -f.y); // model (x, y) on the table, in the world
  workCamPos = stage.framePose(workTarget, f.halfW, f.halfH, WORK_DIR);
  // the ease works on the camera itself, so whatever moves the target meanwhile is eased too
  if (cameraGlide) {
    const e = cameraGlide.elapsed / GLIDE_S;
    if (e >= 1 || controller.isScrubbing || !view.inWorkshop) cameraGlide = null;
    else {
      const k = e * e * (3 - 2 * e);
      workCamPos = cameraGlide.fromPos.clone().lerp(workCamPos, k);
      workTarget = cameraGlide.fromTarget.clone().lerp(workTarget, k);
    }
  }
  if (view.inWorkshop) stage.placeCamera(workCamPos, workTarget);
}
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
  inspectingOp = null; visibilityCache = null;
  undoStart = null;
  controller = nextController ?? new FoldController(ops.length, i => (ops[i].op.kind === 'turn' ? 1.5 : ops[i].op.kind === 'collapse' ? 2.6 : 1.15) * (reducedMotion ? 0.6 : 1));
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
  garmentId = id;
  const resume = designProgress.get(id)?.done ?? 0;
  replaceConstruction(buildGarment(id, garmentOptions));
  controller.jumpTo(resume);
}
/** What a pin of the finished piece would capture: the piece, its paper and its accessory. */
function pinRecipe() {
  return JSON.stringify([location.search, attached && accessoryRoot.visible ? [accessoryId, pinPaper.id, pinTurns, pinPrintPosition, pinPosition, centreAttached, centrePaper.id, centreTurns] : null]);
}
const isPinned = () => !!pinned && pinned.recipe === pinRecipe() && pinboard.has(pinned.id);
/** Pin the finished piece from the workshop in one go; the board opens with it selected. */
function pinFinishedPiece() {
  if (accessoryMode || !controller.finished || controller.moving) return;
  cancelDrag();
  if (isPinned()) { pinboard.open(); return; }
  pinboard.openAndPin();
  refreshWorkshopPanel();
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
  accessoryMode = true; paper = pinPaper; quarterTurns = pinTurns; printPosition = { ...pinPrintPosition };
  replaceConstruction(findAccessory(accessoryId).build(), pinTimeline);
  controller.jumpTo(savedPinStep);
}
function editCentre() {
  if (accessoryMode || !controller.finished || accessoryId !== 'bow' || bowWing !== 1 || savedPinStep !== pinTimeline.ops.length) return;
  savedGarment = { construction, timeline, controller };
  editingCentre = true; accessoryMode = true; paper = centrePaper; quarterTurns = centreTurns; printPosition = { ...centrePrintPosition };
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
  accessoryMode = false; editingCentre = false; paper = garmentPaper; quarterTurns = garmentTurns; printPosition = { ...garmentPosition };
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

let lastInsetKey = '';
/** The first frame has been drawn (layout changes from then on are seen). */
let drawn = false;
/** Narrow screens, in the workshop (folding an accessory keeps the full controls, with Back to garment). */
const foldingBar = () => window.innerWidth < 720 && view.target === 0 && !accessoryMode;
function layout() {
  studio.setFoldingBar(foldingBar());
  // a cramped screen keeps instructions and construction notes one tap away
  studio.setCompactNotes(workshopPanel.fit());
  workshopPanel.setHintRoom(Math.max(studio.root.getBoundingClientRect().bottom, picker.insets().top));
  stage.resize();
  const inset = insets(), insetKey = JSON.stringify(inset);
  // the controls around the paper changed size in the workshop: ease to the new framing
  // (not before the first frame is drawn: at start-up there is nothing on screen to jump)
  if (ready && drawn && view.inWorkshop && lastInsetKey && insetKey !== lastInsetKey && !controller.isScrubbing) startGlide();
  lastInsetKey = insetKey;
  stage.setInsets(inset);
  frameWorkshop();
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
  // whether a step's paper is hidden depends on where the camera ended up
  if (ready && inspectState() !== lastInspect) refreshWorkshopPanel();
}
new ResizeObserver(layout).observe(app);
new ResizeObserver(layout).observe(studio.root);
new ResizeObserver(layout).observe(workshopPanel.dock);
new ResizeObserver(layout).observe(displayPanel.dock);
layout();

window.addEventListener('keydown', (e) => {
  if (positionPanel.dialog.open || pinboard.dialog.open || e.defaultPrevented) return;
  if (e.target instanceof HTMLElement && e.target.closest('button, select, input, textarea')) return;
  if (view.inWorkshop) {
    if (e.key === 'ArrowRight') { scrubRelease = null; controller.next(); }
    else if (e.key === 'ArrowLeft') { scrubRelease = null; controller.prev(); }
  } else if (view.inDisplay && e.key === 'Escape') {
    leaveDisplay();
  }
});

const foldHandles = new FoldHandles(app, (event, piece) => startDrag(event, piece, true), () => { scrubRelease = null; controller.next(); });

// ---- hidden folds: "See this fold" and grips on paper under other layers
/** How much of a pending step's moving paper the workshop camera sees, at the waiting pose. */
function pendingVisibility(anim: OpAnim): Visibility | null {
  if (anim.op.kind === 'turn' || !view.inWorkshop) return null;
  stage.modelRoot.updateMatrixWorld();
  const eye = stage.modelRoot.worldToLocal(workCamPos.clone());
  const key = eye.toArray().map(n => n.toFixed(2)).join(',');
  if (visibilityCache?.anim !== anim || visibilityCache.eye !== key) {
    visibilityCache = { anim, eye: key, v: movingVisibility(anim, evaluateFrame(anim, pendingT(anim)), [eye.x, eye.y, eye.z]) };
  }
  return visibilityCache.v;
}
function inspectState(): 'off' | 'offered' | 'showing' {
  const a = controller.activeOp;
  if (!ready || a === null) return 'off';
  if (inspectingOp === a) return 'showing';
  const v = pendingVisibility(ops[a]);
  return v && v.fraction < HIDDEN_FOLD ? 'offered' : 'off';
}

// ---- pose evaluation
const PEEK_FOLD = 8; // degrees the pending flap lifts while waiting
const PEEK_TURN = 4;
const PEEK_COLLAPSE = 0; // the tint shows what moves; a peek would lift the paper over the guides
const tForAngle = (deg: number) => Math.acos(1 - 2 * (deg / 180)) / Math.PI;
const pendingT = (a: OpAnim) => tForAngle(a.op.kind === 'turn' ? PEEK_TURN : a.op.kind === 'collapse' ? PEEK_COLLAPSE : PEEK_FOLD);
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
    const target = workTarget.clone().lerp(displayCam.target, e);
    stage.placeCamera(workCamPos.clone().lerp(displayCamPos, e), target);
  }
}

function draw() {
  if (view.inWorkshop) frameWorkshop();
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
  const t = pose.pending && workshop ? pendingT(anim) : pose.t;
  frame = evaluateFrame(anim, t, frame);
  sheet.pose(frame);
  const lapels = new Set(timeline.states[pose.op + 1].facets.filter(f => f.tags.some(t => t.startsWith('vest-lapel-'))).map(f => f.id));
  lapelEdges.update(anim, frame, lapels, garmentId === 'vest' && !accessoryMode && lapels.size > 0);
  const preview = workshop && (pose.pending || controller.isScrubbing);
  sheet.setTint(preview && anim.op.kind !== 'turn' ? movingPieces(anim) : new Set(), 0.55);
  if (preview) {
    guides.show(anim, anim.maxPreZ + LAYER_GAP);
    guides.group.position.z = frameLift(anim); // stay with paper that rises off the table
  } else guides.hide();
  if (workshop && inspectingOp === pose.op && anim.op.kind !== 'turn' && (pose.pending || controller.moving || controller.isScrubbing)) hiddenPaper.show(anim, frame);
  else hiddenPaper.hide();
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
  // paper under other layers gets a grip of its own, one per moving part
  const hidden = preview && !controller.isScrubbing ? pendingVisibility(anim) : null;
  if (hidden) for (const [spec, g] of hidden.groups) {
    if (g.fraction >= HIDDEN_FOLD) continue;
    // the anchor was measured at the waiting pose, which is the pose shown while previewing
    const screen = toScreen(new THREE.Vector3(...g.anchor));
    const vector = foldDirection(anim, spec);
    targets.push({ piece: g.piece, x: screen.x, y: screen.y, vx: vector.x, vy: vector.y, label: anim.op.kind === 'collapse' ? 'Move the hidden paper' : 'Fold the hidden paper' });
  }
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
  releaseScrub(!cancelled && (tap || t > 0.35));
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
refreshWorkshopPanel(); // offers "See this fold" now the camera is placed

// ---- loop
let last = performance.now();
function tick(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!pinboard.dialog.open) {
    if (!positionPanel.dialog.open) {
      controller.update(dt);
      if (cameraGlide) cameraGlide.elapsed += dt;
      view.update(dt);
      placePiece();
      if (view.inDisplay) displayCam.update(dt);
    }
    draw();
    drawn = true;
  }
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
    get printPosition() { return { ...printPosition }; },
    get garmentPrintPosition() { return { ...garmentPosition }; },
    get pinPrintPosition() { return { ...pinPrintPosition }; },
    get centrePrintPosition() { return { ...centrePrintPosition }; },
    sheet,
    hiddenPaper,
    get inspectingOp() { return inspectingOp; },
    /** The workshop camera is easing (after a release, or to a new framing when the controls change size). */
    get cameraSettling() { return cameraGlide !== null; },
    pinboard,
    pinSheet,
    view,
    displayCam,
    stage,
    enterDisplay,
    leaveDisplay,
    setPaper(id: string) {
      if (id !== paper.id) printPosition = { ...ORIGINAL };
      paper = resolvePaper(id);
      applyPaper();
    },
    rotatePattern(q: number) {
      quarterTurns = ((q % 4) + 4) % 4;
      applyPaper();
    },
  },
});
