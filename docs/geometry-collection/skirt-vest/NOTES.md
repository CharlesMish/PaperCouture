# Wrap skirt and lapel vest choices

Accepted construction candidates for the geometry collection. These are source-level checks and Three.js study captures; the integration lead still owns the actual app controls and production-browser interaction pass.

## Implemented API and decision boundaries

```ts
export type WrapDirection = 'original' | 'opposite';
export type WaistbandFinish = 'double' | 'single';
export interface WrapSkirtOptions {
  wrap?: WrapDirection;
  band?: WaistbandFinish;
}
buildWrapSkirt(options: WrapSkirtOptions = {}): Construction;
export type VestLength = 'short' | 'longline';
buildLapelVest(length: VestLength = 'short'): Construction;
```

| Choice | Stable pending operation | Completed prefix | Actual change |
| --- | --- | --- | --- |
| Skirt wrap | `skirt-wrap-left` | 2 operations | Reflect the two asymmetric panel creases and moving-side points. Keep material coordinates unchanged. |
| Skirt waistband | `skirt-waist` | 7 operations | Two-turn current band, or one broader fold. |
| Vest length | `vest-shorten` | 6 operations | Current lower fold at y=-0.4, or longline lower fold at y=-0.78. |

The names `skirt-wrap-left` and `skirt-wrap-right` remain stable identifiers for first broad panel and second narrow panel, even when the opposite version folds the right panel first. Its captions correctly say right then left. The two symmetric prefix operations are byte-identical. The waist decision retains all preceding wrap operations for the chosen direction. Changing wrap later must rewind before its first panel fold; retaining the chosen band preference is safe, retaining completed band progress is not.

The original wrap with double band and the short vest preserve every authored instruction, crease, material facet, transform, stacking rank and tag against the captured pre-edit baseline. The focused test serializes signed zero consistently and ignores only engine-generated facet IDs.

## The waistband finding

The initial brief hypothesized that stopping after the first existing band fold would expose the reverse. It does not: the underlying backing swings to the top, so the visible band is **printed** in both finishes. Simply removing the last fold left the same 0.14-wide band and mostly changed height, so that first candidate was not retained.

The accepted single option instead moves its one crease to y=0.78. It makes a **0.22-wide printed band** (versus the current 0.14-wide compact band), with an eight-step construction. Its bottom lands at y=0.56, close to the old compact band's y=0.58. The clean broad strip is especially readable with Ivory, ink border: it reveals a dark printed border that the compact double turn tucks away. No texture edits or painted seam were added. Suggested choice labels are **Two turns · narrow** and **One turn · broad**; do not call the broad band a reverse accent.

Both versions retain the reverse triangle under the wrap. Changing wrap direction actually changes which material regions appear in the panels; it does not simply flip the final pattern picture.

## Geometry evidence

| Variant | Steps | Facets | Bounds, width × height | Worst sampled hinge gap |
| --- | ---: | ---: | --- | ---: |
| Original/opposite, double band | 9 | 16 | 1.64 × 1.27 | 0.0385 |
| Original/opposite, single broad band | 8 | 13 | 1.64 × 1.33 | 0.0341 or less |
| Short vest | 8 | 12 | 1.10 × 1.40 | 0.0165 |
| Longline vest | 8 | 12 | 1.10 × 1.78 | 0.0165 |

Skirt bottom stays -0.55. Its top is 0.72 for double, 0.78 for single; `meta.top` follows the real outline. Vest top stays 1; the two bottoms are -0.4 and -0.78. Longline keeps the shoulder width, continuous backing and improved small lapel creases exactly. All folds remain valleys with the existing explicit turn-over steps.

`node --import tsx scripts/check-skirt-vest.ts` passes:

- Exact default construction/rest-state parity against `baseline.json`.
- Shared prefixes at all three decision boundaries.
- Every opposite-wrap facet matches the reflected material region, reflected final model geometry, exposed face and stacking rank of its original counterpart.
- All six combinations retain area and rigid facets, valid connectivity and selected layers.
- Consecutive animation endpoints agree within 1e-9.
- Twenty-one samples per operation stay above the table; maximum hinge gaps remain inside the established 8 × `LAYER_GAP` threshold.
- Band face exposure and actual top/bottom metadata.

`npm run typecheck` also passed with the integrated work present at that point. No engine, renderer, paper or shared UI file was edited by this worker.

## Visual evidence

- `plain-facets.png`: front, oblique and back projections of actual engine polygons and layer levels, with two plain face colours. These are diagnostic renders, not screenshots of the app.
- `pattern-comparison.png`: all six candidates rendered using the real `SheetView` and `makePaperTextures`, on Ivory/ink border, Cut-paper mosaic and Reverse garden.
- `diagnostic-turns.png`: both wrap directions with the broad band at all four paper turns, front and back. Actual material labels retain their mapping; the reverse is not mirrored by editing its texture.
- `vest-angle-back.png`: quiet-paper oblique/back views, using the existing real lapel-edge highlight helper.
- `browser/manifest.json`: 38 source-study captures, with no browser console errors or page exceptions.

The broad band is clean, though its distinction is strongest on directional/bordered papers. Opposite wrap is clearly different on an asymmetric print. Longline is visibly taller at the same scale and retains broad panels, rather than turning into narrow hanging strips. The lapels remain understated on similar-toned paper, but no smaller or less connected than the accepted baseline.

`capture.mjs` runs an isolated Vite source harness in `study.html`, using project classes and existing external Playwright/Chromium tooling; it does not exercise the integrated application UI or the production build. It can be rerun from the repository root. `PLAYWRIGHT_MODULE` and `CHROMIUM_MODULE` override its environment defaults.

## Attachment recommendations for the lead

These account for the complete current pin and two-wing bow silhouette, not only anchor centres. The bow at existing 0.75 garment scale has x extent ±0.180975 and y extent ±0.130992. The pin has extent ±0.12 in both axes.

- Original skirt, left/centre/right: x = **-0.10, 0.13, 0.35**.
- Opposite skirt, left/centre/right as the player sees it: x = **-0.35, -0.13, 0.10**. This mirrors the geometry while keeping left/right labels honest.
- Skirt y = **0.57** for double, **0.63** for the single broad band.
- Existing skirt edge anchors (-0.15 and 0.40) permit slight bow overhang; the proposed inset points contain both accessories.
- Vest centre clasp (0, 0.50) and panel anchors (±0.29, 0.05) remain geometrically valid for both lengths. For longline, panel y=-0.14 is a more balanced body position.
- Existing vest lapel pins at (±0.26, 0.78) fit. A bow there slightly overhangs the shoulder; **(±0.22, 0.76)** contains both shapes. The lead can choose this shared anchor or make the small adjustment bow-specific.

These recommendations need the integrated attached-object visual check, especially the bow's relationship to the narrow waistband. No claim is made about a self-locking joint, a physical fold, a real phone or Safari.
