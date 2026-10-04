import * as THREE from 'three';

const WIDTH = 3.6, HEIGHT = 2.7, MARGIN = .08;
const BACKGROUNDS = { Linen: '#d3c8b5', Rose: '#c4a09f', Slate: '#59646a' };
type Background = keyof typeof BACKGROUNDS;

/** Own the snapshot's GPU resources. Never dispose or re-pose the live garment. */
function snapshot(objects: THREE.Object3D[]): THREE.Group {
  const root = new THREE.Group();
  const geometries = new Map<THREE.BufferGeometry, THREE.BufferGeometry>();
  const materials = new Map<THREE.Material, THREE.Material>();
  const textures = new Map<THREE.Texture, THREE.Texture>();
  const copyMaterial = (source: THREE.Material) => {
    let m = materials.get(source);
    if (!m) {
      m = source.clone(); materials.set(source, m);
      if ('map' in m && m.map instanceof THREE.Texture) {
        const t = m.map;
        if (!textures.has(t)) { const copy = t.clone(); copy.needsUpdate = true; textures.set(t, copy); }
        m.map = textures.get(t)!;
      }
    }
    return m;
  };
  const copy = (source: THREE.Object3D): THREE.Object3D => {
    const o = source.clone(false);
    if (o instanceof THREE.Mesh || o instanceof THREE.Line) {
      const g = o.geometry;
      if (!geometries.has(g)) geometries.set(g, g.clone());
      o.geometry = geometries.get(g)!;
      o.material = Array.isArray(o.material) ? o.material.map(copyMaterial) : copyMaterial(o.material);
    }
    for (const child of source.children) if (child.visible) o.add(copy(child));
    return o;
  };
  for (const o of objects) if (o.visible) root.add(copy(o));
  root.userData.dispose = () => {
    geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
  };
  return root;
}

