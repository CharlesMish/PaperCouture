# Paper Couture — owner feedback: folding access and lapel clarity

Built on merged source PR #7 (`7280cbf`) and website PR #25 (`aaba27d`).
Small moving flaps now get 44px on-canvas grips with drag, tap and keyboard support.
The skirt and vest use explicit turn-over steps instead of mountain folds; they
have nine and eight steps respectively. Skirt final geometry is unchanged.
Vest lapels are smaller and have fine highlights along their actual boundaries.
The accessory is consistently called Two-piece bow, with one square per wing.
See `docs/feedback-pass/NOTES.md` for evidence and remaining limits. Earlier entries
below describe historical versions.

# Paper Couture — wrap skirt and lapel vest

Owner authorized Wrap Skirt and Lapel Vest, with permission to stop the cape early.
Both garments are integrated in Design with their own attachment anchors and the
existing papers, pin, bow and Display controls. See `docs/garment-studies/NOTES.md`.
The cape was tried and rejected at visual review; it is not registered or shipped.
This pass builds on merged PR #6 (`019fb1f` on `polish/plum-petals`). The entries
below are historical and describe the scope at their own dates.

# Paper Couture — silhouette and bow experiment

Owner authorized three dress silhouette choices, a bow experiment and more optional
attachment positions. See `docs/astra-review/STYLING_CHOICES.md`. Choice is offered
before step 3; later changes explicitly revisit that fold. Bow uses two separately
folded squares. Original dress, jacket, pin, paper art and fold engine are retained.

# Paper Couture handoff — jacket and optional pin prototype

Owner playtest authorized a second garment and a separate accessory experiment.
The Design selector adds Box jacket. After either garment is folded, Fold a pin
opens a separate five-step square with independent paper and rotation. Attach,
move or remove it in Display. Details, checks and screenshots:
`docs/astra-review/JACKET_AND_PIN.md`. The fold engine and paper drawings are unchanged.
This is based on the played `43774efb` snapshot, not the older main branch.

# Paper Couture handoff — 2026-09-28 (refine 2)

## Status

`experiment/paper-studies-02-refine` merges the accepted two-sided rotation (`bec6885`) into the phase-1 redraws. Turning the sheet turns both printed sides. Woven checks is an over-and-under print again, without the light edge strips. Midnight orchard fruits are rounder. Reverse garden’s drawing is the phase-1 sheet; the back now turns with it. Plum scatter, Tidal bands, and Cut-paper mosaic are unchanged from that draft. Sheets and notes: `docs/paper-studies-02/refine-2/`. `src/fold/` is still unchanged from `05bba444`. The before study remains at `archive/paper-studies-02-542d7d1`.

Headless Chromium on the production preview (not a phone, not physical paper): Turn paper during a fold kept the step, four turns returned to 0°, switching to Reverse garden kept the turn, Back and Start over worked, and Display Front / Angle / Back kept the finished fold when the paper was turned. At a 390×844 viewport the swatch row scrolled to Reverse garden, which is the last swatch. The workshop name line is hidden at that width; the display title shows the name. No console errors.

# Paper Couture handoff — 2026-09-28

## Status

Second paper study is on `experiment/paper-studies-02`, open and unmerged, branched from `05bba444` (merge of the first study). Six more procedural papers: Midnight orchard, Tidal bands, Plum scatter, Cut-paper mosaic, Woven checks, Reverse garden. Sixteen swatches use the existing scrolling picker. `src/fold/` is still unchanged (`git diff 05bba444 -- src/fold` is empty), and so are garment, lighting, camera, and renderer code. Notes and sheets: `docs/paper-studies-02/`.

The 2026-09-27 notes below still describe the first ten papers.

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


