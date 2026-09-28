import * as THREE from 'three';

// The studio: renderer, a warm neutral table, soft directional light and a
// camera that frames a model-space box inside whatever part of the screen the
// interface leaves free.
//
// World axes are three.js defaults (y up). Paper lives in `modelRoot`, which
// maps model coordinates (x right, y toward the far edge, z up off the table)
// into the world by a -90 degree turn about x.

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const TABLE = '#c7c1b6';
const ROOM = '#b4ada2';

function tableTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = TABLE;
  ctx.fillRect(0, 0, 512, 512);
  // faint woven linen: fine horizontal and vertical threads
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 512; i += 2) {
    ctx.fillStyle = `rgba(255,255,255,${0.03 + rnd() * 0.04})`;
    ctx.fillRect(0, i, 512, 1);
    ctx.fillStyle = `rgba(60,48,36,${0.02 + rnd() * 0.035})`;
    ctx.fillRect(i, 0, 1, 512);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(10, 10);
  t.anisotropy = 8;
  return t;
}

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
  /** Paper and guides go in here, in model coordinates. */
  readonly modelRoot = new THREE.Group();
  readonly key: THREE.DirectionalLight;
  /** Light from behind the piece; main.ts fades it in for the display view. */
  readonly backLight: THREE.DirectionalLight;
  readonly table: THREE.Mesh;

  private insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene.background = new THREE.Color(ROOM);
    this.scene.fog = new THREE.Fog(ROOM, 9, 22);

    this.modelRoot.rotation.x = -Math.PI / 2;
    this.scene.add(this.modelRoot);

    this.scene.add(new THREE.HemisphereLight('#fff6ea', '#8f877a', 1.25));
    const key = new THREE.DirectionalLight('#fff3e2', 2.1);
    key.position.set(-2.6, 5.2, 3.4);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const s = key.shadow.camera;
    s.left = -2.2;
    s.right = 2.2;
    s.top = 2.2;
    s.bottom = -2.2;
    s.near = 1;
    s.far = 12;
    key.shadow.bias = -0.0002;
    key.shadow.normalBias = 0.004;
    key.shadow.radius = 3;
    this.scene.add(key);
    this.scene.add(key.target);
    this.key = key;

    const fill = new THREE.DirectionalLight('#dfe6f0', 0.35);
    fill.position.set(3, 2, -2);
    this.scene.add(fill);
    // soft light from behind and above: keeps the back of a displayed piece readable
    const backLight = new THREE.DirectionalLight('#f4efe6', 0);
    backLight.position.set(1.6, 2.6, -4.6);
    this.scene.add(backLight);
    this.backLight = backLight;

    this.table = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ map: tableTexture(), roughness: 0.95, metalness: 0 }),
    );
    this.table.rotation.x = -Math.PI / 2;
    this.table.receiveShadow = true;
    this.scene.add(this.table);
  }

  /** Screen space (CSS px) covered by interface; the view is centred in what is left. */
  setInsets(i: Insets): void {
    this.insets = i;
    this.applyPrincipalShift();
  }

  resize(): { w: number; h: number } {
    const canvas = this.renderer.domElement;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.applyPrincipalShift();
    return { w, h };
  }

  /**
   * Move the projection centre to the middle of the free area. Unlike panning
   * the camera, this keeps orbiting centred on the object.
   */
  private applyPrincipalShift(): void {
    const canvas = this.renderer.domElement;
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    const { top, right, bottom, left } = this.insets;
    const cx = left + (w - left - right) / 2;
    const cy = top + (h - top - bottom) / 2;
    const e = this.camera.projectionMatrix.elements;
    e[8] = -((cx / w) * 2 - 1);
    e[9] = -(1 - (cy / h) * 2);
    this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
  }

  /** Camera distance at which a box of half-extents (halfW, halfH), facing the camera, fits the free area. */
  fitDistance(halfW: number, halfH: number): number {
    const canvas = this.renderer.domElement;
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    const { top, right, bottom, left } = this.insets;
    const freeW = Math.max(80, w - left - right);
    const freeH = Math.max(80, h - top - bottom);
    const tan = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    return Math.max((halfH * h) / (freeH * tan), (halfW * w) / (freeW * tan * (w / h)));
  }

  /** Camera position looking at `center` from direction `dir` at the fitting distance. */
  framePose(center: THREE.Vector3, halfW: number, halfH: number, dir: THREE.Vector3): THREE.Vector3 {
    return center.clone().addScaledVector(dir.clone().normalize(), this.fitDistance(halfW, halfH));
  }

  placeCamera(position: THREE.Vector3, target: THREE.Vector3): void {
    this.camera.position.copy(position);
    this.camera.up.set(0, 1, 0);
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }
}
