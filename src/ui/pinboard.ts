import * as THREE from 'three';
import { PAPERS } from '../papers';
import { rotationCheckPaper } from '../papers/rotationCheck';
import { BACKGROUNDS, Background, BoardState, BoardStore, copyBoard, emptyBoard, MAX_PIECES } from '../board/model';
import { capture, restore } from '../board/snapshot';
import { BOARD_WIDTH as WIDTH, BOARD_HEIGHT as HEIGHT, BOARD_MARGIN as MARGIN, BOARD_EXPORT_WIDTH, BOARD_EXPORT_HEIGHT } from '../board/layout';

export interface BoardSource { title: string; objects: THREE.Object3D[]; angle: number }

export class Pinboard {
  readonly dialog = document.createElement('dialog');
  readonly canvas = document.createElement('canvas');
  readonly arrangement = new THREE.Group();
  readonly launcher = document.createElement('button');
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-WIDTH/2, WIDTH/2, HEIGHT/2, -HEIGHT/2, .1, 20);
  private renderer?: THREE.WebGLRenderer;
  private backing?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private state: BoardState = emptyBoard();
  private store = new BoardStore(() => localStorage, [...PAPERS.map(p => p.id), rotationCheckPaper.id]);
  private groups = new Map<string, THREE.Group>();
  private history: BoardState[] = [];
  private title = document.createElement('h2');
  private tilt = document.createElement('input');
  private background = document.createElement('select');
  private source = document.createElement('select');
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
  private drag?: { id: number; x: number; y: number; item: string; before: BoardState; moved: boolean };
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
    const caption = document.createElement('p'); caption.className = 'editor-readout';
    caption.textContent = 'Select paper to move it. The outline marks your selection and stays out of the PNG.';
    left.append(this.canvas, caption);
    const tools = document.createElement('div'); tools.className = 'board-tools';
    const hint = document.createElement('p');
    hint.textContent = 'Pin a finished piece, return to folding, then pin another. Each capture keeps its folds and paper. Up to four pieces.';
    const sourceLabel = this.label('Capture', this.source, 'Piece to pin');
    this.add = this.button('Pin current piece', () => this.pin()); this.add.classList.add('btn-primary');
    const selectionLabel = this.label('Selected', this.pieces, 'Selected board piece');
    this.pieces.onchange = () => { this.finishDrag(false); this.state.selected = this.pieces.value; this.refresh(); this.render(); };
    const bg = this.label('Background', this.background, 'Pinboard background');
    for (const name of Object.keys(BACKGROUNDS)) this.background.add(new Option(name, name));
    this.background.onchange = () => this.mutate(() => { this.state.background = this.background.value as Background; this.setBackground(); });
    const angle = this.label('Tilt', this.tilt, 'Pinboard tilt');
    this.tilt.type = 'range'; this.tilt.min = '-12'; this.tilt.max = '12'; this.tilt.step = '1';
    this.tilt.oninput = () => {
      const item = this.selected(); if (!item || this.exporting) return;
      this.tiltBefore ??= copyBoard(this.state); item.tilt = Number(this.tilt.value);
      this.position(); this.constrain(item.id); this.render();
    };
    this.tilt.onchange = () => this.finishTilt();
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
      this.finishDrag(false); this.finishTilt(); const previous = this.history.pop(); if (!previous) return;
      this.state = previous; this.reconcile(); this.setBackground(); this.persist(); this.refresh(); this.render();
      this.status.textContent = 'Last board change undone.';
    });
    this.download = this.button('Save PNG', () => { void this.exportPNG(); }); this.download.classList.add('btn-primary');
    const back = this.button('Return to piece', () => this.dialog.close());
    const workshop = this.button('Return to folding', () => { this.dialog.close(); this.handlers.workshop(); });
    const note = document.createElement('p'); note.className = 'editor-readout';
    note.textContent = `PNG · ${BOARD_EXPORT_WIDTH} × ${BOARD_EXPORT_HEIGHT} · selected background. Board saves in this browser on this device. Undo keeps the last 20 changes in this tab.`;
    this.status.setAttribute('role', 'status'); this.status.className = 'editor-readout';
    this.storageStatus.setAttribute('role', 'status'); this.storageStatus.className = 'board-storage editor-readout';
    this.retry = this.button('Retry saving board', () => { this.persist(); this.refresh(); });
    tools.append(hint, sourceLabel, this.add, workshop, selectionLabel, bg, angle, nudges, edits, this.undo, this.download, back, note, this.storageStatus, this.retry, this.status);
    const body = document.createElement('div'); body.className = 'board-body'; body.append(left, tools);
    this.dialog.append(this.title, body); parent.append(this.dialog);
    this.selection.visible = false; this.scene.add(this.selection);
    this.dialog.addEventListener('cancel', e => { if (this.exporting) e.preventDefault(); });
    this.dialog.addEventListener('close', () => { this.finishDrag(false); this.finishTilt(); });
    window.addEventListener('beforeunload', e => { if (this.unsaved) e.preventDefault(); });
    new ResizeObserver(() => { if (this.dialog.open && !this.exporting) this.render(); }).observe(this.canvas);
    this.canvas.addEventListener('pointerdown', e => {
      if (this.exporting || this.drag || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
      this.finishTilt();
      const r = this.canvas.getBoundingClientRect(), ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1, 1-(e.clientY-r.top)/r.height*2), this.camera);
      this.arrangement.updateMatrixWorld(true);
      const hit = ray.intersectObjects([...this.groups.values()], true).find(h => h.object instanceof THREE.Mesh);
      if (!hit) return;
      let group = hit.object; while (group.parent !== this.arrangement && group.parent) group = group.parent;
      const id = group.userData.boardId as string; this.state.selected = id;
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, item: id, before: copyBoard(this.state), moved: false };
      this.canvas.setPointerCapture(e.pointerId); this.canvas.focus({ preventScroll: true }); e.preventDefault();
      this.refresh(); this.render();
    });
    this.canvas.addEventListener('pointermove', e => {
      const d = this.drag; if (!d || e.pointerId !== d.id) return;
      if (Math.hypot(e.clientX-d.x, e.clientY-d.y) < 6 && !d.moved) return;
      d.moved = true;
      const r = this.canvas.getBoundingClientRect(), before = d.before.items.find(i => i.id === d.item)!, item = this.selected()!;
      item.x = before.x + (e.clientX-d.x)/r.width*WIDTH; item.y = before.y - (e.clientY-d.y)/r.height*HEIGHT;
      this.position(); this.constrain(item.id); this.render();
    });
    this.canvas.addEventListener('pointerup', e => { if (e.pointerId === this.drag?.id) this.finishDrag(true); });
    this.canvas.addEventListener('pointercancel', e => { if (e.pointerId === this.drag?.id) this.finishDrag(false); });
    this.canvas.addEventListener('lostpointercapture', () => this.finishDrag(false));
    this.canvas.addEventListener('keydown', e => {
      const d: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
      if (d[e.key]) { e.preventDefault(); this.nudge(...d[e.key]); }
    });
    this.refresh();
  }

  private label(text: string, control: HTMLElement, name: string) {
    const label = document.createElement('label'); label.textContent = text; control.setAttribute('aria-label', name); label.append(control); return label;
  }
  private button(label: string, action: () => void) {
    const b = document.createElement('button'); b.className = 'btn btn-quiet'; b.textContent = label;
    b.onclick = () => { if (!this.exporting) action(); }; return b;
  }
  private selectedButton(label: string, action: () => void) { const b = this.button(label, action); this.selectedTools.push(b); return b; }
  private selected() { return this.state.items.find(i => i.id === this.state.selected); }
  private checkpoint(before: BoardState) { this.history.push(before); if (this.history.length > 20) this.history.shift(); }
  private mutate(action: () => void) {
    if (this.exporting) return;
    this.finishDrag(false); this.finishTilt(); this.checkpoint(copyBoard(this.state)); action();
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
    try {
      const snapshot = capture(source.objects, source.angle);
      this.mutate(() => {
        const id = crypto.randomUUID(), offset = this.state.items.length * .16;
        this.state.items.push({ id, title: source.title, snapshot, x: offset, y: -offset, tilt: 0 }); this.state.selected = id;
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
    this.status.textContent = ''; this.refresh(); this.dialog.showModal();
    this.title.focus({ preventScroll: true }); this.dialog.scrollTop = 0; this.render();
  }
  private refresh() {
    this.launcher.textContent = `View board (${this.state.items.length}/${MAX_PIECES})${this.unsaved ? ' · unsaved' : ''}`;
    this.pieces.replaceChildren();
    for (const [i, item] of this.state.items.entries()) this.pieces.add(new Option(`${i+1}. ${item.title}`, item.id));
    if (!this.state.items.length) this.pieces.add(new Option('No pinned pieces yet', ''));
    this.pieces.value = this.state.selected ?? '';
    this.pieces.disabled = !this.state.items.length; this.tilt.disabled = !this.selected();
    this.tilt.value = String(this.selected()?.tilt ?? 0); this.background.value = this.state.background;
    this.selectedTools.forEach(b => b.disabled = !this.selected());
    this.undo.disabled = !this.history.length; this.download.disabled = !this.state.items.length;
    this.add.disabled = this.state.items.length >= MAX_PIECES || !this.source.length || this.source.value === '';
    this.add.textContent = this.state.items.length >= MAX_PIECES ? 'Board full · four pieces' : 'Pin current piece';
    this.storageStatus.textContent = this.saveWarning || 'Board saved on this device.';
    this.retry.hidden = !this.unsaved;
    if (this.unsaved && this.dialog.open) this.storageStatus.scrollIntoView({ block: 'nearest' });
  }
  private reconcile() {
    for (const [id, group] of this.groups) if (!this.state.items.some(i => i.id === id)) {
      group.userData.dispose(); group.removeFromParent(); this.groups.delete(id);
    }
    for (const item of this.state.items) if (!this.groups.has(item.id)) {
      const group = restore(item.snapshot); group.userData.boardId = item.id; this.groups.set(item.id, group); this.arrangement.add(group);
    }
    this.position(); this.renderer?.renderLists.dispose();
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
    item.x += clamp(b.min.x, b.max.x, WIDTH/2); item.y += clamp(b.min.y, b.max.y, HEIGHT/2); this.position();
  }
  private render() {
    if (!this.renderer || !this.dialog.open || this.exporting) return;
    const group = this.state.selected && this.groups.get(this.state.selected);
    this.selection.visible = !!group;
    if (group) { this.selection.box.setFromObject(group, true); this.selection.updateMatrixWorld(true); }
    const w = Math.max(1, Math.round(this.canvas.clientWidth * Math.min(devicePixelRatio, 2)));
    this.renderer.setSize(w, Math.round(w*HEIGHT/WIDTH), false); this.renderer.render(this.scene, this.camera);
  }

  private init() {
    if (this.renderer) return;
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, preserveDrawingBuffer: true });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping; this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true; this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.camera.position.set(0, 0, 8);
    this.scene.add(new THREE.HemisphereLight('#fff6ea', '#8f877a', 1.25));
    const key = new THREE.DirectionalLight('#fff3e2', 2.1); key.position.set(-2.6, 5.2, 5);
    key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.camera.near = .1; key.shadow.camera.far = 15;
    key.shadow.bias = -.0002; key.shadow.normalBias = .004;
    this.scene.add(key, this.arrangement);
    this.backing = new THREE.Mesh(new THREE.PlaneGeometry(WIDTH, HEIGHT), new THREE.MeshStandardMaterial({ roughness: 1 }));
    this.backing.position.z = -.15; this.backing.receiveShadow = true; this.scene.add(this.backing);
    this.setBackground();
  }
  private setBackground() {
    if (!this.backing) return;
    const c = document.createElement('canvas'); c.width = c.height = 256; const ctx = c.getContext('2d')!;
    ctx.fillStyle = BACKGROUNDS[this.background.value as Background]; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 3) {
      ctx.fillStyle = '#ffffff09'; ctx.fillRect(0, i, 256, 1);
      ctx.fillStyle = '#29231d0c'; ctx.fillRect(i, 0, 1, 256);
    }
    const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(4, 4*HEIGHT/WIDTH);
    this.backing.material.map?.dispose(); this.backing.material.map = texture; this.backing.material.needsUpdate = true;
  }

  private async exportPNG() {
    if (!this.renderer || this.exporting) return;
    this.finishDrag(true); this.finishTilt(); this.selection.visible = false; this.exporting = true;
    this.dialog.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('button,input,select').forEach(e => e.disabled = true);
    this.status.textContent = 'Preparing PNG…';
    try {
      this.renderer.setSize(BOARD_EXPORT_WIDTH, BOARD_EXPORT_HEIGHT, false); this.renderer.render(this.scene, this.camera);
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
    }
  }
}
