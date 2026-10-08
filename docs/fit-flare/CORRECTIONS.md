# PR28 correction candidate: continuous motion revision

Local branch `codex/pr28-collapse-corrections`, based on Claude's unchanged PR28
head `c3145ed82cf4155cc9e35e7f4f3aef0cb291e3bc`, whose published wardrobe base is
`21109e70e9e3a8ecf5da6a5a0a532aacceb6b4f4`. This revision follows local candidate
`d3c15f755842e55b07f71c29fbff5bd159a30df7` and addresses its independent review.
No push, PR update, merge or deployment is authorized or performed.

## Result and mechanism

PR28's waist animation shows broken patches across its rotating side panels.
Its vertical layer offsets lose separation as panels become upright and reverse
visible order. Offsets now follow each body's normal. A bounded rendering-depth
pass translates whole convex facets, preserving their rotations and material
polygons. It runs only for collapse and subsequent non-turn motion.

The previous correction chose the greatest-clearance separating axis each frame.
Two valid choices could exchange rank abruptly: the review found a 0.00491959
model-unit vertex jump across a 1.90735e-9 progress interval. That selection is
removed. The revision plans directions once, using a fixed time grid independent
of the first requested pose, scrub order or playback direction:

- Prefer one axis valid for the entire operation and compatible with both saved
  layer stacks. Candidate axes are panel normals, in-plane boundary normals and
  cross products of edges, with a fixed orientation from panel A toward B.
- If one axis cannot preserve both endpoints, plan directions at 33 knots, each
  valid through its neighboring intervals. A cubic smoothstep blends adjacent
  directions. Positive combinations of A-to-B separating normals also separate
  the ideal convex panels; normalization preserves that direction.
- Apply exactly 256 passes of continuous half-space projections to the layer
  translations. There is no per-frame winning-axis choice or early-exit count.
  A 1e-6 sin(pi*t) clearance vanishes at rest. Invalid directions or a residual
  above 1e-8 fail explicitly instead of returning an unchecked frame.

All authored resting states and endpoint matrices remain byte-identical to PR28.
At the reviewer's exact waist witness the new maximum vertex displacement is
8.36319e-9 model units. Endpoint probes down to 1e-10 progress have displacement
below 1e-15. These are numerical regression results, not an analytic certificate
for every time, finite-thickness paper or arbitrary future collapse geometry.
Planning samples alone do not certify a continuous separating path.

The dress construction, Sunray artwork, print positioning, board, captures and
older garments are unchanged. A private held-pose cache retains output isolation.
The absolute hinge guard remains 0.044 (eight layer gaps) for older/early folds
and 0.066 (twelve) for the new waist stack and later fold. Constant 0.5-unit tears
must fail both cases; a large resting gap cannot bypass this guard.

## Validation

- Full Node 24 typecheck, npm test and production build pass locally.
- 1,007 poses per affected operation: zero strict facet intersections using both
  Float64 material geometry and **actual SheetView buffers**, which round material
  coordinates before transformation and round positions afterward. The earlier
  approximation that only rounded final coordinates is replaced.
- Maximum absolute hinge gap remains 0.066 within numerical tolerance. Maximum
  facet-edge length error is below 7e-16; paper stays above the table.
- Adaptive continuity regression: 4,001 uniform samples per operation, followed
  by 20 bisections toward larger vertex movement around the 12 largest translation
  second differences, all 33 blend knots and both reported interior witnesses.
  The bound scales with interval width (32*dt + 1e-9), rather than permitting a
  fixed-sized jump. Separate endpoint limits cover 1e-2 through 1e-10 progress.
- The new adaptive regression rejects **both** waist and shoulder discontinuities
  when run against frozen d3c15f7. Fresh timelines first sampled near the end produce
  exactly the same poses as timelines first sampled near the start.
- All frozen resting-state/endpoint hashes match PR28; all 45 earlier garment
  variants have exact states and sampled poses versus published 21109e7.
