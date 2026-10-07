# External design packet — independent local review

**Advance the Folded necktie beside the Camp-collar shirt. Park the shawl bolero
and notch crop.** The coherent candidate retains the refined Open-front capelet,
the small Square/Rectangle brooch and existing wardrobe, then adds the shirt and
tie as experiments. It introduces no new paper and changes no existing folds.

This is a local review candidate, not a published update. No push, merge, new PR,
deployment or contact with external models occurred.

## What actually arrived

All five Library files materialized successfully. Names, versions and hashes are
in [the receipt](inputs-receipt.json); original bytes remain in the task's local
`output/external-packet-review/inputs/` directory.

- The pasted transcript, `NOTES.md` and `necktie-PR25.patch` form a complete necktie
  delivery, including source, tests and binary image evidence. The format-patch
  identifies `c7518964ae7d3b89370450a5724c068b6b846b04`, based on frozen PR25
  `21e0fdbd67b8c9c0e2ff7c6b8fb2baf7a851657f`. This was independently applied and
  tested on that exact base before selective integration.
- `shawl-bolero-NOTES.md` is notes only. Its referenced source at short hash
  `9718ed8`, scripts and images were not supplied. The six-step reconstruction
  below is explicitly our interpretation of the stated coordinates, not that
  commit or evidence that the external browser run occurred.
- `pcwork.zip` contains a **different design: Notch-collar crop**. Its revision
  marker is exact PR25. Archive paths were inspected before extraction; no
  hooks ran. 153 files match PR25 byte-for-byte. The changed registry, size
  table and package script accompany one new builder, check and short note.
  No render or browser evidence was supplied. See [archive diff](archive-diff.json).

The combined candidate starts from preserved capelet/brooch
`31ce3ab6ece7de536fdf16f40c5830d9d068dcae`. Its shirt builder and tests are copied
from the read-only, clean shirt checkout at
`989b556e8bb1d53c2cfd2ac93ac224a1fb1e03ba`. Both shirt and necktie builders match
their respective sources byte-for-byte. Registration, suggested sizes and test
scripts are integrated; the tie uses the existing display-angle mechanism.

## Visual verdict

| Design | Outfit-scale finding | Decision |
| --- | --- | --- |
| Folded necktie, 7 cm square | Distinct neckwear role; real folded knot and a broad pointed blade. On the camp shirt it sits neatly beneath the collar. At 320px the tie is about 24 × 55px. The quiet-paper knot remains subtle. | Keep Experimental. Best new addition. |
| Camp-collar shirt, 18 cm | Actual collar and cuffs remain legible with the tie; about 96 × 80px at 320px. Provides the stronger new top against which to judge the external crops. | Include the existing shirt unchanged. |
| Revised capelet, 18 cm | Separate printed panels visibly frame lining over the wrap top. At 320px about 93 × 67px. | Keep the existing revision unchanged. |
| Shawl bolero reconstruction, 16 cm | Dimensions and reported visibility reproduce exactly. Its tall central wrap and projecting shoulder points obscure the underlying top; the narrow reverse collar does not establish a useful alternative to the capelet. | Park. Original source/evidence still needed before accepting the external delivery. |
| Notch crop, 18 / 14.4 cm | At suggested size it is broader than the skirt, about 133 × 105px at 320px. Reducing the square gives 106 × 84px but retains the broad reverse panels and horizontal band. The camp shirt is the clearer collared top. | Park. A size change alone does not justify another menu item. |

[Selected outfits](evidence/selected-outfits.jpg) and
[outerwear comparison](evidence/outerwear-comparison.jpg) use actual 320 × 568
app captures, at the same board camera and image scale. The common skirt, top
waist and neutral papers are controlled. Layered cases use the same wrap top,
hat and 4.5 cm brooch. Candidate cases also ran at 390 × 844 and 1180 × 900.
These are proposed arrangements; no auto-arrangement feature was added.

## Geometry, print and evidence limits

The independent audit uses 161 samples per operation, versus the submissions'
81. All five compared designs retain area 4 and connected material; sampled
facets remain rigid, endpoints agree, floor clearance stays nonnegative and no
strict interior triangle piercing is detected. This does not prove continuous
collision freedom or practical paper foldability.

| Design | Steps | Finished model width × height | Board width × height | Max hinge gap / 0.044 |
| --- | ---: | --- | --- | ---: |
| Necktie | 8 | 0.93853 × 2.11421 | 0.32849 × 0.73997 at 7 cm | 0.0385 |
| Notch crop | 5 | 2 × 1.58 | 1.8 × 1.422 at 18 cm | 0.0165 |
| Bolero reconstruction | 6 | 1.50667 × 1.18 | 1.20533 × 0.944 at 16 cm | 0.0330 |
| Revised capelet | 8 | 1.40307 × 1 | 1.26276 × 0.9 at 18 cm | 0.0385 |
| Camp shirt | 14 | 1.44377 × 1.21 | 1.29940 × 1.089 at 18 cm | 0.0385 |

