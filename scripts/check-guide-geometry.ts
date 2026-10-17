import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as THREE from 'three';
import { disposeDecor, makeFigureGuides, setFigureGuideStrokeScale } from '../src/board/decor';
import { BOARD_MARGIN } from '../src/board/layout';
import { BoardState, defaultAppearance, emptyBoard, GuideId } from '../src/board/model';
import { BoardDecor } from '../src/board/presentation';

// Frozen from 6284b4e: preserve the original 100% guide, not just its silhouette.
const hashes = {
  dark: '597bd0da746474a22c20d4ab8dd2cb549463cff1783241978968d65a9732d138',
  light: 'c9be068b06c15b294834c80141c60c315983f42260a985f5f18f87c5bb2e48ff',
};
let sections = 0, boundsCases = 0, worstWidthError = 0;
for (const [width, height] of [[3.6, 4.2], [4.8, 5.6]]) for (const count of [1, 2] as const)
  for (const tone of ['dark', 'light'] as const) {
    const figures = makeFigureGuides(count, width, height, tone);
    const figure = figures.children[0], fittedScale = figure.scale.x;
    const meshes = figure.children as THREE.Mesh<THREE.BufferGeometry>[];
    const originals = meshes.map(mesh => ({ geometry: mesh.geometry, attribute: mesh.geometry.getAttribute('position'),
      values: new Float32Array(mesh.geometry.getAttribute('position').array) }));
    const hash = () => {
      const h = createHash('sha256');
      for (const mesh of meshes) h.update(Buffer.from(mesh.geometry.getAttribute('position').array.buffer));
      return h.digest('hex');
    };
    assert.equal(hash(), hashes[tone]);
    for (const scale of [.5, .75, 1.25, 1.5, 1]) {
      setFigureGuideStrokeScale(figure, scale); figure.scale.setScalar(fittedScale*scale);
      figure.updateWorldMatrix(true, true);
      for (const [index, mesh] of meshes.entries()) {
        const before = originals[index], positions = mesh.geometry.getAttribute('position');
        assert.equal(mesh.geometry, before.geometry); assert.equal(positions, before.attribute);
        for (let vertex = 0; vertex < positions.count; vertex += 6) {
          // The first two vertices are opposite sides of the actual ribbon.
          const a = new THREE.Vector3().fromBufferAttribute(positions, vertex).applyMatrix4(mesh.matrixWorld);
          const b = new THREE.Vector3().fromBufferAttribute(positions, vertex+1).applyMatrix4(mesh.matrixWorld);
          const i = vertex*3;
          const originalWidth = Math.hypot(before.values[i]-before.values[i+3], before.values[i+1]-before.values[i+4])*fittedScale;
          const error = Math.abs(a.distanceTo(b)-originalWidth);
          worstWidthError = Math.max(worstWidthError, error); sections++;
          assert.ok(error < 3e-7, `Ribbon width changed at ${scale*100}% by ${error}`);
        }
      }
    }
    assert.equal(hash(), hashes[tone], '100% size round trip restores the exact original positions');
    disposeDecor(figures);

    const decor = new BoardDecor(), groups = new Map<string, THREE.Group>();
    const state: BoardState = { ...emptyBoard(), appearance: { ...defaultAppearance(),
      surface: tone === 'dark' ? 'natural' : 'slate', pins: 'none', guide: count === 1 ? 'one' : 'two' } };
    const ids: GuideId[] = count === 1 ? ['one'] : ['left', 'right'];
    for (const scale of [.5, .75, 1, 1.25, 1.5]) for (const x of [-4, 0, 4]) for (const y of [-4, 0, 4]) {
      state.appearance!.guideTransforms = Object.fromEntries(ids.map(id => [id, { x, y, scale }]));
      const saved = JSON.stringify(state);
      decor.sync(state, groups, width, height, false);
      assert.equal(JSON.stringify(state), saved, 'Fitting must not rewrite the saved pose');
      for (const id of ids) {
        const info = decor.guideInfo(id)!;
        const actual = new THREE.Box3().setFromObject(info.object, true);
        assert.ok(actual.min.x >= -width/2+BOARD_MARGIN-1e-10 && actual.max.x <= width/2-BOARD_MARGIN+1e-10);
        assert.ok(actual.min.y >= -height/2+BOARD_MARGIN-1e-10 && actual.max.y <= height/2-BOARD_MARGIN+1e-10);
        boundsCases++;
      }
    }
    const mesh = decor.guideInfo(ids[0])!.object.children[0] as THREE.Mesh;
    const position = mesh.geometry.getAttribute('position') as THREE.BufferAttribute, version = position.version;
    state.appearance!.guideTransforms![ids[0]]!.x = .1;
    decor.sync(state, groups, width, height, false);
    assert.equal(position.version, version, 'Movement reuses unchanged stroke buffers');
    disposeDecor(decor.root);
  }
console.log(`Guide ribbons: ${sections} actual cross-sections retain fitted width (worst error ${worstWidthError}); ${boundsCases} constrained poses fit both boards; exact 6284b4e default buffers and reusable geometry pass.`);
