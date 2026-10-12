// Renders an unregistered study construction with the app's own Stage,
// SheetView and paper textures. ?design=&paper=&turn=&view=&step=&progress=
import * as THREE from 'three';
import { Stage } from '../../../src/render/stage';
import { SheetView } from '../../../src/render/sheetView';
import { makePaperTextures } from '../../../src/render/textures';
import { findPaper } from '../../../src/papers';
import { buildTimeline, evaluateFrame } from '../../../src/fold/timeline';
import type { Construction } from '../../../src/fold/construction';
import { STUDIES } from './studies';

const p = new URLSearchParams(location.search);
const design = p.get('design') || 'mitten-left';
const c: Construction = STUDIES[design]();
const stage = new Stage(document.querySelector('canvas')!); stage.resize();
const fm = new THREE.MeshStandardMaterial({ roughness: .9 }), bm = fm.clone();
const paper = findPaper(p.get('paper'));
const textures = makePaperTextures(paper, Number(p.get('turn') || 0), stage.renderer.capabilities.getMaxAnisotropy());
fm.map = textures.front; bm.map = textures.back;
const sheet = new SheetView(fm, bm), tl = buildTimeline(c.ops);
const step = p.has('step') ? Number(p.get('step')) : tl.ops.length - 1;
const op = tl.ops[step]; sheet.setAnim(op);
sheet.pose(evaluateFrame(op, p.has('progress') ? Number(p.get('progress')) : 1));
stage.modelRoot.add(sheet.group);
const upright = p.get('view') !== 'table';
if (upright) { stage.modelRoot.rotation.x = 0; stage.modelRoot.position.y = 1.05; stage.backLight.intensity = .8; }
const angle = p.get('view') === 'back' ? Math.PI : p.get('view') === 'angle' ? .24 * Math.PI : 0;
const target = new THREE.Vector3(0, upright ? 1.05 : 0, 0), d = stage.fitDistance(1.15, 1.15);
const eye = upright ? new THREE.Vector3(Math.sin(angle) * d, .12 * d, Math.cos(angle) * d) : new THREE.Vector3(0, d, .001);
stage.placeCamera(target.clone().add(eye), target);
document.getElementById('label')!.textContent = `${c.name} · ${paper.name} · ${upright ? (p.get('view') || 'front') : `step ${step + 1}/${tl.ops.length}`}`;
stage.render(); (window as any).studyReady = true;
