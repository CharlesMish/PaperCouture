# Dress sleeves and jacket length

Construction worker pass, 2026-09-30 UTC. Built on played source `305f8efa176cf4e9b2b49e585e78100496f0f9ff` (local snapshot `a833d52`). No engine, paper, UI, registry or attachment code changed in this work package.

## Accepted options

- Dress: Classic 45°, Lifted 30°, Dropped 65° sleeve slope. All three work with Straight, Classic A-line and Wide flare, for nine supported constructions.
- Lifted sleeves extend outward and leave a wider triangular underside. The 20° probe was valid but its underside reached too far down the Straight body; 25° still felt broad. 30° keeps an obvious change with a tidier underarm. Dropped sleeves keep a much closer upper outline. This is a flat paper outline, not a volume intended to fit a person.
- Jacket: Cropped retains the exact existing hem at y=-0.32; Longer uses y=-0.6. Height grows from 1.140 to 1.420 sheet units at the same 1.676 width (original square side = 2). Probes at -0.48 were less distinct; -0.7 began looking overly elongated. The long version has tiny retained-paper side ledges above the hem, visible close up; these are folded underlap edges, not cuts or detached pieces.
- Every original default state matches its recorded geometry hash, including material polygons, transforms, stack ranks and tags. Hashes omit globally allocated facet IDs. The fixture was generated from the unmodified files in local `a833d52`, before validating changed builders.

## Integration contract

```ts
// src/fold/silhouettes.ts
export type SleeveId = 'classic' | 'lifted' | 'dropped';
export const SLEEVES: { id: SleeveId; name: string; droop: number; hint: string }[];
buildSilhouette(shape: SilhouetteId, sleeve: SleeveId = 'classic');

// src/fold/jacket.ts
export type JacketLength = 'cropped' | 'longer';
export const JACKET_LENGTHS: { id: JacketLength; name: string; hem: number; hint: string }[];
buildJacket(length: JacketLength = 'cropped');
```

Dress sleeve decision: operation ID `sleeves`, currently index 3. Earlier ops 0–2 and resting states 0–3 are exactly shared for a given silhouette. It is safe to change sleeve preference while settled before that operation; preserve the chosen side folds. A side-fold change still goes back to `sides`, index 2. All constructions still have six steps and the same real moving hem points.

Jacket length decision: operation ID `jacket-hem`, currently index 4. Earlier ops 0–3 and resting states 0–4 are exactly shared. Both options retain six steps. UI should use operation IDs, not adopt these indices as a permanent contract.

No new sleeve attachment point is proposed. Existing dress chest/waist positions remain on the unchanged central body. Jacket attachment layout should be derived from its new bottom extent; a waist anchor should move with the hem rather than retain the cropped placement. Root integration owns full accessory footprint and placement checks.

## Evidence

`node --import tsx scripts/check-dress-jacket.ts --dump` passed all 11 constructions:

- resting-state retained area, rigidity, connectivity and layer ordering;
- exact endpoints between successive fold operations;
- 21 sampled poses per operation, finite coordinates, no below-table vertices;
- maximum hinge gaps: 0.0165 for all nine dresses, 0.0330 cropped jacket, 0.0220 longer jacket (existing limit 0.0440);
- exact default-state fingerprints and identical completed geometry before each decision;
- unchanged side-choice prefix and moving dress hem material.

`npm run typecheck` also passed during this worker pass.

The six PNG comparison sheets use the actual production `SheetView`, `evaluateFrame` and procedural paper textures in headless Chromium. They show front, angle and back on contrasting plain paper; Mosaic fronts; Reverse garden backs; and halfway poses for the sleeve or jacket-hem operation. Same model-space scale in every tile. These are isolated construction-study renders, not screenshots claiming the new choices were already wired into the app. No page or console errors were reported. I visually inspected these sheets; Lifted and Dropped remain clearly distinct across all three side-fold options, and the longer jacket remains visibly broader/shorter than the dresses.

Rerun capture with `node docs/geometry-collection/dress-jacket/capture.cjs`; set `PLAYWRIGHT_MODULE` / `CHROMIUM_MODULE` to installed browser tools when running outside this workspace. `study.html` may also be opened through Vite, e.g. `/docs/geometry-collection/dress-jacket/study.html?view=angle&paper=cut-paper-mosaic`.

No physical folding, real-phone/Safari test or finished shared-interface audit was performed by this worker. Sampled geometric checks do not prove continuous collision-free physical foldability. The integration lead handles decisions/revisit, tiny-handle interaction, accessories and production-browser validation.
