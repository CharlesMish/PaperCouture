# Pleated skirt construction study

## Recommendation

Accept for integration. The skirt has a broad printed centre, two real returned
pleat faces, narrow reverse-paper channels and a reverse-colour waistband. The
front is symmetric and slightly flared, unlike the existing asymmetric wrap skirt.
The pleats move separately from the centre during their return fold. Their
boundaries, layer shadows and print discontinuities come from material geometry,
not painted seam lines or inflated cloth. No renderer or engine changes were made.

The pleats are restrained when folded flat. They are easiest to read on the
plain contrasting paper and at the Angle view. Busy artwork can compete with their
boundaries, as expected for a flat paper model. This is a two-pleat study, not a
full accordion fan or an assertion of traditional/physically certified origami.

## Construction and API

`src/fold/pleatedSkirt.ts` exports `buildPleatedSkirt(): Construction`.

| Step / stable op ID | Action |
| --- | --- |
| 1 `pleats-in` | Both slanted side panels lift inward. |
| 2 `pleats-return` | Only the free inner edges return outward, forming the pleats. |
| 3 `pleats-hem-back` | Explicit turn-over exposes the back. |
| 4 `pleats-length` | Lower panel lifts up to establish the hem. |
| 5 `pleats-hem-corners` | Two projecting hem corners fold inward on the visible back. |
| 6 `pleats-front` | Explicit turn-over returns to the front. |
| 7 `pleats-waist` | Top strip folds downward into the reverse-colour band. |

Every fold is a visible valley fold. Grouped pairs act on disjoint material.
The return operation selects `pleat-left` and `pleat-right`; the hem-corner
operation selects the already lifted `pleats-length` panel.

Useful semantic tags: `pleat-return-left`, `pleat-return-right`. The existing
renderer is sufficient; no additional edge overlay is requested.

Suggested attachment positions, in final model coordinates: x = -0.34, 0, +0.34;
y = 0.635. Labels can be Left waistband / Centre waistband / Right waistband.
Suggested accessory size is 0.75, matching the existing skirt. Exact projected-polygon subtraction verifies the full existing pin and assembled
bow footprints are supported at all three positions, including polygon interiors.
These lowered anchors replace the preliminary y=0.67 suggestion, where the
accessories overhung the top edge slightly. Integrated styling still needs its
usual visual check.

## Refinement made during study

An initial length-first construction broke the reverse channels near the hem.
Moving the shortening fold to the back after making the pleats preserved those
channels but left two small projecting ears on a flared version. The deliberate
repair was one back-side corner-fold operation, using the actual side crease
lines and only the hem panel. It removes both ears without cuts, hidden material,
changed original-square coordinates or an engine exception. The final outline is
straight along the hem. The projected-facet parameter probe in `probe.png` compares
vertical, flared and mildly flared constructions; the middle flared study was
selected. There are no extra shape choices in this candidate.

## Checks actually run

- `node --import tsx scripts/check-pleats.ts --dump`: pass.
- `npm run typecheck`: pass against the shared workspace at study completion.
- Resting states preserve all four square units of material, rigid transforms,
  connected material edges and closed interior edges.
- Every operation boundary was compared by retained material points: no jump.
- Animation sampled at 41 progress values per operation: no point below the
  table; worst sampled hinge gap 0.0275, below the existing 0.044 limit.
- Final front samples verify both returned printed faces, central printed panel,
  two exposed reverse channels and the reverse waistband.
- Full existing pin and assembled two-wing bow footprints at all three anchors:
  zero area outside the union of actual garment facets.
- Final: 7 steps; 19 facets; 1.440 wide × 1.380 tall; top 0.780;
  bottom -0.600; maximum layer stack 0.0565; lowest sampled z 0.0015.
- Headless Chromium rendered the actual `Stage`, `SheetView`, texture creation
  and timeline through the isolated study page. Front, Angle and Back were
  captured for plain contrasting faces, Cut-paper mosaic and Ivory/ink border.
  No page exceptions in the completed capture run.
- The same study renderer captured the existing wrap skirt and dress on the
  same plain paper. Comparison shows a distinct pleat construction and outline.

## Evidence

- [Normal-size comparison sheet](contact-sheet.jpg)
- [Existing-garment comparison](garment-comparison.jpg)
- [Plain front](pleats-contrast-front.png)
- [Plain angle](pleats-contrast-angle.png)
- [Plain back](pleats-contrast-back.png)
- [Return fold halfway through](return-mid-fold.png)
- [Metrics](metrics.json)

`preview.html` and `preview.ts` are isolated study tools, not application entries.
`capture.cjs` is rerunnable from the repository root with Playwright available;
`PLAYWRIGHT_MODULE` and `CHROMIUM_MODULE` can point to external tooling, like the
existing browser-check scripts. `scripts/check-pleats.ts --dump` recreates metrics
and exact material-state evidence. `probe.ts` retains the bounded parameter probe.

## Not yet checked here

The shared application picker, controller buttons/handles, accessory placement,
paper rotation and responsive layout are integration responsibilities; this study
page did not simulate an end-user application run. No real phone, Safari or
physical-paper session was performed. Geometry checks do not prove continuous
collision-free or physical-paper foldability. The back naturally exposes the
folded hem and its small retained layers.
