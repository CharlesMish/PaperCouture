// Projected coverage of complete accessory polygons on every supported garment.
// node --import tsx scripts/check-attachments.ts
// --report prints all failures without throwing, for a bounded placement audit.
import assert from 'node:assert/strict';
import { buildGarment, GARMENTS, attachmentAnchors, attachmentSize, GarmentId, AttachmentAnchor } from '../src/fold/garments';
import { DEFAULT_OPTIONS, GarmentOptions, garmentDecisions, selectOption } from '../src/fold/garmentOptions';
import { buildPin } from '../src/fold/pin';
import { buildBowWing } from '../src/fold/bow';
import { buildTimeline } from '../src/fold/timeline';
import { modelPoly } from '../src/fold/engine';
import { Vec2, signedArea, splitConvex } from '../src/fold/geometry';

const ccw = (poly: Vec2[]) => signedArea(poly) < 0 ? poly.slice().reverse() : poly;
// Subtract one convex garment facet. The returned pieces partition the part of
// subject outside clip. Repeating for all real garment facets subtracts their
// full union, so this catches an accessory crossing an opening between vertices.
function outsideConvex(subject: Vec2[], clip: Vec2[]): Vec2[][] {
  const outside: Vec2[][] = [];
  let remainder: Vec2[] | null = subject;
  for (let i = 0; i < clip.length && remainder; i++) {
    const a = clip[i], b = clip[(i + 1) % clip.length];
    const split = splitConvex(remainder, p => (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x));
    if (split.neg) outside.push(split.neg);
    remainder = split.pos;
  }
  return outside;
}
const geometry = (id: 'pin' | 'bow') => buildTimeline((id === 'pin' ? buildPin() : buildBowWing()).ops).states.at(-1)!.facets.map(modelPoly);
const components = { pin: geometry('pin'), bow: geometry('bow') };
function coverage(garment: Vec2[][], anchor: Pick<AttachmentAnchor, 'x' | 'y'>, size: number, accessory: 'pin' | 'bow') {
  const transforms = accessory === 'pin' ? [{ angle: 0, offset: 0, scale: .16 * size }]
    : [{ angle: -Math.PI / 4, offset: -1.27, scale: .19 * size }, { angle: 3 * Math.PI / 4, offset: 1.27, scale: .19 * size }];
  let uncoveredArea = 0, materialArea = 0;
  for (const tr of transforms) for (const poly of components[accessory]) {
    const footprint = ccw(poly.map(p => ({
      x: anchor.x + (p.x * Math.cos(tr.angle) - p.y * Math.sin(tr.angle) + tr.offset) * tr.scale,
      y: anchor.y + (p.x * Math.sin(tr.angle) + p.y * Math.cos(tr.angle)) * tr.scale,
    })));
    materialArea += Math.abs(signedArea(footprint));
    let remaining = [footprint];
    for (const facet of garment) remaining = remaining.flatMap(part => outsideConvex(part, facet));
    uncoveredArea += remaining.reduce((sum, part) => sum + Math.abs(signedArea(part)), 0);
  }
  return { uncoveredArea, materialArea, uncoveredFraction: uncoveredArea / materialArea };
}
function combinations(id: GarmentId) {
  let list = [{ ...DEFAULT_OPTIONS }];
  for (const decision of garmentDecisions(id)) list = list.flatMap(options => decision.choices.map(choice => selectOption(options, decision, choice.id)));
  return list;
}
function label(id: GarmentId, options: GarmentOptions) {
  return [id, ...garmentDecisions(id).map(d => `${d.id}=${options[d.id]}`)].join('/');
}
const failures: { garment: string; inheritedGeometry: boolean; anchor: string; accessory: string; x: number; y: number; uncoveredArea: number; uncoveredFraction: number; proposed?: { x: number; y: number; distance: number } }[] = [];
let checked = 0;
for (const garment of GARMENTS) for (const options of combinations(garment.id)) {
  const c = buildGarment(garment.id, options);
  const polygons = buildTimeline(c.ops).states.at(-1)!.facets.map(modelPoly).map(ccw);
  const points = polygons.flat(), top = Math.max(...points.map(p => p.y)), bottom = Math.min(...points.map(p => p.y));
  const size = attachmentSize(garment.id);
  for (const anchor of attachmentAnchors(garment.id, top, bottom, options)) for (const accessory of ['pin', 'bow'] as const) {
    checked++;
    const result = coverage(polygons, anchor, size, accessory);
    if (result.uncoveredArea > 1e-10) {
      const inheritedGeometry = garment.id !== 'pleats' && garmentDecisions(garment.id).every(d => d.id === 'silhouette' || options[d.id] === DEFAULT_OPTIONS[d.id]);
      const failure: typeof failures[number] = { garment: label(garment.id, options), inheritedGeometry, anchor: anchor.id, accessory, x: anchor.x, y: anchor.y, uncoveredArea: result.uncoveredArea, uncoveredFraction: result.uncoveredFraction };
      // Report-only search suggests the smallest local shift that accommodates
      // BOTH accessory types. It never rewrites positions or relaxes assertions.
      if (process.argv.includes('--report')) {
        const candidates = [];
        for (let dx = -30; dx <= 30; dx++) for (let dy = -30; dy <= 30; dy++) {
          const point = { x: anchor.x + dx * .005, y: anchor.y + dy * .005, distance: Math.hypot(dx, dy) * .005 };
          if (point.distance <= .150001) candidates.push(point);
        }
        candidates.sort((a, b) => a.distance - b.distance);
        failure.proposed = candidates.find(candidate => coverage(polygons, candidate, size, 'pin').uncoveredArea < 1e-10 && coverage(polygons, candidate, size, 'bow').uncoveredArea < 1e-10);
      }
      failures.push(failure);
    }
  }
}
if (failures.length) console.log(JSON.stringify({ checked, failures }, null, 2));
if (!process.argv.includes('--report')) assert.equal(failures.length, 0, `${failures.length} complete accessory footprints extend beyond retained garment paper`);
console.log(`Attachment footprint audit: ${checked} placements; ${failures.length} outside retained paper. Complete convex-polygon subtraction; not an anchor/vertex-only check.`);
