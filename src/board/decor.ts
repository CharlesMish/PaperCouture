import * as THREE from 'three';

export type PinStyle = 'brass' | 'pearl' | 'red' | 'white' | 'black';

/** Decorative hardware only: its origin is the paper contact point, +z faces the viewer. */
export function makePin(style: PinStyle, radius: number): THREE.Group {
  const pin = new THREE.Group();
  pin.name = `Board pin · ${style}`;
  // Bound the depth independently of radius so a large preview pin does not
  // become a floating ornament. No geometry extends behind the contact plane.
  const r = THREE.MathUtils.clamp(Number.isFinite(radius) ? radius : .035, .012, .06);
  if (style === 'white' || style === 'black') return makeSlimPin(pin, style, r);
  const colors = { brass: '#b39659', pearl: '#e7dfcd', red: '#a84c43' } as const;
  const headMaterial = new THREE.MeshStandardMaterial({
    color: colors[style],
    metalness: style === 'brass' ? .62 : .05,
    roughness: style === 'pearl' ? .32 : .4,
  });
  const metalMaterial = new THREE.MeshStandardMaterial({ color: '#93877a', metalness: .65, roughness: .42 });
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(r * .45, r * .5, .004, 16), metalMaterial);
  collar.rotation.x = Math.PI / 2;
  collar.position.z = .002;
  pin.add(collar);

  const depth = Math.min(.024, r * .65);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r * .12, r * .12, depth, 10), metalMaterial);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = .004 + depth / 2;
  pin.add(shaft);

  const head = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), headMaterial);
  const headDepth = Math.min(r * .5, .018);
  head.scale.z = headDepth / r;
  head.position.set(-r * .07, r * .08, .004 + depth + headDepth);
  pin.add(head);
  for (const child of pin.children) {
    child.castShadow = true;
    child.receiveShadow = false;
  }
  pin.userData.decor = 'pin';
  pin.userData.style = style;
  pin.userData.radius = r;
  return pin;
}

/** Smaller, low-profile drawing-pin heads; the existing dome styles stay unchanged. */
function makeSlimPin(pin: THREE.Group, style: 'white' | 'black', radius: number): THREE.Group {
  const r = radius * .8;
  const headMaterial = new THREE.MeshStandardMaterial({
    color: style === 'white' ? '#f5f2ea' : '#34332f',
    metalness: .06,
    roughness: .43,
  });
  const metalMaterial = new THREE.MeshStandardMaterial({ color: '#888780', metalness: .65, roughness: .42 });
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(r * .34, r * .38, .002, 16), metalMaterial);
  collar.rotation.x = Math.PI / 2;
  collar.position.z = .001;
  pin.add(collar);

  const depth = Math.min(.006, r * .22);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r * .09, r * .09, depth, 10), metalMaterial);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = .002 + depth / 2;
  pin.add(shaft);

  const head = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), headMaterial);
  const headDepth = Math.min(.006, r * .16);
  head.scale.z = headDepth / r;
  head.position.z = .002 + depth + headDepth;
  pin.add(head);
  for (const child of pin.children) {
    child.castShadow = true;
    child.receiveShadow = false;
  }
  pin.userData.decor = 'pin';
  pin.userData.style = style;
  pin.userData.radius = r;
  return pin;
}

type Point = readonly [number, number];

/** A flat ribbon avoids platform-dependent WebGL line widths in preview and PNG. */
function stroke(points: readonly Point[], width: number, material: THREE.MeshBasicMaterial): THREE.Mesh {
  const positions: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1], [bx, by] = points[i];
    const length = Math.hypot(bx - ax, by - ay);
    if (length === 0) continue;
    const nx = -(by - ay) / length * width / 2, ny = (bx - ax) / length * width / 2;
    positions.push(ax + nx, ay + ny, 0, ax - nx, ay - ny, 0, bx + nx, by + ny, 0,
      bx + nx, by + ny, 0, ax - nx, ay - ny, 0, bx - nx, by - ny, 0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeBoundingSphere();
  return new THREE.Mesh(geometry, material);
}

function curve(points: readonly Point[]): Point[] {
  return new THREE.SplineCurve(points.map(([x, y]) => new THREE.Vector2(x, y)))
    .getPoints(Math.max(24, points.length * 8)).map(p => [p.x, p.y]);
}

