# Paper Couture — room for the paper on phones (Claude, 2026-10-29)

Branch `claude/phone-layout`, on top of `claude/usability-pass`, following Astra's
second review. Not merged. Notes: [docs/phone-layout/NOTES.md](docs/phone-layout/NOTES.md).

- `src/app/workFrame.ts`: the workshop camera frames the paper the current step
  involves over its whole motion. It starts on the old whole-sheet view, comes up
  to ~2.2x closer as the piece shrinks, and is never wider. It is still for the
  whole of a drag, even a long or reversed one (Astra's second review caught the
  first version blending mid-drag). A fold running by itself blends over its last
  40%. After a drag is let go and the fold finishes, the camera eases 0.35 s from
  where it held. A fold that falls back never moves it.
- `studioControls.ts`: on narrow screens in the workshop, a one-row bar (Browse
  pieces, design list, More). More opens the rest over the paper. Accessory folding
  keeps the full controls. At 568 x 320 the bar takes the title row.
- `main.ts`: Revisit stays in place (disabled) while a fold moves. Hiding it
  reframed the view mid-fold.
- Outstanding, not green: the October check (local time limit), the presentation
  check (-0 vs 0 after reload, also on main), the baseline-build checks, and hosted
  CI (no pull request yet). See the notes.
- Checks: `check-work-frame.ts` (in `npm test`), `check-phone-layout-browser.cjs`
  (CI: `.github/workflows/phone-layout.yml`); `check-usability-browser.cjs` and
  `check-phone-journey.cjs` updated for More and for a thumb big enough to drag
  directly.

Not tested on a real phone.

# Paper Couture — usability pass after Astra's review (Claude, 2026-10-29)

Branch `claude/usability-pass` from main (`f33415b`), at Charlie's request in a
Claude chat, addressing the three findings of Astra's 28 October review. Not
merged. Independent of `claude/wardrobe-gaps`. Notes:
[docs/usability-pass/NOTES.md](docs/usability-pass/NOTES.md).

- Hidden folds: `src/fold/visibility.ts` measures how much of a step's moving paper
  the camera sees. Below 25%, the dock offers **See this fold**
  (`src/render/hiddenPaper.ts`, a labelled overlay; the camera and the paper are
  unchanged). It stays on through Fold and Back, for replay. Hidden paper gets
  labelled grips, collapses included (`main.ts` `updateFoldHandles`); grips hide
  while opened instructions or notes lie over the paper.
- Short screens: a measured compact dock (540 px tall or less, or a dock over 40%
  of the screen) with an **Instructions** disclosure that overlays the paper, and
  **Piece notes** for the construction notes (`workshopPanel.ts`,
  `studioControls.ts`, `styles.css`).
- No WebGL: `src/ui/startupFailure.ts`. An alert with Try again and the finished
  pieces drawn flat; a notice while the graphics context is lost.
- Checks: `scripts/check-usability.ts` (in `npm test`; it records the five steps
  offered the highlight), `scripts/check-usability-browser.cjs` (CI:
  `.github/workflows/usability.yml`), and `check-integrated-browser.cjs` updated
  for Piece notes. When `claude/wardrobe-gaps` is merged too, rerun
  `check-usability.ts` and add any of its steps that come out hidden to the
  recorded list.

Not tested on a real phone or in mobile Safari.

# Five-design integration — October 18, 2026

Charlie authorized bringing Claude’s corrected companion branch onto main and
keeping the served website current. The combined registry retains the mitten
pair, twelve-piece corkboard, appearance controls and visual chooser. The five
new designs lead the chooser and have geometry-generated previews. There are
27 designs, seven accessories and 37 visible papers (17 curated).
The attached corrected folding PDF is byte-identical to the branch copy.
The fan’s written corner offset and tuck width are corrected; physical folding
remains untested. Use the 16 cm zori and 15 cm fan practice sheets first.
Historical publishing restrictions below are superseded by this request.

# Visual piece chooser and website update

Charlie requested visual browsing, recent designs first, and completion of the
website update. See [chooser notes](docs/design-picker/NOTES.md). This request
supersedes earlier historical instructions to leave the website untouched.
The gallery changes presentation only; Claude’s unmerged fold work stays separate.

# Paper Couture — overlap stacking in the twelve-piece board