export class Pinboard {
  readonly dialog = document.createElement('dialog');
  readonly canvas = document.createElement('canvas');
  readonly arrangement = new THREE.Group();
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-WIDTH/2, WIDTH/2, HEIGHT/2, -HEIGHT/2, .1, 20);
  private renderer?: THREE.WebGLRenderer;
  private piece?: THREE.Group;
  private backing?: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;
  private tilt = document.createElement('input');
  private background = document.createElement('select');
  private title = document.createElement('h2');
  private status = document.createElement('p');
  private download = document.createElement('button');
  private closeButton: HTMLButtonElement;
  private exporting = false;
  private drag?: { id: number; x: number; y: number; start: THREE.Vector3 };
  private filename = 'paper-couture-pinboard.png';

  constructor(parent: HTMLElement) {
    this.dialog.className = 'editor-dialog pinboard-dialog';
    this.title.id = 'pinboard-title'; this.title.tabIndex = -1; this.dialog.setAttribute('aria-labelledby', this.title.id);
    this.canvas.className = 'pinboard-canvas'; this.canvas.tabIndex = 0;
    this.canvas.setAttribute('aria-label', 'Pinboard front view. Drag the folded piece or use the move buttons.');
    const left = document.createElement('div'); left.className = 'board-preview'; left.append(this.canvas);
    const tools = document.createElement('div'); tools.className = 'board-tools';
    const hint = document.createElement('p'); hint.textContent = 'Your current folded piece, from the front, with any attached accessory. Drag to arrange it. The workshop keeps your folds.';
    const bg = document.createElement('label'); bg.textContent = 'Background';
    this.background.setAttribute('aria-label', 'Pinboard background');
    for (const name of Object.keys(BACKGROUNDS)) this.background.add(new Option(name, name));
    bg.append(this.background);
    this.background.addEventListener('change', () => { this.setBackground(); this.render(); });
    const angle = document.createElement('label'); angle.textContent = 'Tilt';
    this.tilt.type = 'range'; this.tilt.min = '-12'; this.tilt.max = '12'; this.tilt.step = '1'; this.tilt.value = '0';
    this.tilt.setAttribute('aria-label', 'Pinboard tilt'); angle.append(this.tilt);
    this.tilt.addEventListener('input', () => { this.arrangement.rotation.z = -Number(this.tilt.value) * Math.PI / 180; this.constrain(); this.render(); });
    const nudges = document.createElement('div'); nudges.className = 'editor-actions';
    for (const [label, x, y] of [['Move left', -1, 0], ['Move right', 1, 0], ['Move up', 0, 1], ['Move down', 0, -1]] as const)
      nudges.append(this.button(label, () => this.nudge(x, y)));
    const reset = this.button('Reset arrangement', () => this.reset());
    this.download.className = 'btn btn-primary'; this.download.textContent = 'Save PNG';
    this.download.addEventListener('click', () => { void this.exportPNG(); });
    this.closeButton = this.button('Return to piece', () => this.dialog.close());
    const note = document.createElement('p'); note.className = 'editor-readout';
    note.textContent = 'PNG · 1600 × 1200 · includes the selected background; no transparency. Arrangement lasts until you close the pinboard.';
    this.status.setAttribute('role', 'status'); this.status.className = 'editor-readout';
    tools.append(hint, bg, angle, nudges, reset, this.download, this.closeButton, note, this.status);
    const body = document.createElement('div'); body.className = 'board-body'; body.append(left, tools);
    this.dialog.append(this.title, body); parent.append(this.dialog);
    this.dialog.addEventListener('cancel', e => { if (this.exporting) e.preventDefault(); });
    this.dialog.addEventListener('close', () => {
      this.finishDrag(); this.piece?.userData.dispose(); this.piece?.removeFromParent(); this.piece = undefined;
      this.renderer?.renderLists.dispose();
    });
    new ResizeObserver(() => { if (this.dialog.open && !this.exporting) this.render(); }).observe(this.canvas);
    this.canvas.addEventListener('pointerdown', e => {
      if (this.exporting || this.drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
      this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, start: this.arrangement.position.clone() };
      this.canvas.setPointerCapture(e.pointerId); e.preventDefault();
    });
    this.canvas.addEventListener('pointermove', e => {
      const d = this.drag; if (!d || e.pointerId !== d.id) return;
      const r = this.canvas.getBoundingClientRect();
      this.arrangement.position.set(d.start.x + (e.clientX - d.x) / r.width * WIDTH,
        d.start.y - (e.clientY - d.y) / r.height * HEIGHT, 0);
      this.constrain(); this.render();
    });
    this.canvas.addEventListener('pointerup', () => this.finishDrag());
    this.canvas.addEventListener('pointercancel', () => {
      if (this.drag) this.arrangement.position.copy(this.drag.start);
      this.finishDrag(); this.render();
    });
    this.canvas.addEventListener('keydown', e => {
      const d: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] };
      if (d[e.key]) { e.preventDefault(); this.nudge(...d[e.key]); }
    });
  }

  private button(label: string, action: () => void) {
    const b = document.createElement('button'); b.className = 'btn btn-quiet'; b.textContent = label;
    b.addEventListener('click', action); return b;
  }
  private finishDrag() {
    if (this.drag && this.canvas.hasPointerCapture(this.drag.id)) this.canvas.releasePointerCapture(this.drag.id);
    this.drag = undefined;
  }
  private nudge(x: number, y: number) {
    if (this.exporting) return;
    this.arrangement.position.x += x * .08; this.arrangement.position.y += y * .08;
    this.constrain(); this.render();
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
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(4, 3);
    this.backing.material.map?.dispose(); this.backing.material.map = texture; this.backing.material.needsUpdate = true;
  }

  open(objects: THREE.Object3D[], angle: number, title: string, id: string): void {
    if (this.dialog.open) return;
    this.init();
    this.piece = snapshot(objects); this.piece.rotation.z = angle;
    // Compute from the live posed vertices, never from a saved sample outfit.
    this.piece.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(this.piece, true), center = box.getCenter(new THREE.Vector3());
    this.piece.position.sub(center); this.arrangement.add(this.piece);
    this.title.textContent = `Pinboard · ${title}`; this.filename = `paper-couture-${id}-pinboard.png`;
    this.status.textContent = ''; this.dialog.showModal();
    this.title.focus({ preventScroll: true }); this.dialog.scrollTop = 0;
    this.reset();
  }
  private reset() {
    this.arrangement.position.set(0, 0, 0); this.arrangement.rotation.z = 0; this.tilt.value = '0';
    this.constrain(); this.render();
  }
  private constrain() {
    if (!this.piece) return;
    this.arrangement.updateMatrixWorld(true);
    const b = new THREE.Box3().setFromObject(this.arrangement, true);
    const clampAxis = (lo: number, hi: number, extent: number) => {
      if (hi - lo > 2 * (extent - MARGIN)) return -(lo + hi) / 2;
      return Math.max(-extent + MARGIN - lo, Math.min(extent - MARGIN - hi, 0));
    };
    this.arrangement.position.x += clampAxis(b.min.x, b.max.x, WIDTH/2);
    this.arrangement.position.y += clampAxis(b.min.y, b.max.y, HEIGHT/2);
  }
  private render() {
    if (!this.renderer || !this.dialog.open || this.exporting) return;
    const w = Math.max(1, Math.round(this.canvas.clientWidth * Math.min(devicePixelRatio, 2)));
    this.renderer.setSize(w, Math.round(w * 3 / 4), false);
    this.renderer.render(this.scene, this.camera);
  }
  private async exportPNG() {
    if (!this.renderer || this.exporting) return;
    this.finishDrag(); this.exporting = true;
    this.dialog.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('button,input,select').forEach(e => e.disabled = true);
    this.status.textContent = 'Preparing PNG…';
    try {
      this.renderer.setSize(1600, 1200, false); this.renderer.render(this.scene, this.camera);
      const blob = await new Promise<Blob>((resolve, reject) => this.canvas.toBlob(b => b ? resolve(b) : reject(new Error('PNG unavailable')), 'image/png'));
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = this.filename; link.hidden = true;
      this.dialog.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      this.status.textContent = 'PNG ready. Your browser handles the download.';
    } catch {
      this.status.textContent = 'The PNG could not be prepared. Try Save PNG again.';
    } finally {
      this.exporting = false;
      this.dialog.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('button,input,select').forEach(e => e.disabled = false);
      this.render();
    }
  }
}
