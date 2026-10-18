# Paper Couture — Cursor continuation of Claude chunk 3

Open **this folder** in Cursor. Use Node.js 24.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, normally http://localhost:5173/.
No account, API key, external image service, or backend is needed. All papers are drawn
procedurally. The source is standard Three.js + TypeScript + Vite.

For the first agent session, paste **CURSOR_START.md**. Read **HANDOFF.md** before editing.
Claude stopped before its final handoff, but the exported application already has a complete
six-step sequence, sixteen visible papers, fold/back/reset controls, and a display view.

## Checks and production preview

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

Production preview normally uses http://localhost:4173/. The static build is in `dist/`
and uses relative asset paths. Serve it over HTTP; do not double-click index.html.

Use **Browse pieces** to see finished shape previews before choosing a design.
Recent collection highlights lead the gallery and the compact name selector.
See [the visual chooser](docs/design-picker/NOTES.md).

## Garments and optional accessories

Choose Dress, Box jacket, Wrap skirt, Lapel vest or Pleated skirt from Design. After folding the garment, optionally
fold a separate diamond pin or a two-piece bow (one square per wing), choose its own paper and place or remove it.
At dress step 3, choose Straight, Classic A-line or Wide flare, then choose the sleeve angle at step 4.
The jacket and vest offer two body lengths. The wrap skirt offers either wrap direction and a broad
one-turn or narrow two-turn waistband. Use Revisit to return to a completed choice; paper, other
preferences and finished accessories are kept while affected folds are redone.
After folding both bow wings, optionally fold a third centre square with its own paper and rotation.
The experimental Fit-and-flare dress folds its nipped waist in one rigid collapse step
(`src/fold/collapse.ts`); see [its notes](docs/fit-flare/NOTES.md). `npm run crease-pattern` writes a
printable crease pattern for every design to `docs/crease-patterns/`.
See [collection notes](docs/geometry-collection/NOTES.md) and [styling notes](docs/astra-review/STYLING_CHOICES.md). See
[the prototype notes](docs/astra-review/JACKET_AND_PIN.md) for behavior and checks.

The Wrap skirt has eight or nine steps, the Pleated skirt seven; both have three waistband
attachment positions. The Lapel vest has eight steps and five clasp/lapel/panel positions.
See [garment study notes](docs/garment-studies/NOTES.md).

Small flaps have 44px arrow handles: drag toward the arrow or tap to complete the
pending fold. See [owner-feedback fixes](docs/feedback-pass/NOTES.md).

The garment and accessory selectors each present one collection. Construction
limits stay in the selected design note and in the design documentation; a
shared selector does not establish physical foldability. Paper categories remain.

## Try it

Choose a paper swatch and press Fold/Turn over for each step. Back reverses a step;
Start over resets the square. When finished, Display places the same object on a small
stand. Drag to orbit; use Front/Angle/Back, zoom and the optional Turntable. Workshop
returns to the same folded piece. Changing paper and rotating its pattern also work
on the finished object. Arrow keys advance/reverse in the workshop; Escape returns
from display. A constrained drag-to-fold interaction also exists for owner evaluation.

## Code map

- `src/fold/construction.ts`: authored original A-line dress, six steps.
- `src/fold/garments.ts`: garment registry and attachment anchors.
- `src/fold/wrapSkirt.ts`, `lapelVest.ts`: new authored single-square sequences.
- `src/fold/engine.ts`, `geometry.ts`: material polygons, creases and resting states.
- `src/fold/timeline.ts`: animated rigid facet transforms and layer spacing.
- `src/app/controller.ts`: forward, reverse, reset, and scrub state.
- `src/render/`: paper meshes, materials, guides, scene and stand.
- `src/papers/`: sixteen visible paper designs and a diagnostic grid.
- `src/app/displayCamera.ts`, `viewSwitch.ts`: display inspection and transitions.
- `src/ui/` and `src/main.ts`: interface and application wiring.
- `scripts/check.ts`: geometry and controller checks.
- `docs/screenshots/`: Claude's supplied screenshots; `docs/verification/`: fresh checks.