Charlie authorized integrating Claude's bounding-box stacking change into
`design/october-integration` / PR35. It is a narrow port from `5a7fd8e` onto
`e49ffa9`: disjoint capture bounds rest at board depth; overlapping later
captures retain the existing clearance. Pins, guides, twelve slots, saved
captures and both formats remain. Saved data needs no migration, but rendered
depth/shadows intentionally change. See
[the integration and verification](docs/october-integration/presentation/BOARD-STACKING.md).
The rest of Claude's garment/paper branch and fan corrections are separate.
This does not merge PR35 into main or publish the separate website.

# Paper Couture — Claude board-review repairs (owner review)

Charlie supplied Claude's read-only review of `6284b4e` and authorized agreed
repairs. Primary board buttons keep their accent fill on hover/touch hover.
Adjust guides outlines the chosen figure even outside Move mode; selecting or
editing paper returns focus to it. Resizing a figure preserves its original
stroke weight in board units, including correct movement bounds. Default 100%
guide appearance is retained. Garments, papers, pins and lighting are unchanged.

Read [the review decisions and verification](docs/october-integration/presentation/REVIEW-FOLLOWUP.md).
All 17 jobs on the reviewed predecessor passed; check the new head separately.
PR35 remains the review destination. Nothing is merged or deployed; keep the
separate website untouched. Real-phone/Safari and physical-paper limits remain.

# Paper Couture — adjustable guides and neutral pins (owner review)

Charlie approved the corkboard direction and requested slim white/black pins,
movable/scalable guides, and a packet for Claude's independent review. This
follow-up starts at `606c420`, preserving the board, garment captures and paper
art. Each single/paired guide now has independent saved placement and uniform
size, with a separate Move guide mode, keyboard/buttons, Reset and Undo. Off
preserves adjustments. Scale/movement stay within the board; switching board
formats fits the rendered guide without rewriting the saved choice.

[Current behavior and evidence](docs/october-integration/presentation/NOTES.md)
· [Claude review brief](docs/october-integration/presentation/CLAUDE-REVIEW.md).
The source PR35 remains the review destination. Nothing is merged or deployed;
keep the separate website untouched. Check CI on the actual new head.

# Paper Couture — corkboard finishing pass (owner review)

Charlie requested a corkboard feel, visible/placeable pins, optional flat figure
guides and a photograph view. The finishing drawer adds three cork colors and
linen, three pin styles, one/two guides with explicit photograph inclusion, and
three bounded lighting choices. Twelve slots and both board sizes are retained.
Existing saves keep their old appearance until a surface is chosen. No garment,
paper artwork, sizing or fold-engine changes; decor stays outside frozen captures.

Read [the presentation notes and actual comparison](docs/october-integration/presentation/NOTES.md).
Source PR35 is the review destination. Do not merge or publish without Charlie's
review; the separate website repository is untouched. Prior `87a089d` had all
eight GitHub workflows green. New-head results must be checked independently.

# Paper Couture — more pinboard room (owner review)

Charlie asked for further preparation and more board space, then increased the
requested capacity to twelve to accommodate two wardrobe sets. The October review
branch now supports twelve independent captures and an optional Roomy board
(4.8 × 5.6 versus Standard 3.6 × 4.2; about 78% more area). Standard remains the
default. Captured sizes, coordinates, artwork and fold geometry are unchanged.
Shrinking is refused if any piece would lie outside Standard; no automatic moving
or scaling. Undo restores board format. Existing saves need no migration.

The previous `753b8e6` CI did not all pass: two composition workflows caught the
mobile starting-square control below the initial tools viewport; the October
45-minute job exhausted its time during the phone gate after the 128-view gallery
passed. The redundant capacity paragraph is replaced by a header count, preserving
full-width controls and paper preview size. Phone and Roomy checks have their own
CI job. See [implementation, evidence and limits](docs/october-integration/roomy-board/NOTES.md).

Keep source and website separate. Nothing merged or published. Physical-paper,
real-phone/Safari and first-draw performance work remain outstanding.

# Paper Couture — external-review follow-up

Charlie asked to complete the follow-up work after Claude/Grok's reviews of
PR35 at `ceb324d`. The candidate now uses the independently compared `.25` cuff
and `.20` thumb hinge, preserving the nine operations and top at `.75`. The
finished 6 cm-square ornament is approximately 3.85 × 4.50 cm. Short Left/Right
mitten titles preserve handedness in capture controls. See the
[thumb comparison](docs/october-integration/thumb-followup/NOTES.md) and
[mobile follow-up](docs/october-integration/followup/NOTES.md).

