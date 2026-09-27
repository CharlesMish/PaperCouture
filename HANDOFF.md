# Paper Couture handoff — 2026-09-27

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

Folding notes are in `docs/paper-studies/NOTES.md`. Short version: Falling chevrons at 0° still reads (marks point toward the hem and get heavier there; the back panels turn that direction). Corner bloom is a crescent at 0° and a whole flower on the skirt at 270°. Ink reverse puts a drawn dark face on the collar and sleeves. Wide frame mostly leaves the front empty. Seed dashes survive only as a fine texture. Open stems keeps one stem on the front at 0°, and little at 180° or 270°.

## What was tested

Headless Chromium via Playwright, `--use-angle=swiftshader`. Not a phone and not physical paper.

- `npm run typecheck`, `npm test` (`scripts/check.ts`: geometry, seams, sampled animation, controller), `npm run build`. All passed. Node 24.21.0.
- Dev server and production preview both served. The interaction pass below was on the production preview.
- Buttons, not `jumpTo`: all six forward steps and all six backward steps; Start over while the first fold was in motion (step returned to 0); Start over from the finished piece.
- Paper and quarter-turns during a fold (Indigo lattice) and between steps (Botanical sprigs, then Corner bloom at 90°). On the finished piece: Ivory, ink border turned, then Falling chevrons. Ten swatches present.
- Display: enter, Front / Angle / Back, drag orbit, wheel zoom, Reset view, Turntable, paper change while displayed, return to Workshop with step still 6.
- 390×844 workshop and display: no horizontal page overflow. Phone row scrolls.

`scripts/capture_papers.py` then shot all ten visible papers at one camera (positions matched to 0.001). Sheets: `docs/paper-studies/flat-grid.png`, `folded-grid.png` (front, then angle), `rotation-grid.png` (Corner bloom, Falling chevrons, Wide frame, Open stems).

## Not tested

A real phone, mobile Safari, touch orbit or pinch, or the feel of dragging a fold. No physical sheet has been folded from this pattern. The geometry checks do not prove continuous collision-free folding. Layer gaps are rendering offsets (stack height 0.0290, worst sampled hinge gap 0.0165). Nothing is saved across reload.

## Remaining

The fold is still an authored rigid-facet sequence, not a cloth simulation. Wide frame and Seed dashes do not give the finished dress much to look at. The phone picker hides the last swatches until the row is scrolled. Drag-to-fold was not exercised in this pass.