The bolero reproduces the reported 48² landing counts exactly: front 702 print /
36 reverse, back 526 print / 224 reverse. Its unshifted flower **centre** is
buried at all four turns; that does not mean all petals disappear. The supplied
(-0.0625, -0.0625) shift increases visible flower at 0°, but it still clips at
the viewer's right edge. That same shift is not an all-turn recipe: at 270° it
removes the visible red petals. No paper or geometry bug is inferred from this.

The notch crop front is approximately 60.3% reverse among visible samples.
The necktie front is wholly printed; its back shows both faces. Its four
rotation-specific Corner bloom offsets reproduce the flower-under-knot effect:
0° (0.1875, 0.15625), 90° (0.15625, -0.1875), 180° (-0.1875, -0.15625),
270° (-0.15625, 0.1875). See [our fresh renders](evidence/necktie-print-turns.jpg).
The submitted “100% flower” metric samples a disc on three rings, not every
motif pixel; the leaves still crop. Front, angle, back and half-fold renders
were inspected. Nothing here establishes real-phone feel or a physical fold.

## Corrections and integration checks

The notch test as submitted has four unused imports (`applyAffine`, `v2`,
`isFlipped`, `SheetState`) and fails strict scripts typecheck. Removing those
imports fixes the review copy; its geometry is unchanged. Original files and
the failure log are preserved. Our first integration harness also compared
in-memory negative zero against reloaded JSON zero; comparing the durable JSON
representation corrects that test. Neither finding calls for an engine fix.

- Node 24.16.0: clean dependency install, strict typecheck, full `npm test` and
  production build pass on the combined candidate. The standalone submitted
  necktie also passes these gates on exact PR25.
- The supplied necktie browser suite was independently rerun: real eight-step
  fold controls, half poses, Back/refold/reset, four print rotations/offsets,
  front/back views, five captures, layer order/Undo, remove/Undo, reload, exact
  composite PNG and backward reading in PR25 all pass.
- The shirt browser suite passes on the combined app: actual 14-step controls,
  half poses/cancellation, print positioning, narrow screens and legacy captures.
- The new integrated outfit suite passes seven arrangements at desktop, 390px
  and 320px: exact snapshot positions/UVs, preserved prior pieces, bounds and
  unchanged camera, remove/Undo, durable reload and exact 1800 × 2100 exports.
  All seven saved boards render byte-identically in frozen PR25. Both old PR25
  fixtures also preserve bytes and PNGs in the candidate. In both tie outfits,
  real CDP touch at 320px moves the tie; cancellation and Undo restore it exactly.
- Existing storage-failure/migration tests remain in the full suite. No board,
  storage, camera, paper, accessory, renderer or existing constructor changed.
  No user browser profile was used. There is no new remote CI run: no push was
  authorized for this local review.

Reports: [geometry](independent-geometry.json), [outfits](outfit-results.json),
[necktie browser](necktie-browser-results.json), [shirt browser](camp-browser-results.json),
[study browser](study-browser-results.json). Full screenshots, boards and logs
remain under the local task output directory.

## Reproduce and review next

Run `npm ci`, `npm run typecheck`, `npm test`, `npm run build` on Node 24.
`node --import tsx scripts/check-external-geometry.ts` audits the parked shapes
without registering them. For their browser comparison only, apply
`docs/external-review/parked-studies.patch` in a disposable checkout and build.
That patch is never applied to this candidate; the production bundle has only
the shirt and necktie additions.

Browser scripts accept `PLAYWRIGHT_MODULE` for an external Playwright install.
Serve candidate, patched studies and frozen PR25 compiled builds separately.
Run `scripts/check-external-outfits.cjs` with `BASE_URL`, `STUDIES_URL`,
`BASELINE_URL`, `CAPTURE_DIR`; defaults are localhost ports 4451, 4452, 4400.
For close-ups use `scripts/check-external-studies-browser.cjs` with `BASE_URL`
and `CAPTURE_DIR`; necktie/shirt browser scripts remain alongside it.

The next useful owner review is this compact visual packet followed, if desired,
by an explicitly authorized private preview of the combined local commit. On a
physical phone, try placing the small tie beneath the collar, dragging then
cancelling, layering it, and moving the flower. Separately fold a larger paper
necktie prototype to assess the knot tuck. A new outerwear commission should
wait for a clearly distinct shape goal; the original brief and shirt PDF do
not need recreating.