Display controls wrap on narrow screens and board selects use the available
width. Phone-width execution exposed foreground paper disappearing behind fixed
fog when the fitting camera retreats; `Stage.render` now keeps background haze
beyond the paper. This is a concrete visibility correction, not a fold-engine
change. The new production phone gate starts unfolded at 320/390 px and exercises
touch swatch scrolling, folding, small-flap grips, readable controls, pinning,
reload and export. Prior evidence below describes the earlier candidate.

Keep all four papers Experimental, their artwork unchanged, and the beret parked.
No physical-paper or real-phone/Safari trial has occurred. The separate website
repository is untouched; no merge or publication is authorized by this follow-up.

# Paper Couture — October integration for owner review

Branch `design/october-integration` starts from current main `cedf65c` and retains
Claude’s submitted `3c448a9`. Charlie authorized preparing full integration,
including critical fixes and a mitten recovery; **merge and publication still
require review**. The separate `cmish.dev` website repository is untouched.

Keep the four new papers Experimental: corrected Riso proof, crease-aligned
Crease bloom, Marbled endpaper and the new quiet Dusk wash. Bloom/Marble cache
their fixed rasters without changing pixels; Riso’s front intentionally changes
where invalid fractional-power arithmetic previously omitted dots. Both recovered
mitten hands are registered as flat ornaments, each suggested at a 6 cm starting
square. They use the retained top at y=.75, not the rejected deeper .65 turn.
The low wrist-root thumb has no hand opening. Synthetic connector intersections
remain documented separately from sampled material-facet checks. Beret remains
an unregistered study. No shared fold engine or renderer changes were made.

Read [the integration review and actual comparisons](docs/october-integration/NOTES.md),
[mitten reasoning and limits](docs/october-integration/mitten/NOTES.md), and
[Dusk wash comparison](docs/october-integration/companion-paper/NOTES.md).
The new exact-head CI workflow adds frozen-main geometry preservation,
frozen-Claude paper preservation, drawing-level material correspondence and
production browser/pinboard checks. Use Node 24, including the new
`npm run check:mittens`; numerical/browser success is not a physical-paper trial.
Historical permissions below apply only to their explicitly named candidates.

# Paper Couture — 2026-10 design pass (draft, not merged or published)

Draft branch `claude/stoic-fermi-oopgag` on main `cedf65c`. Adds three experimental
papers (Riso proof, Crease bloom, Marbled endpaper) and two unregistered origami
studies (mitten pair, beret); refreshes the commission brief's inventory. No garment,
existing paper, default, capture or geometry changes. Crease bloom is drawn on the
Swing coat's own creases (`src/papers/coatMarks.ts`, checked against the
construction). See [notes, comparisons, limits and recommendations](docs/design-pass-2026-10/NOTES.md).
Tested on Node 22 in a cloud container with headless Chromium; no real phone or
physical paper. No push to main, merge or deployment is authorized.
# Paper Couture — zori, folding fan and four papers (Claude, 2026-10-16)

Branch `claude/kimono-companions` from `claude/kimono`, at Charlie's request in a
Claude chat. Two new board designs, `zori` and `sensu` (Design list; experiments),
and four papers. Notes, evidence and the printable folding sheet:
[docs/kimono-companions/NOTES.md](docs/kimono-companions/NOTES.md).

- `src/fold/zori.ts`: band, fold in half, both top corners down (the back layer's
  band comes round as the thong), then from the back the sides, the toe and the
  rounding. One design; a pair is two of it.
- `src/fold/sensu.ts`: fold in half, round the corners, then five pleat steps, each
  one rigid two-crease collapse a side through the rivet, outermost first.
- `src/papers/classicSuite.ts`: Seigaiha waves, Asanoha, Polka dot, Houndstooth,
  added to the curated set.
- `garmentOptions.ts`: `zoriSide` and `sensuSide` decisions at the first fold.
- `src/ui/pinboard.ts`: a pinned piece stacks only above earlier pieces it overlaps
  (it used to sit above all of them, floating later pieces and their shadows).
- `scripts/check.ts`: a 19-level fold allowance for the zori (8 paper layers at most
  per crease). Flagged for review.