/**
 * Optional, flat dressing references, not anatomical sizing or a fitted mannequin.
 * The caller places this group above the backing and below every paper piece;
 * visibility and inclusion in the export are the caller's choice.
 */
export function makeFigureGuides(count: 1 | 2, width: number, height: number, tone: 'light' | 'dark'): THREE.Group {
  const guides = new THREE.Group();
  guides.name = count === 1 ? 'One dressing guide' : 'Two dressing guides';
  // A subpixel outline was too faint against the cork grain on phone previews.
  // Light marks on slate need less weight than the dark natural/rose stencil.
  const strokeWidth = tone === 'light' ? .009 : .011;
  const material = new THREE.MeshBasicMaterial({
    color: tone === 'light' ? '#f4ede0' : '#655f53',
    transparent: true,
    opacity: tone === 'light' ? .42 : .50,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  // Keep the same clothing scale on both boards when space permits. Roomy adds
  // air around the figures instead of enlarging the suggested body dimensions.
  const safeWidth = Number.isFinite(width) && width > 0 ? width : 3.6;
  const safeHeight = Number.isFinite(height) && height > 0 ? height : 4.2;
  const scale = Math.min(1, (safeHeight - .6) / 3.28,
    (safeWidth - .36) / (count === 2 ? 3.52 : 1.72));
  const fittedScale = Math.max(.05, scale);
  const centerOffset = count === 2 ? Math.min(safeWidth * .235, 1.1) : 0;
  const centers = count === 1 ? [0] : [-centerOffset, centerOffset];
  const landmarks: { centerX: number; head: Point; shoulder: Point; waist: Point; feetY: number; scale: number }[] = [];

  for (const centerX of centers) {
    const figure = new THREE.Group();
    figure.position.x = centerX;
    figure.scale.setScalar(fittedScale);
    figure.name = 'Dressing outline';
    const line = (points: readonly Point[], smooth = true, weight = strokeWidth) => {
      figure.add(stroke(smooth ? curve(points) : points, weight, material));
    };

    // Quiet oval, open neck and shoulders. No face, fill, clothing or implied pose.
    const head: Point[] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = i / 64 * Math.PI * 2;
      head.push([Math.cos(angle) * .145, 1.41 + Math.sin(angle) * .19]);
    }
    line(head, false);
    for (const side of [-1, 1]) {
      const mirror = (points: readonly Point[]): Point[] => points.map(([x, y]) => [x * side, y]);
      // Neck into shoulder, relaxed arm, and a short open hand indication.
      line(mirror([[.10, 1.245], [.10, 1.11], [.34, 1.02], [.60, .93], [.68, .59], [.74, .24], [.79, -.18]]));
      line(mirror([[.79, -.18], [.805, -.27], [.76, -.32]]));
      line(mirror([[.67, -.20], [.65, .22], [.56, .58], [.48, .76]]));
      // Torso and leg outlines deliberately remain thin under the pinned paper.
      line(mirror([[.48, .76], [.41, .38], [.30, -.14], [.40, -.48], [.34, -.86], [.29, -1.47]]));
      line(mirror([[0, -.57], [.14, -.90], [.17, -1.46]]));
      line(mirror([[.17, -1.46], [.16, -1.58], [.36, -1.58], [.42, -1.54], [.29, -1.47]]));
    }
    // A faint waist registration mark gives a useful stacking reference without
    // painting a solid torso or forcing garments to follow a predefined shape.
    line([[-.30, -.14], [-.15, -.14]], false, strokeWidth * 5 / 7);
    line([[.15, -.14], [.30, -.14]], false, strokeWidth * 5 / 7);
    guides.add(figure);
    landmarks.push({
      centerX,
      head: [centerX, 1.41 * fittedScale],
      shoulder: [centerX, .93 * fittedScale],
      waist: [centerX, -.14 * fittedScale],
      feetY: -1.58 * fittedScale,
      scale: fittedScale,
    });
  }
  guides.userData.decor = 'figure-guides';
  guides.userData.landmarks = landmarks;
  return guides;
}

/** Frees resources owned by makePin/makeFigureGuides, including shared materials once. */
export function disposeDecor(group: THREE.Group): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  group.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    geometries.add(object.geometry);
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material);
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  group.removeFromParent();
  group.clear();
}