## Optional diagnostic scripts

`npm run check -- --dump` produces `docs/states.json`. `scripts/plot_states.py` uses
Python with matplotlib and numpy. `scripts/browser_check.py` and `scripts/screenshots.py`
use Python Playwright (install its Chromium browser) and expect a running preview.
They now use project-relative output paths. `BASE_URL` overrides the default preview URL;
`CAPTURE_DIR` overrides `docs/captures`. These optional Python tools are not needed to
run or build the application. Their syntax was checked during this handoff; the fresh
browser verification used a separate audit harness, not these Python scripts.


## Print placement and pinboard candidate

Use **Finish & photograph** on the board for cork or linen, optional pins (including slim white/black), independently movable/scalable flat outfit guides and a clean photograph view. See [the presentation pass](docs/october-integration/presentation/NOTES.md).

See [the 12-piece / Roomy follow-up](docs/october-integration/roomy-board/NOTES.md) for current board behavior, mobile corrections and checks.

Corner bloom and Plum scatter support bounded artwork sliding; Seed dashes has
verified half-cell positions. Fold any current piece, enter Display and use
Pinboard to explicitly pin that piece with its attached accessory. Return to folding, make another, and keep up to twelve independently arranged pieces. Choose Standard or Roomy in Board size; Roomy adds about 78% arranging area without resizing your paper. Standard remains the default. The board persists in this browser and exports the visible composite. See [the owner workflow and save limits](docs/multi-piece-board/NOTES.md) and
[behavior, limits and checks](docs/print-position-pinboard/NOTES.md).

## Outfit proportions and collection draft

The pinboard offers an explicit starting-square size for each new capture. Suggested sizes
make the clutch and apron fit beside garments; earlier captures keep their exact saved size.
Boat-neck top, Cross-wrap top and Folded hat are new experimental intact-square silhouettes.
Oat linen and Slate grain add quiet companions; Ginkgo pairs is a positionable paper study.
See [earlier sizes, comparisons and verification](docs/outfit-collection/NOTES.md)
and the [portable brainstorming brief](docs/outfit-papers/COMMISSION-BRIEF.md).

## Design and curation draft

Running stitch and Arc study add two papers. Pointed tabard is an experimental
one-square silhouette; Folded sash is a separate-square waist accent. The existing
paper scroll now shows curated choices first and experiments later, keeping every
old paper available. See [comparison, limits and play steps](docs/design-curation/NOTES.md).

## Companion design draft

Open-front capelet, two ankle-boot directions and Framed brooch are new experimental
intact-square designs. Fold and pin each boot separately; a pair uses two board
slots. Suggested starting squares are 18 cm for the capelet, 8 cm per boot and
4.5 cm for the brooch, with Square and Rectangle fold choices. Plum seed adds a fixed two-sided oat/plum/sage print.
Existing positioned blossom papers work on all four new designs. See the
[original review](docs/companion-studies/NOTES.md) and the
[local capelet/brooch refinement](docs/capelet-brooch/NOTES.md).

## Local external-design review

Camp-collar shirt and Folded necktie are experimental additions to the refined
capelet/brooch candidate. The shirt has folded collar and cuffs; the small tie
has a real knot pleat and uses an intact square. See the
[review and evidence](docs/external-review/NOTES.md) for provenance, parked
outerwear studies, paper positioning and test limitations.

## Local overnight design candidate

Swing coat adds a long open-front silhouette with folded facings and a broad
shawl-like shoulder yoke. Reed study, Broken twill and Copper fleck form a small
coordinated paper set. See [illustrated selection and checks](docs/swing-coat/NOTES.md).
The coat remains an experimental flat silhouette with continuous lining.

## October integration candidate

