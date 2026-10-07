# PR28 correction candidate

Local correction branch `codex/pr28-collapse-corrections`, based on Claude's
unchanged PR28 head `c3145ed82cf4155cc9e35e7f4f3aef0cb291e3bc`. Its base is the
published wardrobe source `21109e70e9e3a8ecf5da6a5a0a532aacceb6b4f4`.
Charlie authorized local corrections and tests, with a separate independent
review afterward. No push, PR update, merge or deployment has been performed.

## What changes

At 45.5% of the waist collapse, the old animation shows broken patches across
the side panels. Its layer offsets remain vertical while the panels rotate:
their separation vanishes when upright and their visible order reverses.
Offsets now follow each body's normal. A small rendering-depth pass preserves
separating sides of the already valid thin-paper mechanism near shared edges.
It translates whole convex facets, leaves rotations and material polygons
unchanged, and runs only for a collapse and subsequent non-turn motion.
It has a fixed iteration cap and rejects a nonconvergent result. This is not
a general physical-paper collision solver or a way to repair invalid folds.

All authored resting states and operation endpoints remain byte-identical to
PR28 (the fixture records hashes generated from that frozen checkout).
The dress construction, Sunray artwork, paper-position logic, board model,
capture format and earlier garments are unchanged. A private one-pose cache
avoids repeating the separation calculation for a held scrub or pending peek.
Its output buffer cannot mutate the cached result.

The hinge check once again imposes an absolute maximum: eight `LAYER_GAP`s
(0.044) for earlier designs and the first four dress steps; twelve (0.066)
for the new waist stack and subsequent shoulder fold. A large resting gap
cannot bypass this check. Mutation regressions add a constant 0.5-unit tear
to an earlier fold and to the new stack; both must fail.

All five existing wardrobe workflow filters now include both the published
wardrobe base and Claude's PR28 branch. The added fit-and-flare workflow runs
the new regressions against a frozen published checkout and uploads evidence.
Every relevant candidate checkout uses the exact PR head. GitHub execution
still requires authorization to publish the local correction branch.

## Reproduce

Use Node 24 and the locked dependencies:

```sh
npm ci
npm run typecheck
FIT_FLARE_REPORT=.fit-flare-qa/geometry.json npm test
npm run build
BASELINE_DIR=/path/to/published-21109e7 \
  PRESERVATION_REPORT=.fit-flare-qa/published-geometry.json \
  node --import tsx scripts/check-published-geometry.ts
```

Serve the compiled candidate and a compiled published `21109e7` checkout on
separate local ports. With Playwright Chromium available:

```sh
export BASE_URL=http://127.0.0.1:4470
export BASELINE_URL=http://127.0.0.1:4472
export CAPTURE_DIR=.fit-flare-qa
node scripts/check-fit-flare-browser.cjs
node scripts/check-fit-flare-storage.cjs
SKIP_PARKED_STUDIES=1 node scripts/check-external-outfits.cjs
```

`PLAYWRIGHT_MODULE` may point to an existing Playwright installation. The tests
use disposable browser contexts. The storage test consumes the board fixture
created by the preceding fit-and-flare browser test. Use separate capture
directories for the combined-outfit suite when retaining both reports.

## Local verification

Node 24.16.0 typecheck, full `npm test` and production build pass. The final
motion/cache regression also passes after the last test additions.

- Zero strict facet piercings in 1,007 sampled poses per affected operation,
  both Float64 and Float32. Maximum absolute hinge gap is 0.066; maximum
  edge-length error is below 7e-16; paper stays above the table.
- All authored resting-state and endpoint hashes match PR28. All 45 earlier
  garment option combinations have exact states and poses versus `21109e7`.
- The actual browser suites pass: collapse reversal/reset and paper changes
  during motion; shoulder refolding; floral positioning and quarter-turns;
  desktop/390/320 capture, movement, remove/Undo, reload and exact PNGs; touch
  cancellation and recovery; quota failure/retry and older-reader protection.
- Both frozen legacy boards and four combined wardrobe compositions retain
  exact saved captures and baseline/candidate composite PNGs.
- All six relevant workflow files parse and target both intended base branches
  with candidate checkouts pinned to the PR head. GitHub checks are unrun:
  the branch remains local pending publication authorization.

Reviewer evidence is retained alongside the checkout at
`../output/pr28-corrections/`, including machine reports, test logs, separate
before/after screenshots and exported boards. Median local frame-evaluation
time is about 2.8 ms for the waist and 4.5 ms for shoulders; held/pending poses
use the cache. These Mac timings are not a phone-performance certification.

## Independent reviewer focus

- Inspect the waist at progress 0.25, 0.455, 0.60 and 0.75, and shoulders at
  0.34, including reversal and cancellation. The original frozen checkout
  remains available for a direct before/after comparison.
- Inspect `layerSeparation.ts`: ideal separating axes, rigid translations,
  numerical margin, convergence cap and exact endpoint bypass. The maximum
  sampled added contact correction in the development diagnostic was 0.00637
  model units at the waist and 0.000391 at the shoulders (sheet width = 2).
- The committed regression samples 1,007 positions per affected operation,
  including near-endpoint probes, in both Float64 and renderer Float32
  precision. Check the absolute hinge bounds, unchanged endpoints, deterministic
  revisit behavior and output-cache isolation.
- Compare all 45 published garment option combinations against `21109e7`.
  Verify saved-board bytes, offsets, layer order, remove/Undo and exact PNGs.
- Review the CI filter change before approving a proposed stacked correction
  PR onto `wardrobe/sunray-and-fit-flare`; do not replace Claude's branch.

## Limits

The tests sample thin facets. They exclude coplanar contacts, tangencies,
unsampled instants and finite physical paper thickness. The connective hinge
strips are rendering surfaces, not a physical thickness model. Browser checks
use Chromium/SwiftShader and emulated touch/phone viewports; no real-phone or
physical-paper validation is claimed. Sunray's documented fit-and-flare waist
and back-hem mismatch remains unchanged.
