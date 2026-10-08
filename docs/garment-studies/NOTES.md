# Wrap skirt and lapel vest

## Intent and scope

Two recognizable garment outlines, each authored from one square with retained
material coordinates. No cut holes, mesh morphing, cloth simulation, new paper
art, or mannequin. Existing dress silhouettes, box jacket, pin and two-sheet bow
remain available. The fold engine, timeline, renderer and original constructions
are unchanged.

## Wrap skirt

Seven steps: turn the sheet, establish the length, bring across a broad left panel,
overlap the narrower right panel, tuck the small hem points, and turn the waistband
twice. The printed wrap panels sit over a visible triangle of reverse paper.
The folded waistband has left, centre and right attachment choices. Its centre is
slightly right of the square's centre because the skirt is deliberately asymmetric.

The first prototype folded a deep hem after making the wrap panels. It left awkward
side tabs. Establishing the length before the panels and tucking only the remaining
points produced a cleaner outline. This is a flat paper study, not a wearable skirt.

## Lapel vest

Six steps: turn the sheet, fold both front panels inward, turn each lapel separately,
tuck the outer shoulder corners behind, then shorten the body. The opening reveals
backing paper, not a cut gap. The lapels are actual selected panel folds. Lapels must
be formed before the shoulder tucks; the alternate order failed the existing seam
check and was discarded without weakening the check.

Attachments use five positions: centre clasp, left/right lapel, and left/right panel.
Pins and bows are modestly smaller on both new garments to suit their dimensions.
Switching designs keeps paper and rotation and resets the fold. A position unavailable
on the new garment falls back to its first valid attachment anchor.

## Cape decision

A pointed cape prototype passed the geometry checks, but looked like a broad inverted
triangle, hid most of the printed face, and left a stray folded tab. It did not meet
the visual bar alongside the skirt and vest. It was stopped early as authorized,
and its construction is not included in the app. No placeholder option is shown.

## Verification

`npm run typecheck`, `npm test`, and `npm run build -- --base /play/paper-couture/`.
The geometry suite includes both new constructions and their attachment centres.
It checks conserved sheet area, rigid facets, shared edges, reversibility, sampled
hinge gaps and above-table motion; no existing tolerance was loosened.

| Construction | Steps | Final facets | Width × height | Stack height | Worst sampled hinge gap |
| --- | ---: | ---: | --- | ---: | ---: |
| Wrap skirt | 7 | 16 | 1.640 × 1.270 | 0.0565 | 0.0385 |
| Lapel vest | 6 | 14 | 1.100 × 1.400 | 0.0290 | 0.0275 |

Dimensions use a starting square of side 2. These checks do not prove that a real
sheet can follow the sequence without collisions; neither garment has been folded
physically. The skirt's layered waistband is thicker than the vest's.

The optional `scripts/check-garments.cjs` serves the production build under the actual
subpath and the site's CSP. It uses Playwright Chromium (software WebGL here),
clicks each new sequence forwards and backwards, resets during motion, exercises
paper/rotation and Display presets, folds the bow and pin, checks attachment choices,
and checks 390×844 and 844×390 viewport layouts. It also checks the old jacket remains
available and the dress silhouette choice still works. See `final/browser-result.json`
and the contact sheet. This is browser emulation, not a real phone or Safari check.
Drag-to-fold and touch orbit/pinch were not exercised in this pass.

To rerun: install Playwright with a Chromium browser, build as above, then run
`node scripts/check-garments.cjs`. Optional PLAYWRIGHT_MODULE and CHROMIUM_MODULE
variables support external browser tooling without changing project dependencies.

## Visual review

[Views and accessories](final/views.jpg) · [Four print rotations](final/rotations.jpg) ·
[Phone-sized layouts](final/mobile.jpg)

The skirt reads most clearly in Angle view, where the overlap and doubled band are
visible. The vest's lapel edges are subtle when its reverse and backing have the
same solid colour. Landscape keeps a usable, smaller garment; the existing top
control strip scrolls horizontally to reach controls beyond the viewport.

The browser pass completed with no page, console, request or CSP errors. A final
instruction-only correction removed an inaccurate claim that the skirt's waistband
shows the reverse; it actually carries the print. The production build was rerun
after that text correction. No geometry or interaction changed after the browser pass.
