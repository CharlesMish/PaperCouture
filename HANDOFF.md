# Paper Couture — authorized Swing coat publication

Charlie approved publication of reviewed candidate `932b1e216f5752691cce398dc1dffab77bde84a1`
on 2026-10-08. This supersedes the local-only scope below for this candidate.
Source PR31 must pass exact-head CI and independent recheck before normal merge.
The separate cmish.dev import preserves site main `2f2d9f0` (published PR41),
using the existing pinned-source workflow and production build connection.
The only source follow-up updates two legacy browser registry assertions for the
one garment and three papers added here; runtime and geometry remain unchanged.

# Paper Couture - local Swing coat and Reed suite candidate

Pinned to main `3fed818781aad112b52f00d9c87f2e65fa17900f`, containing the reviewed
`a89f48c` candidate and `3372f86` geometry corrections. Adds one ten-step Swing
coat and three procedural papers on `design/swing-coat-reed-suite`. See
[selection, scale, checks and limits](docs/swing-coat/NOTES.md). Existing geometry
and rendering code are unchanged. This task is local only: no push, PR, merge or
deployment is authorized. The parent/publisher coordinates any later integration.
Historical publication authorizations below do not apply to this new candidate.

# Paper Couture — authorized main-site publication

Charlie authorized pushing corrections, waiting for exact-head GitHub CI and
independent approval, then normal source merges and publication to the main
cmish.dev site. This supersedes earlier local/preview-only restrictions for
this combined Paper Couture update. See [the publication notes](docs/MAIN_PUBLICATION.md).
The reviewed 3372f86 geometry is unchanged; garment and accessory selectors
now show one list each, while specific construction limits remain visible.

# Paper Couture — continuous PR28 correction for independent re-review

Charlie authorized local corrections to PR28's visible layer intersections,
absolute hinge guard and missing CI coverage. Independent review rejected
d3c15f7's per-frame axis switching; this revision plans and smoothly blends
separating directions and adds adaptive vertex-motion regressions. Synthetic
hinge-strip intersections are measured separately and remain a stated limit. This branch preserves Claude's geometry,
Sunray artwork and all resting captures. Read
[docs/fit-flare/CORRECTIONS.md](docs/fit-flare/CORRECTIONS.md) for implementation,
tests, exact lineage and reviewer focus. No push, PR update, merge or deployment
is authorized yet; publication scope must be resolved separately.

# Paper Couture — fit-and-flare dress and Sunray pleats (Claude, 2026-10-07)

On top of the combined wardrobe preview `21109e7`, at Charlie's request in a Claude chat.
Two additions; nothing in the existing designs, papers or captures changes.

- **Fit-and-flare dress** (`fit-flare`, Design → Experiments): sleeveless, banded neckline,
  bodice narrowing to a nipped waist, flared skirt. The waist cannot be made with single-line
  folds, so the engine gains one step kind, `collapse` (`src/fold/collapse.ts`): rigid bodies
  joined by creases whose fold angles stay locked as around a flat-foldable four-crease vertex.
  The waist is a pleat plus a hidden gusset each side; both corners satisfy Kawasaki and the
  step moves as one rigid mechanism. `engine.ts` only gains the op type; `timeline.ts` builds
  and animates collapse steps (simple folds and turns animate exactly as before). Notes,
  captures and checks: [docs/fit-flare/NOTES.md](docs/fit-flare/NOTES.md).
- **Sunray pleats** (experimental paper): pleats drawn as rays from the point where the Classic
  A-line's side creases meet, so they follow the dress sides and the gold hem rule meets itself
  across the back. `src/papers/dressMarks.ts` records those crease positions; `npm run check`
  fails if they drift from `buildDress()`. Notes in [docs/paper-studies/NOTES.md](docs/paper-studies/NOTES.md).
- `scripts/check.ts`: the hinge test measures opening beyond each hinge's resting height (the
  waist corner is 12 layers deep); every existing design's numbers are unchanged and still pass
  the old absolute limit. New: collapse crease loops must close at every stage, and every
  checked construction's finished crease pattern must pass Maekawa and Kawasaki at every vertex.
- `npm run crease-pattern` writes `docs/crease-patterns/<design>.svg` for every design (all 19
  pass). `npm run sheet-map` writes the dress and fit-and-flare sheet maps.
