# One companion accent: Framed brooch

Keep one experimental **Framed brooch**, made from a 6 cm intact square. Four narrow valley folds leave a printed centre inside a true reverse-paper border. It is a flat decorative paper accent: no cut opening, pin, clasp, curved wrist band or asserted fastening. The registry entry is standalone under Design; it uses ordinary board capture and introduces no attachment machinery.

This adapts the supplied window-mat idea after testing its actual folds. The supplied six-step alternating turn-over sequence exposes reverse only along the top and bottom; the side borders remain printed. Folding all four edges onto the front produces the intended four-sided border. Moving the creases from ±0.62 to ±0.75 preserves more visible central paper, giving a positioned flower room to read.

The centred bloom is visible in the real renderer, and the back is the actual uninterrupted reverse. These are screenshots from the existing fold engine, textures, workshop and board, not the external illustrative renders.

| Candidate examined | Actual result and decision |
| --- | --- |
| Cufflet | Two thirds folded behind give a 2 × 0.667 bar. Existing Folded sash already gives a 2 × 0.52 bar with a reverse edge. Park as too similar; its larger proposed square is not a new silhouette. |
| Band cuff | After the suggested midline guide is unfolded, the two retained edge folds give 2 × 1, not the claimed 2 × 0.5. This is another rectangular strip. A cylindrical bracelet like the supplied image requires curvature and an open volume that this flat model does not demonstrate. |
| Waist peplum | The specified inward side folds and waist facing give 0.9 × 1.55: a narrow rectangle, not the reference image's two flared panels. Park this recipe rather than pretend it matches the image. |
| Petal collar | The final “parallel, offset” creases are underspecified. The proposal does not yet establish a new clear silhouette beyond the neckerchief, bow or the separate capelet study. Park pending a precise pattern. |
| Supplied window mat | 1.24 × 1.24, but reverse on two front edges only. Adapt to the Framed brooch below; do not describe the original recipe as verified. |

The brooch differs from the diamond pin's folded corner faces, patch pocket's single top border and clutch's closing triangular flap. Its useful feature is the retained central print panel. No new paper was needed: Corner bloom gives a clear placement example; Oat linen, Slate grain and Ginkgo pairs provide alternate real front/back views.

## Geometry and print placement

- Starting material: `[-1,1]²`, full retained area **4** through every operation.
- Four whole-stack valley folds at `y = +0.75`, `y = −0.75`, `x = −0.75`, `x = +0.75`; nine final facets.
- Final footprint: **1.5 × 1.5** model units. The visible printed centre is `[-0.5,0.5]²`, one square unit, or **44.44%** of the footprint. Continuous original material remains behind it; there is no hole.
- At 6 cm: **0.45 × 0.45** board units, with a **0.30 × 0.30** printed panel. This is a bold square brooch, about 27% of the jacket's full width, rather than a tiny jewelry pin.
- Corner bloom at `(printX, printY) = (51/256, 41/256)` places the blossom inside the centre. The original position clips it at the lower left. A deliberately poor `(-0.25, -0.25)` placement hides it under the folded border.

At one fixed front camera, measured red flower pixels are **7,035 unshifted**, **9,627 centred**, and **9 hidden**. The centred placement restores visible petals; no artwork is painted over the folds. Four quarter turns and both rendered faces are captured in the gallery. At other turns, re-positioning may be necessary; there is no claim that one offset suits every rotation or every paper.

## Choosing 6 cm

The real board study compared 5 cm and 6 cm against the same jacket, skirt, clutch and hat. At 320 px, the 5 cm brooch is 27.71 px wide with an 18.47 px printed centre; 6 cm gives **33.25 px** and **22.17 px**. At 390 px, it grows from 35 px to **42 px**. The 6 cm default makes the flower more legible while staying accessory-sized. The ordinary starting-square selector still offers smaller and larger choices. Old captures keep their exact size.

- [5 cm at 320](evidence/outfit-5cm-320.png)
- [6 cm at 320](evidence/outfit-6cm-320.png)
- [6 cm at 390](evidence/outfit-6cm-390.png)
- [Initial size-comparison receipt](size-study-results.json)
- [Unshifted flower](evidence/bloom-unshifted-front.png)
- [Centred flower](evidence/bloom-centred-front.png)
- [True reverse](evidence/bloom-centred-back.png)

## Verification and limits

`scripts/check-framed-brooch.ts` uses the actual engine and timeline: every resting state keeps area 4, sampled facet edges remain rigid, operation endpoints agree, and controller forward/back/mid-step reversal/reset pass. Across **81 samples per operation**, worst hinge gap is **0.0165** against the existing **0.044** limit, minimum height is **0.0015**, and strict triangle piercings are **0**. [Geometry receipt](geometry-results.json).

`scripts/check-framed-brooch-browser.cjs` exercises all four Fold and Back controls, real front/angle/back views, four print turns, useful/poor offsets, exact captured vertices/UVs/paper recipe, existing mixed captures, movement/remove/Undo/reload, 390/320 portrait layout and byte-identical 1800 × 2100 PNG export. The final gate tests the 6 cm default and its 7.2 cm option; the earlier 5/6 study is retained separately. [Browser receipt](evidence/browser-results.json).

Selected renders are committed above. The complete local gallery, intermediate folds, every quarter-turn/back view and full-resolution export are preserved in `docs/captures/framed-brooch-qa/` in the isolated study worktree; the browser script regenerates them on demand. No supplied raw text, archive or illustrative images are committed.

Node 24 typecheck, full existing `npm test`, build and the dedicated geometry check pass. The new geometry test is separate here; the integrating branch should add it to its normal test command and add the browser script to CI.

Chromium emulation is not a physical phone test. The sampled checks do not prove continuous collision-free motion or physical-paper foldability. A real crease trial is still needed before calling the construction physically established. All changes remain isolated development; existing published source and hosted preview are untouched.