Riso proof, Crease bloom and Marbled endpaper from Claude’s October proposal
remain Experimental after review and corrections. Dusk wash adds a quiet broad
colour field. The recovered Folded mitten pair uses a retained top fold for a
shorter palm: one intact 6 cm square per hand, approximately 3.85 × 4.50 cm finished
after the [reviewed cuff refinement](docs/october-integration/thumb-followup/NOTES.md).
These are flat ornaments with a low wrist-root thumb and no hand opening.
The original tall mitten and beret remain studies.

See [actual comparisons, decisions, test results and physical limits](docs/october-integration/NOTES.md).
The combined collection has 27 main design entries, seven optional accessories
and 37 visible papers (17 curated, 20 Experimental). Defaults and earlier IDs
are preserved. The twelve-piece corkboard and visual chooser are retained, with
folded previews for all five additions.
## Coat-dress

Coat-dress is one square folded in two rigid collapses: a sailor collar in front
that becomes a square cape across the back, fronts that meet under the collar and
open over an underskirt, short sleeves under the collar, a pleated waist and a
flared skirt. A Coat colour choice before the shoulders decides which side of the
paper the coat shows. `npm run check:coat-dress` covers it; `npm run fold-metrics`
compares physical-risk measurements across designs. See [the notes, scale and
checks](docs/coat-dress/NOTES.md) and the [printable folding sheet](docs/coat-dress/coat-dress-folding-sheet.pdf).

## One-shoulder gown

One-shoulder gown is one square folded into a floor-length column: a cupboard
fold for length, one straight fold for an asymmetric neckline whose corner
becomes a sash in the paper's other colour, the fit-and-flare's waist collapse
at an empire height, a single cap sleeve and a contrast hem band. A Gown colour
choice at the first fold decides which side the gown shows. `npm run check:gown`
covers it. See [the notes, scale and checks](docs/gown/NOTES.md) and the
[printable folding sheet](docs/gown/gown-folding-sheet.pdf).

## Kimono and obi

Kimono is the traditional paper kimono, from one square: square sleeves from one
rigid squash, a collar of the paper's other side down the front from a point at
the neck, and a body that narrows to the hem. A Kimono colour choice at the first
fold decides which side it shows. The Obi accessory folds from its own small
square (a band with a cord of the other colour) and goes at the kimono's waist.
`npm run check:kimono` covers both. See [the notes, scale and checks](docs/kimono/NOTES.md)
and the [printable folding sheet](docs/kimono/kimono-folding-sheet.pdf).

## Zori, folding fan and four classic papers

Zori is a flat sandal from one small square, with a thong of the paper's other
side brought round from the back layer by the kimono's collar fold at a shallower
angle; pin two for a pair. Folding fan is an open sensu of eleven panels from five
rigid pleats a side. Each has a colour choice at the first fold. The papers Seigaiha
waves, Asanoha, Polka dot and Houndstooth each come with a chosen reverse.
`npm run check:zori-sensu` covers the two pieces. See [the notes, scale and
checks](docs/kimono-companions/NOTES.md) and the [printable folding
sheet](docs/kimono-companions/zori-and-fan-folding-sheet.pdf).

## Trousers, cloche, shell top, kinchaku and plain kami

Trousers are wide-leg trousers from one square: a long strip that runs up one leg,
turns across the waist with square corners and down the other leg, the second turn
set a few degrees off 45 so the legs part below the crotch, with a stripe of the
other side down each outer seam. Cloche is a bell-shaped hat with a ribbon of the
other side. Shell top is a sleeveless top with a neckband and a hem band. Kinchaku
pouch is a drawstring pouch whose gathered neck is the fit-and-flare's waist move.
The first three have a colour choice at the first fold. Kami vermilion and Kami
indigo are plain two-sided papers; Marbled endpaper and Woven checks are now
curated. The folded hat, boat-neck top, bib apron, one-shoulder tunic and pointed
tabard are retired from browsing but still open by link. `npm run
check:wardrobe-gaps` covers the new pieces. See [the notes, scale and
checks](docs/wardrobe-gaps/NOTES.md).