- Browser suites pass at desktop and 390/320 widths: actual interrupted/reversed
  folds, reset, paper change during motion, front/back and print shifts, four
  rotations, capture, repeated remove/Undo and move/Undo, touch cancellation,
  reload and exact composite PNGs. Frozen legacy and combined-wardrobe captures
  and PNGs are preserved. Quota failure/retry and older-reader protection pass.

## Rendered connector audit and visible scope

A second, independent normalized-plane/barycentric test checks actual SheetView
buffers at 201 poses per operation. It excludes coplanar/tangent contact and
crossings less than 1e-8 model units from a triangle plane. The original facet
regression remains in place with its original thresholds.

| Operation | Facet/facet crossings | Facet/strip crossings | Strip/strip crossings |
| --- | ---: | ---: | ---: |
| Waist | 0 | 5,963 | 8,782 |
| Shoulders | 0 | 9,988 | 13,559 |

Counts aggregate intersecting triangle pairs over sampled poses. They are not
counts of distinct visible defects. The largest waist facet/strip crossing has
0.0220141 model-unit depth at t=0.875; the largest strip/strip crossing is
0.0164995 at t=0.855. Shoulder facet/strip crossings reach 0.0165 at the unchanged
final pose. These artificial connectors already intersect in original PR28 and
frozen endpoints; this correction does **not** make the entire render mesh free
of intersections.

Normal workshop screenshots and explicitly labeled no-strip diagnostics at
waist t=0.69, 0.855 and 0.875 show narrow seam/connector differences. Inspection
has not isolated another broad patch defect comparable to original PR28 at
0.455. The diagnostic only hides strips for comparison; production rendering
retains them. Future connector work needs its own visible acceptance case and
must preserve the saved endpoint geometry.

## Reproduce and review

```sh
npm ci
npm run typecheck
FIT_FLARE_REPORT=.fit-flare-qa/geometry.json \
  FIT_FLARE_RENDER_REPORT=.fit-flare-qa/rendered.json npm test
npm run build
BASELINE_DIR=/path/to/published-21109e7 \
  PRESERVATION_REPORT=.fit-flare-qa/published-geometry.json \
  node --import tsx scripts/check-published-geometry.ts
```

Serve compiled candidate and published baseline separately, then:

```sh
export BASE_URL=http://127.0.0.1:4470
export BASELINE_URL=http://127.0.0.1:4472
export CAPTURE_DIR=.fit-flare-qa
node scripts/check-fit-flare-browser.cjs
node scripts/check-fit-flare-storage.cjs
SKIP_PARKED_STUDIES=1 CAPTURE_DIR=.wardrobe-qa node scripts/check-external-outfits.cjs
```

`PLAYWRIGHT_MODULE` may point to an installed Playwright. Tests use disposable
contexts, never personal browser storage. Storage tests consume the fixture
from the preceding fit-and-flare browser test.

The six relevant workflows still target both wardrobe branches, with candidate
checkouts pinned to the PR head. The fit-and-flare workflow now also uploads the
separate rendered-surface audit. GitHub checks for this local revision are
**unrun**; they require an authorized future push. No bypass is proposed.

Local reviewer evidence: `../output/pr28-continuity/`, including machine reports,
normal/diagnostic screenshots, the rejected-candidate regression and exact
witness comparison. `candidate-manifest.json` records the frozen head, patch
hashes, build hashes and verification files. Earlier evidence is preserved.

Local cold planning took about 181 ms (waist) and 276 ms (shoulders); warmed
frame evaluation was roughly 2-4 ms median. These Mac measurements are not a
phone-performance certification. Browser checks use emulated touch and
Chromium/SwiftShader. Physical phone and physical paper remain untested.
Sunray's documented waist/back-hem mismatch and the existing slight selected
swatch-ring clipping remain separate from this motion correction.
