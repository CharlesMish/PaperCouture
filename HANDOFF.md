# Paper Couture handoff — 2026-09-27, updated 2026-10-07

## 2026-10-07: Sunray pleats

One paper added, `sunray-pleats` (`src/papers/sunrayPleats.ts`), drawn to the dress's creases instead of placed on the sheet. Pleats are rays from the point where the two side creases meet above the sheet; the hem band and gold rule are circles round it. The pleats follow the dress sides, and the hem rule continues across the back because the reverse draws it at the same radius. Details and rotations are in `docs/paper-studies/NOTES.md`.

- `src/papers/dressMarks.ts`: where the default dress's collar and side creases fall on the sheet. Papers still import nothing from `src/fold/`; `scripts/check.ts` now fails if these numbers drift from `buildDress()` (checked by nudging the apex: two failures, then restored).
- `scripts/sheet_map.ts` (`npm run sheet-map`) writes `docs/paper-studies/sheet-map.png`: which parts of each face reach the front or back of the dress. Built from the final fold state, not from screenshots.
- `src/ui/paperPicker.ts`: the chosen swatch is scrolled into view inside the list when the paper or its rotation changes, including `?paper=` links. With eleven swatches the eleventh sits below the list on 1280×800 and off the right of the row at 390px; before this a linked paper could be selected and invisible. Only the list scrolls, never the page.
- `scripts/capture_papers.py`: includes the new paper; `ONLY=<ids>` captures just those and rebuilds the sheets from tiles on disk. Folded grid is now six columns with front, angle and back each starting a new row.
- `src/fold/` untouched.

Tested in headless Chromium (Playwright, SwiftShader), production preview, Node 22.22 (the repo asks for 24; nothing failed): typecheck, `npm test`, build; Sunray flat, front, angle, back and four rotations captured; no console errors. A fresh capture of Falling chevrons matched the committed tiles pixel for pixel in the 3D view (only the display panel's font differs on this machine), so the new tiles share the old camera. Picker at 1280×800 and 390×844: linked load, click away and back, rotate in the workshop and on the finished piece, all six folds by keyboard; no horizontal page scroll. Not tested on a real phone or in physical paper.

## Status

Continuation of Claude's chunk-3 export. The unmodified export is tag `baseline-chunk3`. Later work is on `experiment/paper-studies`. `src/fold/` is unchanged from that tag (`git diff baseline-chunk3 -- src/fold` is empty).

Six procedural papers were added beside the original four. The hidden diagnostic grid is unchanged. No new garment, editor, persistence, or backend.

## Blockers

None. The production build was driven in headless Chromium (Playwright, software WebGL). No page exception or console error. No fold or rendering fix was made.

## Picker

Ten swatches do not fit the old centred column, or one unscrolling row at 390px wide. `src/styles.css` only: swatches are 48px, the desktop column sits under the title and above the step dock and scrolls if it must, and the phone row scrolls sideways. On 1280×800 all ten are on screen (about 9px of the last swatch sits in the scroller). On 390×844 the page does not scroll horizontally; Seed dashes and Ink reverse are reached by scrolling the row. The rotate control stays outside that scroller.

## Papers

| id | name | file |
| --- | --- | --- |
| wide-frame | Wide frame | `src/papers/wideFrame.ts` |
| corner-bloom | Corner bloom | `src/papers/cornerBloom.ts` |
| open-stems | Open stems | `src/papers/openStems.ts` |
| falling-chevrons | Falling chevrons | `src/papers/fallingChevrons.ts` |
| seed-dashes | Seed dashes | `src/papers/seedDashes.ts` |
| ink-reverse | Ink reverse | `src/papers/inkReverse.ts` |
| sunray-pleats | Sunray pleats (2026-10-07) | `src/papers/sunrayPleats.ts` |

Folding notes are in `docs/paper-studies/NOTES.md`. Short version, matched to the sheets: Falling chevrons at 0° are heavier toward the hem. Corner bloom at 0° keeps most of the flower on the left edge, with the leaves cut off; at 270° it sits on the lower right. Ink reverse’s collar, sleeves, and back field are dark ink; the ring drawn on the reverse does not show on the dress. Wide frame leaves the front empty apart from a hem band or a narrow side strip. Seed dashes stay a fine texture. Open stems keeps more on the front at 0° than at 180° or 270°.

## What was tested

Headless Chromium via Playwright, `--use-angle=swiftshader`. Not a phone and not physical paper.

- `npm run typecheck`, `npm test` (`scripts/check.ts`: geometry, seams, sampled animation, controller), `npm run build`. All passed. Node 24.21.0.
- Dev server and production preview both served. The interaction pass below was on the production preview.
- Buttons, not `jumpTo`: all six forward steps and all six backward steps; Start over while the first fold was in motion (step returned to 0); Start over from the finished piece.
- Paper and quarter-turns during a fold (Indigo lattice) and between steps (Botanical sprigs, then Corner bloom at 90°). On the finished piece: Ivory, ink border turned, then Falling chevrons. Ten swatches present.
- Display: enter, Front / Angle / Back, drag orbit, wheel zoom, Reset view, Turntable, paper change while displayed, return to Workshop with step still 6.
- 390×844 workshop and display: no horizontal page overflow. Phone row scrolls.

`scripts/capture_papers.py` shot all ten visible papers at one camera (positions matched to 0.001). Sheets: `docs/paper-studies/flat-grid.png`, `folded-grid.png` (front, then angle, then back), `rotation-grid.png` (Corner bloom, Falling chevrons, Wide frame, Open stems).

A later pass changed only `src/papers/inkReverse.ts` `drawBack`. The first reverse painted a pale band and pale corners, so the collar and sleeves came out pale. The back is now the dark ink, with a ring kept in the middle. New Front, Angle, and Back tiles show dark collar and sleeves. The ring is not visible on the dress. Ink reverse was selected from the swatches during a fold and again on the finished piece, then Display was opened. No console errors. `npm run typecheck`, `npm test`, and `npm run build` were run again after that change.

## Not tested

A real phone, mobile Safari, touch orbit or pinch, or the feel of dragging a fold. No physical sheet has been folded from this pattern. The geometry checks do not prove continuous collision-free folding. Layer gaps are rendering offsets (stack height 0.0290, worst sampled hinge gap 0.0165). Nothing is saved across reload.

## Remaining

The fold is still an authored rigid-facet sequence, not a cloth simulation. Wide frame and Seed dashes do not give the finished dress much to look at. The phone picker hides the last swatches until the row is scrolled. Drag-to-fold was not exercised in this pass.