- Eleven scripts that asserted "every op is a valley fold or a turn" now say so for fold ops
  explicitly (TypeScript needs it with a third op kind); their meaning is unchanged.
- The paper picker scrolls the chosen swatch into view inside its list when the paper or its
  rotation changes, including `?paper=` links.

Not tested on a real phone or in physical paper. No merge or deployment.

# Paper Couture — combined wardrobe preview publication

Charlie authorized a separate draft source PR and cmish.dev branch preview on
October 7, 2026. This publication branch continues reviewed candidate
`9808074a26b7ebb14c22810c321fdc9a233c9e3f`; garment/application code is unchanged.
CI now runs the existing regressions and focused capelet/brooch, shirt, necktie
and combined-outfit browser checks on the exact PR head. The source PR stacks
on PR25, which remains unmerged. No production merge or deployment is authorized.
The local-only restrictions in the historical entries below describe that
completed review phase and are superseded solely for this preview publication.

# Paper Couture — external packet review (local only)

Candidate on top of preserved capelet/brooch `31ce3ab6ece7de536fdf16f40c5830d9d068dcae`.
Adds the unchanged Camp-collar shirt from `989b556e8bb1d53c2cfd2ac93ac224a1fb1e03ba`
and the submitted Folded necktie from patch `c7518964ae7d3b89370450a5724c068b6b846b04`.
Both remain Experimental; suggested starting squares are 18 cm and 7 cm.
The notch crop and reconstructed bolero are review studies only and are not in Design.
See [the verdict, provenance, comparisons and checks](docs/external-review/NOTES.md).
No push, merge, PR publication or deployment is authorized for this review.

# Paper Couture — local capelet/brooch follow-up

Local-only branch from reviewed PR25 `21e0fdbd67b8c9c0e2ff7c6b8fb2baf7a851657f`.
New capelet folds have two real front panels over lining; the name is Open-front
capelet and new captures suggest 18 cm. Framed brooch keeps its square folds,
adds an authored Rectangle choice, and suggests 4.5 cm. Existing captures are
unchanged. See [comparison, checks and limits](docs/capelet-brooch/NOTES.md) and
the [forwardable design brief](docs/capelet-brooch/Paper-Couture-external-design-brief.txt).
No push, PR publication, merge or deployment is authorized for this follow-up.

The historical PR25 handoff below records the frozen reviewed predecessor.

# Paper Couture — companion design studies

Separate draft based on frozen PR24 `574b2b10cc2894586f2ee3f8c9496035365e6408`.
The supplied message, archive and all six reference images were reviewed before
selection. Collared capelet, two independently folded ankle-boot directions and
Framed brooch are retained as experiments, with explicit 14/8/8/6 cm starting
squares. Plum seed is one new fixed companion paper. The brooch adapts the
window-mat proposal to four real reverse-facing borders around intact paper.

The engine, existing folds/papers, five-piece board, camera, snapshot schema,
accessory machinery and published products are unchanged. New shapes captured
with known papers can be read by PR24; Plum seed requires this draft's reader.
An older reader preserves an unsupported saved board and blocks overwriting it.
See [the evidence and validation record](docs/companion-studies/NOTES.md).

# Paper Couture — garment choices and pleated skirt

Built from played source `305f8ef` (the merged owner-feedback pass). The current source line is
`polish/plum-petals`, not the older main branch. See `docs/geometry-collection/NOTES.md`.

Dress has three sleeve choices across its three silhouettes; jacket and vest have two lengths;
wrap skirt has two real wrap directions and one-/two-turn waistband finishes. The one-turn band
is broader and printed, not reverse-facing. Decisions use named operations and verified common
fold prefixes. Revisit preserves paper and option preferences, rewinds affected progress, and
keeps completed accessories hidden until the garment is finished again.

Pleated skirt is a new seven-step retained-paper construction. The Two-piece bow can optionally
gain a separately folded centre, with independent paper and turn, to form a three-piece assembly.
The robe and trousers studies were parked; neither is selectable. Current defaults, paper art,
two-sided rotation and fold engine are unchanged. Some attachment positions move slightly inward
to keep the complete bow on the paper.

`npm test` now includes the geometry-collection checks. Browser review scripts are optional:
`scripts/check-collection-review.cjs` and `scripts/check-centre-review.cjs`; use the same external
Playwright/Chromium configuration as existing feedback scripts. Headless browser touch emulation
does not establish real-phone/Safari or physical-paper behavior.

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

