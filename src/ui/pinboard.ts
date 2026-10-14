import * as THREE from 'three';
import { PAPERS } from '../papers';
import { rotationCheckPaper } from '../papers/rotationCheck';
import { BACKGROUNDS, Background, BoardAppearance, BoardState, BoardStore, copyBoard, defaultAppearance, emptyBoard, GuideId, GuideTransform, MAX_PIECES } from '../board/model';
import { BoardDecor } from '../board/presentation';
import { createCorkTexture } from '../board/surfaces';
import { capture, restore } from '../board/snapshot';
import { BOARD_WIDTH as WIDTH, BOARD_HEIGHT as HEIGHT, BOARD_MARGIN as MARGIN, BOARD_FORMATS, BoardFormat } from '../board/layout';
import { describePaperSize, PaperSizeSource, REFERENCE_SQUARE_CM, squareChoices, startingPaperSize } from '../fold/paperSize';

export interface BoardSource { title: string; objects: THREE.Object3D[]; angle: number; paperSize?: PaperSizeSource }

export class Pinboard {
  readonly dialog = document.createElement('dialog');
  readonly canvas = document.createElement('canvas');
  readonly arrangement = new THREE.Group();
  readonly launcher = document.createElement('button');
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-WIDTH/2, WIDTH/2, HEIGHT/2, -HEIGHT/2, .1, 20);
  private renderer?: THREE.WebGLRenderer;
  private backing?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private decor = new BoardDecor();
  private keyLight = new THREE.DirectionalLight('#fff3e2', 2.1);
  private fillLight = new THREE.HemisphereLight('#fff6ea', '#8f877a', 1.25);
  private surfaceKey = '';
  private surface = document.createElement('select');
  private pinStyle = document.createElement('select');
  private guide = document.createElement('select');
  private finish = document.createElement('details');
  private guideAdjust = document.createElement('details');
  private guideTarget = document.createElement('select');
  private guideSize = document.createElement('input');
  private guideSizeValue = document.createElement('output');
  private guideHint = document.createElement('p');
  private caption = document.createElement('p');
  private guideEdit: HTMLButtonElement;
  private guideTools: HTMLButtonElement[] = [];
  private movingGuide = false;
  private guideBefore?: BoardState;
  private lighting = document.createElement('select');
  private guideInPhoto = document.createElement('input');
  private photoMode = false;
  private placingPin = false;
  private placePin: HTMLButtonElement;
  private resetPin: HTMLButtonElement;
  private photo: HTMLButtonElement;
  private photoSave: HTMLButtonElement;
  private state: BoardState = emptyBoard();
  private store = new BoardStore(() => localStorage, [...PAPERS.map(p => p.id), rotationCheckPaper.id]);
  private groups = new Map<string, THREE.Group>();
  private history: BoardState[] = [];
  private title = document.createElement('h2');
  private tilt = document.createElement('input');
  private format = document.createElement('select');
  private note = document.createElement('p');
  private get layout() { return BOARD_FORMATS[this.state.format ?? 'standard']; }
  private background = document.createElement('select');
  private source = document.createElement('select');
  private size = document.createElement('select');
  private sizeNote = document.createElement('p');
  private chosenSizes = new Map<string, number>();
  private savedSize = document.createElement('p');
  private pieces = document.createElement('select');
  private status = document.createElement('p');
  private storageStatus = document.createElement('p');
  private saveWarning = '';
  private unsaved = false;
  private exporting = false;
  private add: HTMLButtonElement;
  private download: HTMLButtonElement;
  private undo: HTMLButtonElement;
  private retry: HTMLButtonElement;
  private selectedTools: HTMLButtonElement[] = [];
  private drag?: { id: number; x: number; y: number; before: BoardState; moved: boolean } &
    ({ kind: 'paper'; item: string } | { kind: 'guide'; guide: GuideId; start: GuideTransform });
  private tiltBefore?: BoardState;
  private selection = new THREE.Box3Helper(new THREE.Box3(), '#5c4737');

  constructor(parent: HTMLElement, private handlers: { sources(): BoardSource[]; workshop(): void }) {
    try { this.state = this.store.load(); }
    catch { this.saveWarning = 'Saved board could not be read. Its data is untouched. New changes may last only in this tab.'; }
    this.dialog.className = 'editor-dialog pinboard-dialog';
    this.dialog.style.setProperty('--board-aspect', String(WIDTH / HEIGHT));
    this.title.id = 'pinboard-title'; this.title.tabIndex = -1; this.title.textContent = 'Your pinboard';
    this.dialog.setAttribute('aria-labelledby', this.title.id);
    this.launcher.className = 'studio-button'; this.launcher.onclick = () => this.open();
    this.canvas.className = 'pinboard-canvas'; this.canvas.tabIndex = 0;
    this.canvas.setAttribute('aria-label', 'Pinboard front view. Select and drag paper. Empty space does not pan. Arrow keys move the selected piece.');
    const left = document.createElement('div'); left.className = 'board-preview';
    const caption = this.caption; caption.className = 'editor-readout';
    caption.textContent = 'Select paper to move it. The outline marks your selection and stays out of the PNG.';
    left.append(this.canvas, caption);
    const tools = document.createElement('div'); tools.className = 'board-tools';
    const sourceLabel = this.label('Capture', this.source, 'Piece to pin');
    const sizeLabel = this.label('Starting paper', this.size, 'Starting square size');
    this.sizeNote.className = 'editor-readout';
    this.source.onchange = () => { this.refreshSize(); this.refresh(); };
    this.size.onchange = () => {
      const source = this.captureSize(); if (source) this.chosenSizes.set(source.key, Number(this.size.value));
      this.refreshSize();
    };
    this.savedSize.className = 'editor-readout';
    this.add = this.button('Pin current piece', () => this.pin()); this.add.classList.add('btn-primary');
    const selectionLabel = this.label('Selected', this.pieces, 'Selected board piece');
    this.pieces.onchange = () => { this.focusPaper(); this.placingPin = false; this.finishDrag(false); this.state.selected = this.pieces.value; this.refresh(); this.render(); };
    const formatLabel = this.label('Board size', this.format, 'Board size');
    this.format.add(new Option('Standard', 'standard'));
    this.format.add(new Option('Roomy · more space', 'roomy'));
    this.format.onchange = () => this.changeFormat(this.format.value as BoardFormat);
    const bg = this.label('Background', this.background, 'Pinboard background');
    for (const name of Object.keys(BACKGROUNDS)) this.background.add(new Option(name, name));
    this.background.onchange = () => this.mutate(() => { this.state.background = this.background.value as Background; });
    const angle = this.label('Tilt', this.tilt, 'Pinboard tilt');
    this.tilt.type = 'range'; this.tilt.min = '-12'; this.tilt.max = '12'; this.tilt.step = '1';
    this.tilt.oninput = () => {
      const item = this.selected(); if (!item || this.exporting) return;
      this.focusPaper(); this.placingPin = false; this.finishGuideSize();
      this.tiltBefore ??= copyBoard(this.state); item.tilt = Number(this.tilt.value);
      this.position(); this.constrain(item.id); this.render();
    };
    this.tilt.onchange = () => { this.finishTilt(); this.finishGuideSize(); };
    const nudges = document.createElement('div'); nudges.className = 'editor-actions';
    for (const [name, x, y] of [['Move left', -1, 0], ['Move right', 1, 0], ['Move up', 0, 1], ['Move down', 0, -1]] as const)
      nudges.append(this.selectedButton(name, () => this.nudge(x, y)));
    const edits = document.createElement('div'); edits.className = 'editor-actions';
    edits.append(this.selectedButton('Bring forward', () => this.layer(1)), this.selectedButton('Send backward', () => this.layer(-1)),
      this.selectedButton('Reset selected', () => this.mutate(() => { const i = this.selected(); if (i) { i.x = i.y = i.tilt = 0; this.position(); this.constrain(i.id); } })),
      this.selectedButton('Remove selected', () => this.mutate(() => {
        const index = this.state.items.findIndex(i => i.id === this.state.selected);
        this.state.items.splice(index, 1); this.state.selected = this.state.items.at(-1)?.id ?? null;
        this.status.textContent = 'Piece removed. Undo restores it, including its position.';
      })));
    this.undo = this.button('Undo', () => {
      this.movingGuide = false; this.placingPin = false; this.finishDrag(false); this.finishTilt(); this.finishGuideSize(); const previous = this.history.pop(); if (!previous) return;
      this.state = previous; this.reconcile(); this.setBackground(); this.persist(); this.refresh(); this.render();
      this.status.textContent = 'Last board change undone.';
    });
    this.download = this.button('Save PNG', () => { void this.exportPNG(); }); this.download.classList.add('btn-primary');
    const back = this.button('Return to piece', () => this.dialog.close());
    const workshop = this.button('Return to folding', () => { this.dialog.close(); this.handlers.workshop(); });
    this.note.className = 'editor-readout';
    this.status.setAttribute('role', 'status'); this.status.className = 'editor-readout';
    this.storageStatus.setAttribute('role', 'status'); this.storageStatus.className = 'board-storage editor-readout';
    this.retry = this.button('Retry saving board', () => { this.persist(); this.refresh(); });
    const finish = this.finish; finish.className = 'board-finish';
    const summary = document.createElement('summary'); summary.textContent = 'Finish & photograph';
    const finishBody = document.createElement('div'); finishBody.className = 'board-finish-controls';
    for (const [value, name] of [['original', 'Original board'], ['natural', 'Natural cork'], ['rose', 'Rose cork'], ['slate', 'Slate cork'], ['linen', 'Linen cloth']]) this.surface.add(new Option(name, value));
    this.surface.onchange = () => this.mutate(() => {
      this.placingPin = false;
      if (this.surface.value === 'original') delete this.state.appearance;
      else this.state.appearance = { ...(this.state.appearance ?? defaultAppearance()), surface: this.surface.value as BoardAppearance['surface'] };
    });
    const appearanceSelect = <K extends 'pins' | 'guide' | 'lighting'>(select: HTMLSelectElement, field: K, options: [BoardAppearance[K], string][]) => {
      for (const [value, name] of options) select.add(new Option(name, value));
      select.onchange = () => this.changeAppearance(field, select.value as BoardAppearance[K]);
    };
    appearanceSelect(this.pinStyle, 'pins', [['none', 'No pins'], ['brass', 'Brass'], ['pearl', 'Pearl'], ['white', 'Slim white'], ['black', 'Slim black'], ['red', 'Red']]);
    appearanceSelect(this.guide, 'guide', [['none', 'Off'], ['one', 'One figure'], ['two', 'Two figures']]);
    appearanceSelect(this.lighting, 'lighting', [['soft', 'Soft daylight'], ['clear', 'Clear daylight'], ['warm', 'Warm afternoon']]);
    const originalLight = new Option('Original light', 'original'); originalLight.disabled = true; this.lighting.add(originalLight);
    this.guideInPhoto.type = 'checkbox';
    this.guideInPhoto.onchange = () => this.changeAppearance('guideInPhoto', this.guideInPhoto.checked);
    const guideLabel = this.label('Keep guide in photograph', this.guideInPhoto, 'Include guide in photograph'); guideLabel.className = 'board-check';
    this.placePin = this.button('Place pin', () => {
      this.focusPaper(); this.finishDrag(false); this.finishTilt(); this.finishGuideSize(); this.placingPin = !this.placingPin;
      this.status.textContent = this.placingPin ? 'Tap the selected paper to place its pin. Or use Reset pin for an automatic position.' : 'Pin placement cancelled.';
      this.refresh(); this.render();
    });
    this.resetPin = this.button('Reset pin', () => { this.focusPaper(); this.mutate(() => { const item = this.selected(); if (item) delete item.pin; this.placingPin = false; }); });
    const pinActions = document.createElement('div'); pinActions.className = 'editor-actions'; pinActions.append(this.placePin, this.resetPin);
    this.guideAdjust.className = 'board-guide-adjust';
    const guideSummary = document.createElement('summary'); guideSummary.textContent = 'Adjust guides';
    const guideBody = document.createElement('div'); guideBody.className = 'board-finish-controls';
    this.guideTarget.onchange = () => { this.finishDrag(false); this.finishGuideSize(); this.refresh(); this.render(); };
    this.guideSize.type = 'range'; this.guideSize.min = '50'; this.guideSize.max = '150'; this.guideSize.step = '1';
    this.guideSize.oninput = () => {
      const id = this.activeGuide(), info = this.decor.guideInfo(id); if (!info || this.exporting) return;
      this.finishDrag(false); this.finishTilt(); this.placingPin = false;
      this.guideBefore ??= copyBoard(this.state);
      this.writeGuide(id, { ...info.pose, scale: Number(this.guideSize.value)/100 });
      this.refresh(); this.render();
    };
    this.guideSize.onchange = () => this.finishGuideSize();
    this.guideSize.onblur = () => this.finishGuideSize();
    this.guideSizeValue.className = 'editor-readout';
    this.guideHint.className = 'editor-readout';
    this.guideEdit = this.button('Move guide', () => {
      this.finishDrag(false); this.finishTilt(); this.finishGuideSize(); this.placingPin = false;
      this.movingGuide = !this.movingGuide;
      this.status.textContent = this.movingGuide ? 'Drag anywhere on the board to move this guide. Arrow keys also move it. Clothes stay in place.' : 'Guide placement finished.';
      this.refresh(); this.render();
    });
    const guideMoves = document.createElement('div'); guideMoves.className = 'editor-actions';
    for (const [name, x, y] of [['Guide left', -1, 0], ['Guide right', 1, 0], ['Guide up', 0, 1], ['Guide down', 0, -1]] as const) {
      const button = this.button(name, () => this.nudgeGuide(x, y)); this.guideTools.push(button); guideMoves.append(button);
    }
    const guideReset = this.button('Reset guide', () => this.mutate(() => {
      const poses = this.state.appearance?.guideTransforms; if (!poses) return;
      delete poses[this.activeGuide()];
      if (!Object.keys(poses).length) delete this.state.appearance!.guideTransforms;
    }, true));
    this.guideTools.push(guideReset);
    guideBody.append(this.label('Adjust', this.guideTarget, 'Guide to adjust'), this.guideEdit, this.guideHint,
      this.label('Size', this.guideSize, 'Guide size'), this.guideSizeValue, guideMoves, guideReset);
    this.guideAdjust.append(guideSummary, guideBody);
    const updateGuideFocus = () => {
      if (this.adjustingGuide) this.placingPin = false;
      // Details remain operable while the PNG is encoding. Keep transient focus
      // coherent, but leave the export scene and disabled controls untouched.
      if (this.exporting) {
        if (!finish.open || !this.guideAdjust.open) this.movingGuide = false;
        return;
      }
      if (!finish.open || !this.guideAdjust.open) {
        if (this.movingGuide) { this.finishDrag(false); this.movingGuide = false; }
        this.finishGuideSize();
      }
      this.refresh(); this.render();
    };
    finish.addEventListener('toggle', updateGuideFocus); this.guideAdjust.addEventListener('toggle', updateGuideFocus);
    const explanation = document.createElement('p'); explanation.className = 'editor-readout';
    explanation.textContent = 'A flat guide for arranging clothes. It does not resize your paper. Pins are decorative; drag the paper to move it.';
    this.photo = this.button('Photograph', () => this.setPhotoMode(true));
    finishBody.append(this.label('Surface', this.surface, 'Board surface'), this.label('Pins', this.pinStyle, 'Pin style'), pinActions,
      this.label('Outfit guide', this.guide, 'Figure guide'), this.guideAdjust, explanation, guideLabel, this.label('Light', this.lighting, 'Board lighting'), this.photo);
    finish.append(summary, finishBody);
    tools.append(sourceLabel, sizeLabel, this.sizeNote, this.add, workshop, finish, formatLabel, selectionLabel, this.savedSize, bg, angle, nudges, edits, this.undo, this.download, back, this.note, this.storageStatus, this.retry, this.status);
    const photoBar = document.createElement('div'); photoBar.className = 'board-photo-bar';
    this.photoSave = this.button('Save photograph', () => { void this.exportPNG(); }); this.photoSave.classList.add('btn-primary');
    photoBar.append(this.button('Back to arranging', () => this.setPhotoMode(false)), this.photoSave);
    left.append(photoBar);
    const body = document.createElement('div'); body.className = 'board-body'; body.append(left, tools);
    this.dialog.append(this.title, body); parent.append(this.dialog);
    this.selection.visible = false; this.scene.add(this.selection);
    this.dialog.addEventListener('cancel', e => {
      if (this.exporting) e.preventDefault();
      else if (this.photoMode) { e.preventDefault(); this.setPhotoMode(false); }
      else if (this.movingGuide) { e.preventDefault(); this.finishDrag(false); this.movingGuide = false; this.refresh(); this.render(); }
      else if (this.placingPin) { e.preventDefault(); this.placingPin = false; this.refresh(); this.render(); }
    });
    this.dialog.addEventListener('close', () => { this.finishDrag(false); this.finishTilt(); this.finishGuideSize(); this.setPhotoMode(false); });
    window.addEventListener('beforeunload', e => { if (this.unsaved) e.preventDefault(); });
    new ResizeObserver(() => { if (this.dialog.open && !this.exporting) this.render(); }).observe(this.canvas);
    this.canvas.addEventListener('pointerdown', e => {
      if (this.exporting || this.photoMode || this.drag || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      this.finishTilt(); this.finishGuideSize();
      if (this.movingGuide) {
        const id = this.activeGuide(), info = this.decor.guideInfo(id); if (!info) return;
        this.drag = { kind: 'guide', id: e.pointerId, x: e.clientX, y: e.clientY, guide: id, start: { ...info.pose }, before: copyBoard(this.state), moved: false };
        this.canvas.setPointerCapture(e.pointerId); this.canvas.focus({ preventScroll: true }); e.preventDefault(); return;
      }
      const r = this.canvas.getBoundingClientRect(), ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1, 1-(e.clientY-r.top)/r.height*2), this.camera);
      this.arrangement.updateMatrixWorld(true);
      const hit = ray.intersectObjects([...this.groups.values()], true).find(h => h.object instanceof THREE.Mesh);
      if (!hit) return;
      let group = hit.object; while (group.parent !== this.arrangement && group.parent) group = group.parent;
      const id = group.userData.boardId as string;
      if (this.placingPin) {
        if (id !== this.state.selected) { this.status.textContent = 'Tap visible paper on the selected piece, or cancel pin placement.'; return; }
        const local = group.worldToLocal(hit.point.clone());
        this.mutate(() => { this.selected()!.pin = { x: local.x, y: local.y }; this.placingPin = false; });
        this.status.textContent = 'Pin placed. It will stay with this piece.'; e.preventDefault(); return;
      }
      this.focusPaper(); this.state.selected = id;
      this.drag = { kind: 'paper', id: e.pointerId, x: e.clientX, y: e.clientY, item: id, before: copyBoard(this.state), moved: false };
      this.canvas.setPointerCapture(e.pointerId); this.canvas.focus({ preventScroll: true }); e.preventDefault();
      this.refresh(); this.render();
    });
    this.canvas.addEventListener('pointermove', e => {
      const d = this.drag; if (!d || e.pointerId !== d.id) return;
      if (Math.hypot(e.clientX-d.x, e.clientY-d.y) < 6 && !d.moved) return;
      d.moved = true;
      const r = this.canvas.getBoundingClientRect();
      if (d.kind === 'guide') {
        this.writeGuide(d.guide, { ...d.start, x: d.start.x + (e.clientX-d.x)/r.width*this.layout.width,
          y: d.start.y - (e.clientY-d.y)/r.height*this.layout.height });
        this.refresh(); this.render(); return;
      }
      const before = d.before.items.find(i => i.id === d.item)!, item = this.selected()!;
      item.x = before.x + (e.clientX-d.x)/r.width*this.layout.width; item.y = before.y - (e.clientY-d.y)/r.height*this.layout.height;
      this.position(); this.constrain(item.id); this.render();
    });
    this.canvas.addEventListener('pointerup', e => { if (e.pointerId === this.drag?.id) this.finishDrag(true); });
    this.canvas.addEventListener('pointercancel', e => { if (e.pointerId === this.drag?.id) this.finishDrag(false); });
    this.canvas.addEventListener('lostpointercapture', () => this.finishDrag(false));
    this.canvas.addEventListener('keydown', e => {
      const d: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
      if (d[e.key] && !this.photoMode && !this.placingPin) {
        e.preventDefault(); if (this.movingGuide) this.nudgeGuide(...d[e.key]); else this.nudge(...d[e.key]);
      }
    });
    this.refresh();
  }

  private activeGuide(): GuideId {
    return this.state.appearance?.guide === 'one' ? 'one' : this.guideTarget.value === 'right' ? 'right' : 'left';
  }
  private get adjustingGuide() { return this.finish.open && this.guideAdjust.open && !this.guideAdjust.hidden; }
  private focusPaper() {
    // Closing the guide controls makes the outline's handoff explicit while
    // preserving every guide pose. Only Move guide changes canvas dragging.
    this.movingGuide = false; this.guideAdjust.open = false;
  }
  private writeGuide(id: GuideId, pose: GuideTransform) {
    const appearance = this.state.appearance; if (!appearance) return;
    appearance.guideTransforms = { ...appearance.guideTransforms, [id]: this.decor.constrainGuide(id, pose) };
  }
  private nudgeGuide(x: number, y: number) {
    const id = this.activeGuide(), info = this.decor.guideInfo(id); if (!info) return;
    this.mutate(() => this.writeGuide(id, { ...info.pose, x: info.pose.x + x*.08, y: info.pose.y + y*.08 }), true);
  }
  private finishGuideSize() {
    if (!this.guideBefore) return;
    this.checkpoint(this.guideBefore); this.guideBefore = undefined; this.persist(); this.refresh();
  }
  private changeAppearance<K extends keyof BoardAppearance>(key: K, value: BoardAppearance[K]) {
    this.mutate(() => { this.state.appearance = { ...(this.state.appearance ?? defaultAppearance()), [key]: value }; this.placingPin = false; });
  }
  private setPhotoMode(enabled: boolean) {
    this.finishDrag(true); this.finishTilt(); this.finishGuideSize(); this.placingPin = false; this.movingGuide = false; this.photoMode = enabled;
    this.dialog.classList.toggle('board-photograph', enabled);
    this.canvas.tabIndex = enabled ? -1 : 0;
    this.refresh(); this.render();
    if (this.dialog.open) (enabled ? this.photoSave : this.photo).focus({ preventScroll: true });
  }
  private syncDecor(photograph = this.photoMode) {
    this.decor.sync(this.state, this.groups, this.layout.width, this.layout.height, photograph);
  }
  private label(text: string, control: HTMLElement, name: string) {
    const label = document.createElement('label'); label.textContent = text; control.setAttribute('aria-label', name); label.append(control); return label;
  }
  private button(label: string, action: () => void) {
    const b = document.createElement('button'); b.className = 'btn btn-quiet'; b.textContent = label;
    b.onclick = () => { if (!this.exporting) action(); }; return b;
  }
  private selectedButton(label: string, action: () => void) { const b = this.button(label, () => { this.focusPaper(); action(); }); this.selectedTools.push(b); return b; }
  private selected() { return this.state.items.find(i => i.id === this.state.selected); }
  private captureSize(): PaperSizeSource | undefined {
    const source = this.handlers.sources()[Number(this.source.value)];
    if (!source || this.source.value === '') return;
    return source.paperSize ?? { key: source.title, referenceCm: REFERENCE_SQUARE_CM, recommendedCm: REFERENCE_SQUARE_CM };
  }
  private refreshSize() {
    const source = this.captureSize(); this.size.replaceChildren(); this.size.disabled = !source;
    if (!source) { this.sizeNote.textContent = 'Finish a piece to choose its starting square.'; return; }
    const choices = squareChoices(source), chosen = this.chosenSizes.get(source.key);
    const selected = chosen !== undefined && choices.includes(chosen) ? chosen : source.recommendedCm;
    for (const side of choices) this.size.add(new Option(`${side} cm square${side === source.recommendedCm ? ' · suggested' : ''}`, String(side)));
    this.size.value = String(selected);
    this.sizeNote.textContent = `${source.companionCm?.length ? `New capture: ${describePaperSize(startingPaperSize(source, selected))}. ` : ''}Workshop is a close-up; this square size applies to the next capture. Printed features stay aligned. Pinned pieces keep their size.`;
  }
  private checkpoint(before: BoardState) { this.history.push(before); if (this.history.length > 20) this.history.shift(); }
  private mutate(action: () => void, keepGuideMode = false) {
    if (this.exporting) return;
    this.placingPin = false; if (!keepGuideMode) this.movingGuide = false;
    this.finishDrag(false); this.finishTilt(); this.finishGuideSize(); this.checkpoint(copyBoard(this.state)); action();
    this.reconcile(); this.persist(); this.refresh(); this.render();
  }
  private persist() {
    try { this.store.save(this.state); this.unsaved = false; this.saveWarning = ''; }
    catch (e) { this.unsaved = true; this.saveWarning = `Board changes are only in this tab. ${e instanceof Error ? e.message : 'Storage is unavailable.'} Keep this tab open; retry saving or save a PNG.`; }
  }
  private finishTilt() {
    if (!this.tiltBefore) return;
    this.checkpoint(this.tiltBefore); this.tiltBefore = undefined; this.persist(); this.refresh();
  }
  private finishDrag(commit: boolean) {
    const d = this.drag; if (!d) return; this.drag = undefined;
    if (this.canvas.hasPointerCapture(d.id)) this.canvas.releasePointerCapture(d.id);
    if (d.moved && commit) { this.checkpoint(d.before); this.persist(); }
    else if (d.moved) this.state = d.before;
    this.position(); this.refresh(); this.render();
  }
  private nudge(x: number, y: number) {
    if (!this.selected()) return;
    this.focusPaper();
    this.mutate(() => { const i = this.selected()!; i.x += x*.08; i.y += y*.08; this.position(); this.constrain(i.id); });
  }
  private layer(delta: number) {
    const index = this.state.items.findIndex(i => i.id === this.state.selected), next = index + delta;
    if (index < 0 || next < 0 || next >= this.state.items.length) return;
    this.mutate(() => { const [item] = this.state.items.splice(index, 1); this.state.items.splice(next, 0, item); });
  }
  private pin() {
    const source = this.handlers.sources()[Number(this.source.value)];
    if (!source || this.state.items.length >= MAX_PIECES) return;
    this.focusPaper();
    try {
      const sizing = this.captureSize()!, side = Number(this.size.value);
      if (!squareChoices(sizing).includes(side)) throw new Error('Choose a starting square');
      const snapshot = capture(source.objects, source.angle, side / sizing.referenceCm);
      const paperSize = startingPaperSize(sizing, side);
      this.mutate(() => {
        const id = crypto.randomUUID(), offset = this.state.items.length * .16;
        this.state.items.push({ id, title: source.title, snapshot, paperSize, x: offset, y: -offset, tilt: 0 }); this.state.selected = id;
      });
      this.constrain(this.state.selected!); this.persist(); this.refresh(); this.render();
      this.status.textContent = 'Piece pinned. Return to folding to make another; this capture will stay as it is.';
    } catch { this.status.textContent = 'This piece could not be pinned. Your existing board is unchanged.'; }
  }
  open(): void {
    if (this.dialog.open) return;
    this.init(); this.reconcile(); this.setBackground();
    this.source.replaceChildren();
    this.handlers.sources().forEach((s, i) => this.source.add(new Option(s.title, String(i))));
    if (!this.source.length) this.source.add(new Option('Finish a piece to pin it', ''));
    this.refreshSize();
    this.status.textContent = ''; this.refresh(); this.dialog.showModal();
    this.title.focus({ preventScroll: true }); this.dialog.scrollTop = 0; this.render();
  }
  private refresh() {
    this.title.textContent = `Your pinboard · ${this.state.items.length}/${MAX_PIECES}`;
    this.format.value = this.state.format ?? 'standard';
    this.note.textContent = `${this.state.format === 'roomy' ? 'Roomy gives more arranging space; pieces appear smaller in the overview. ' : ''}PNG · ${this.layout.exportWidth} × ${this.layout.exportHeight}. Board saves on this device. Undo keeps the last 20 changes in this tab.`;
    this.launcher.textContent = `View board (${this.state.items.length}/${MAX_PIECES})${this.unsaved ? ' · unsaved' : ''}`;
    this.pieces.replaceChildren();
    for (const [i, item] of this.state.items.entries()) this.pieces.add(new Option(`${i+1}. ${item.title}`, item.id));
    if (!this.state.items.length) this.pieces.add(new Option('No pinned pieces yet', ''));
    this.pieces.value = this.state.selected ?? '';
    const saved = this.selected();
    this.savedSize.textContent = saved ? saved.paperSize ? `Pinned with ${describePaperSize(saved.paperSize)}.` : 'Earlier capture: kept at its saved size; starting square was not recorded.' : '';
    this.pieces.disabled = !this.state.items.length; this.tilt.disabled = !this.selected();
    this.tilt.value = String(this.selected()?.tilt ?? 0); this.background.value = this.state.background;
    this.selectedTools.forEach(b => b.disabled = !this.selected());
    this.undo.disabled = !this.history.length; this.download.disabled = !this.state.items.length;
    this.photo.disabled = this.photoSave.disabled = !this.state.items.length;
    const appearance = this.state.appearance;
    this.surface.value = appearance?.surface ?? 'original'; this.pinStyle.value = appearance?.pins ?? 'none';
    this.guide.value = appearance?.guide ?? 'none'; this.lighting.value = appearance?.lighting ?? 'original';
    this.pinStyle.disabled = this.guide.disabled = this.lighting.disabled = !appearance;
    this.guideInPhoto.checked = appearance?.guideInPhoto ?? false; this.guideInPhoto.disabled = !appearance || appearance.guide === 'none';
    this.background.disabled = !!appearance;
    this.background.closest('label')!.hidden = !!appearance;
    this.placePin.disabled = this.resetPin.disabled = !this.selected() || !appearance || appearance.pins === 'none';
    this.placePin.textContent = this.placingPin ? 'Cancel pin placement' : 'Place pin';
    this.canvas.classList.toggle('placing-pin', this.placingPin);
    this.syncDecor();
    const guideId = this.activeGuide(), info = this.decor.guideInfo(guideId);
    this.guideAdjust.hidden = !info;
    const ids: GuideId[] = appearance?.guide === 'one' ? ['one'] : ['left', 'right'];
    this.guideTarget.replaceChildren(...ids.map(id => new Option(id === 'one' ? 'Figure guide' : id === 'left' ? 'Guide 1' : 'Guide 2', id)));
    this.guideTarget.value = guideId; this.guideTarget.disabled = ids.length === 1;
    this.guideSize.disabled = this.guideEdit.disabled = !info;
    this.guideTools.forEach(b => b.disabled = !info);
    if (!info) this.movingGuide = false;
    this.guideEdit.textContent = this.movingGuide ? 'Done moving guide' : 'Move guide';
    this.guideEdit.setAttribute('aria-pressed', String(this.movingGuide));
    const guideName = guideId === 'one' ? 'the figure guide' : guideId === 'left' ? 'Guide 1' : 'Guide 2';
    this.guideHint.textContent = this.movingGuide ? `Drag anywhere on the board to move ${guideName}. Clothes stay in place.`
      : `The outline marks ${guideName}. Use Size or the guide arrows; Move guide enables dragging.`;
    this.caption.textContent = this.movingGuide ? this.guideHint.textContent : this.placingPin
      ? 'Tap visible paper on the selected piece to place its pin.'
      : this.adjustingGuide ? `${this.guideHint.textContent} Select paper to return to arranging it.`
        : 'Select paper to move it. The outline marks your selection and stays out of the PNG.';
    this.canvas.classList.toggle('moving-guide', this.movingGuide);
    this.canvas.setAttribute('aria-label', this.movingGuide
      ? 'Move selected figure guide. Drag anywhere on this board, or use arrow keys. Clothes stay in place.'
      : this.adjustingGuide ? `Pinboard front view. The outline marks ${guideName}. Use the guide controls to adjust it. Select paper to return to arranging; arrow keys move the selected paper.`
        : 'Pinboard front view. Select and drag paper. Empty space does not pan. Arrow keys move the selected piece.');
    this.guideSize.max = String(Math.round((info?.maxScale ?? 1.5)*100));
    this.guideSize.value = String(Math.round((info?.pose.scale ?? 1)*100));
    this.guideSize.setAttribute('aria-valuetext', `${this.guideSize.value} percent`);
    this.guideSizeValue.textContent = `${this.guideSize.value}% · guide only`;
    this.add.disabled = this.state.items.length >= MAX_PIECES || !this.source.length || this.source.value === '';
    this.size.disabled = !this.source.length || this.source.value === '';
    this.add.textContent = this.state.items.length >= MAX_PIECES ? `Board full · ${MAX_PIECES} pieces` : 'Pin current piece';
    this.storageStatus.textContent = this.saveWarning || 'Board saved on this device.';
    this.retry.hidden = !this.unsaved;
    if (this.unsaved && this.dialog.open) this.storageStatus.scrollIntoView({ block: 'nearest' });
  }
  private changeFormat(format: BoardFormat) {
    this.finishDrag(false); this.finishTilt(); this.finishGuideSize();
    if (format === (this.state.format ?? 'standard')) return;
    const { width, height } = BOARD_FORMATS[format];
    this.position();
    const fits = [...this.groups.values()].every(group => {
      const b = new THREE.Box3().setFromObject(group, true);
      return b.min.x >= -width/2 + MARGIN - 1e-6 && b.max.x <= width/2 - MARGIN + 1e-6
        && b.min.y >= -height/2 + MARGIN - 1e-6 && b.max.y <= height/2 - MARGIN + 1e-6;
    });
    if (!fits) {
      this.format.value = this.state.format ?? 'standard';
      this.status.textContent = 'Move the outer pieces closer to the centre before choosing Standard. Your arrangement has stayed in place.';
      this.status.scrollIntoView({ block: 'nearest' }); return;
    }
    this.mutate(() => {
      if (format === 'standard') delete this.state.format;
      else this.state.format = format;
    });
    this.status.textContent = format === 'roomy'
      ? 'More space around your pieces. Their paper sizes and positions are unchanged.'
      : 'Standard board restored. Your pieces have stayed in place.';
  }
  private applyLayout() {
    const { width, height } = this.layout;
    this.camera.left = -width/2; this.camera.right = width/2;
    this.camera.top = height/2; this.camera.bottom = -height/2; this.camera.updateProjectionMatrix();
    this.dialog.style.setProperty('--board-aspect', String(width/height));
    if (this.backing && (this.backing.geometry.parameters.width !== width || this.backing.geometry.parameters.height !== height)) {
      this.backing.geometry.dispose(); this.backing.geometry = new THREE.PlaneGeometry(width, height);
    }
  }

  private reconcile() {
    this.applyLayout();
    for (const [id, group] of this.groups) if (!this.state.items.some(i => i.id === id)) {
      group.userData.dispose(); group.removeFromParent(); this.groups.delete(id);
    }
    for (const item of this.state.items) if (!this.groups.has(item.id)) {
      const group = restore(item.snapshot); group.userData.boardId = item.id; this.groups.set(item.id, group); this.arrangement.add(group);
    }
    this.position(); this.setBackground(); this.renderer?.renderLists.dispose();
  }
  private position() {
    let top = -.10;
    for (const item of this.state.items) {
      const g = this.groups.get(item.id); if (!g) continue;
      g.position.set(item.x, item.y, 0); g.rotation.z = -item.tilt * Math.PI / 180; g.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(g, true);
      // Whole pieces occupy disjoint depth intervals, including protruding accessories.
      g.position.z = top - box.min.z; top += box.max.z - box.min.z + .025;
      g.updateMatrixWorld(true);
    }
  }
  private constrain(id: string) {
    const item = this.state.items.find(i => i.id === id), group = this.groups.get(id); if (!item || !group) return;
    group.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(group, true);
    const clamp = (lo: number, hi: number, extent: number) => hi-lo > 2*(extent-MARGIN) ? -(lo+hi)/2 : Math.max(-extent+MARGIN-lo, Math.min(extent-MARGIN-hi, 0));
    item.x += clamp(b.min.x, b.max.x, this.layout.width/2); item.y += clamp(b.min.y, b.max.y, this.layout.height/2); this.position();
  }
  private render() {
    if (!this.renderer || !this.dialog.open || this.exporting) return;
    this.syncDecor();
    const group = this.adjustingGuide ? this.decor.guideInfo(this.activeGuide())?.object : this.state.selected && this.groups.get(this.state.selected);
    this.selection.visible = !!group && !this.photoMode && !this.placingPin;
    if (group) { this.selection.box.setFromObject(group, true); this.selection.updateMatrixWorld(true); }
    const w = Math.max(1, Math.round(this.canvas.clientWidth * Math.min(devicePixelRatio, 2)));
    this.renderer.setSize(w, Math.round(w*this.layout.height/this.layout.width), false); this.renderer.render(this.scene, this.camera);
  }

  private init() {
    if (this.renderer) return;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera.position.set(0, 0, 8);
    this.scene.add(this.fillLight);
    const key = this.keyLight; key.position.set(-2.6, 5.2, 5);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = .1; key.shadow.camera.far = 15;
    key.shadow.bias = -.0002; key.shadow.normalBias = .004;
    this.scene.add(key, this.arrangement, this.decor.root);
    this.backing = new THREE.Mesh(new THREE.PlaneGeometry(this.layout.width, this.layout.height), new THREE.MeshStandardMaterial({ roughness: 1 }));
    this.backing.position.z = -.15; this.backing.receiveShadow = true; this.scene.add(this.backing);
    this.setBackground();
  }
  private setBackground() {
    if (!this.backing) return;
    const a = this.state.appearance, light = a?.lighting;
    this.keyLight.position.set(...(light ? [-1, 1.4, 12] : [-2.6, 5.2, 5]) as [number, number, number]);
    this.keyLight.intensity = light === 'clear' ? 2 : light ? 1.6 : 2.1;
    this.keyLight.color.set(light === 'warm' ? '#ffe0b4' : light ? '#fff9ef' : '#fff3e2');
    this.fillLight.intensity = light === 'clear' ? 1.3 : light ? 1.65 : 1.25;
    this.fillLight.color.set(light === 'warm' ? '#fff1da' : '#fff6ea');
    this.keyLight.shadow.camera.far = light ? 30 : 15; this.keyLight.shadow.camera.updateProjectionMatrix();
    const signature = `${a?.surface ?? 'original'}:${this.state.background}:${this.layout.width}:${this.layout.height}`;
    if (this.surfaceKey === signature) return;
    this.surfaceKey = signature;
    if (a && a.surface !== 'linen') {
      this.backing.material.map?.dispose();
      this.backing.material.map = createCorkTexture(a.surface, this.layout.width, this.layout.height);
      this.backing.material.needsUpdate = true; return;
    }
    const c = document.createElement('canvas'); c.width = c.height = 256; const ctx = c.getContext('2d')!;
    ctx.fillStyle = BACKGROUNDS[a ? 'Linen' : this.state.background]; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 3) {
      ctx.fillStyle = '#ffffff09'; ctx.fillRect(0, i, 256, 1);
      ctx.fillStyle = '#29231d0c'; ctx.fillRect(i, 0, 1, 256);
    }
    const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(4, 4*this.layout.height/this.layout.width);
    this.backing.material.map?.dispose(); this.backing.material.map = texture; this.backing.material.needsUpdate = true;
  }

  private async exportPNG() {
    if (!this.renderer || this.exporting) return;
    const focusBefore = document.activeElement;
    this.finishDrag(true); this.finishTilt(); this.finishGuideSize(); this.selection.visible = false; this.syncDecor(true); this.exporting = true;
    this.dialog.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('button,input,select').forEach(e => e.disabled = true);
    this.status.textContent = 'Preparing PNG…';
    try {
      this.renderer.setSize(this.layout.exportWidth, this.layout.exportHeight, false); this.renderer.render(this.scene, this.camera);
      const blob = await new Promise<Blob>((resolve, reject) => this.canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG unavailable')), 'image/png'));
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = 'paper-couture-pinboard.png'; link.hidden = true;
      this.dialog.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      this.status.textContent = 'PNG ready. Your browser handles the download.';
    } catch {
      this.status.textContent = 'The PNG could not be prepared. Try Save PNG again.';
    } finally {
      this.exporting = false;
      this.dialog.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('button,input,select').forEach(e => e.disabled = false);
      this.refresh(); this.render();
      if (focusBefore instanceof HTMLElement && this.dialog.open && focusBefore.isConnected) focusBefore.focus({ preventScroll: true });
    }
  }
}