- Checks: `scripts/check-zori-sensu.ts` (in `npm test`),
  `scripts/check-zori-sensu-browser.cjs` (CI: `.github/workflows/kimono-companions.yml`);
  `check.ts` and `check-collection.ts` include both colourways; the legacy
  design-list assertion lists 25 designs and the accessory list the obi.

Not tested on a real phone or in physical paper.

# Paper Couture — kimono and obi (Claude, 2026-10-16)

Branch `claude/kimono` from `claude/gown`, at Charlie's request in a Claude chat.
One new design, `kimono` (Design list; experiment), and one new accessory, `obi`.
Notes, evidence and the printable folding sheet: [docs/kimono/NOTES.md](docs/kimono/NOTES.md).

- `src/fold/kimono.ts`: the traditional paper kimono (origami.me's model, from the
  diagrams Charlie shared): six simple folds, then the squash as one rigid collapse
  (four creases at each side point, rates 1 and sqrt(2)), shown from the collar side.
- `src/fold/obi.ts`: a separate small square; `accessories.ts` places it at the waist only.
- Engine: flap folds take `except` tags; collapse regions take `only`/`except`
  (`mayMove` in `engine.ts`). Unfiltered folds and regions behave as before.
- `garmentOptions.ts`: a `kimonoSide` decision at the first fold. `garments.ts`: the
  kimono's waist anchor.
- `scripts/hingeCheck.ts`: an optional bound for ordinary folds, 8 for every existing
  design and 10 for the kimono's collar fold (4 paper layers there). Flagged for review.
- Checks: `scripts/check-kimono.ts` (in `npm test`), `scripts/check-kimono-browser.cjs`
  (CI: `.github/workflows/kimono.yml`); `check.ts` and `check-collection.ts` include
  both colourways; the legacy design-list assertion lists 23 designs.

Not tested on a real phone or in physical paper.

# Paper Couture — one-shoulder gown (Claude, 2026-10-16)

Branch `claude/gown` from `claude/coat-dress`, at Charlie's request in a Claude chat.
One new design, `gown` (Design list; experiment). Notes, evidence and the
printable folding sheet: [docs/gown/NOTES.md](docs/gown/NOTES.md).

- `src/fold/gown.ts`: hem band, corner tip, sash (the neckline), cupboard fold, a
  tuck of one back panel, the fit-and-flare waist collapse at an empire height, and
  a cap-sleeve flap. A full-skirted gown was not foldable with this waist; the
  notes say why.
- `garmentOptions.ts`: a `gownSide` decision (Printed gown / Reverse-colour gown)
  at the first fold.
- `scripts/hingeCheck.ts`: an optional rendered-level bound; 12 for every existing
  design, 16 for the gown (its sash wraps from the top of the front stack to the
  bottom of the back stack; 12 paper layers at most). Flagged for review.
- Checks: `scripts/check-gown.ts` (in `npm test`), `scripts/check-gown-browser.cjs`
  (CI: `.github/workflows/gown.yml`); `check.ts` and `check-collection.ts` include
  both colourways; the legacy design-list assertion lists 22 designs.

Not tested on a real phone or in physical paper.

# Paper Couture — coat-dress (Claude, 2026-10-15)

Branch `claude/coat-dress` from main `cedf65c`, at Charlie's request in a Claude chat.
One new design, `coat-dress` (Design list; experiment). Notes, evidence and the
printable folding sheet: [docs/coat-dress/NOTES.md](docs/coat-dress/NOTES.md).

- `src/fold/coatDress.ts`: one rigid shoulder collapse (a degree-4 vertex at each
  shoulder; closed-form fold rates) gives the fronts, collar, back yoke and short
  sleeves; the fit-and-flare waist is solved against a leaning side seam.
- `garmentOptions.ts`: a `coatSide` decision (Reverse-colour coat / Printed coat)
  before the shoulders. `sharedFoldPrefix` now compares collapse steps by their
  whole spec, so two collapses sharing an id are not treated as already folded.
- Checks: `scripts/check-coat-dress.ts` (in `npm test`), `scripts/check-coat-dress-browser.cjs`
  (CI: `.github/workflows/coat-dress.yml`), `scripts/foldMetrics.ts` (`npm run fold-metrics`),
  `check.ts` and `check-collection.ts` include both colourways; the legacy design-list
  assertion in `check-fit-flare-browser.cjs` lists 21 designs.

Not tested on a real phone or in physical paper.

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

