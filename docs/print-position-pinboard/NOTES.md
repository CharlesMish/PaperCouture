# Print positioning and the current-piece pinboard

This candidate starts at published source `d879cc24871a04c5aaa39ba0b19bb137bd257fc6`.
It does not change the fold engine, garment registry, constructions, attachment
anchors or old paper artwork. It is a review candidate, not a production release.

## Try it

- Choose Corner bloom or Plum scatter, then **Position print** (the four-arrow
  button beside Turn paper). Drag the flat sheet or use Left/Right/Up/Down.
  Close with Done and inspect the folded result from Front/Angle/Back. Turn paper
  and try another garment. Reset print restores the authored placement.
- Seed dashes instead offers Original and three half-cell positions. The repeat
  is one dash per 1/16-sheet cell; the half-cell displacement is 1/32 sheet.
  This is intentionally subtle. Other papers retain their authored placement.
- Complete a piece and enter Display, then **Pinboard**. The board captures that
  exact posed piece, paper, print position and visible accessory (including an
  optional third bow-centre square). Drag or nudge it, tilt up to 12 degrees,
  choose Linen/Rose/Slate, and Save PNG. Return to piece keeps the original folds.
- In Display, zoom out and try the lowest orbit from different directions. The
  eye must stay above the table; Front/Angle/Back remain available.

## Print contract

Artwork is baked on a finite square before stationary grain is applied. The
original zero-offset drawing path is retained. Both floral papers have solid
backs. Their ink layers can move up to 76/256 (29.6875%) of the sheet on each axis;
artwork leaving an edge is cropped, never stretched or wrapped. Quarter-turn
sampling stays in the existing two-sided registration convention. Material UVs
and geometry do not move. Positions use the printed front's right/up sheet axes.

Seed dashes alone extends its verified repeat with neighbouring cells. Its
front repeats at 1/16 sheet and its back is solid. No universal texture-repeat
mode is offered. Pinstripe's front stripes do not make its seeded-scatter back
periodic; borders, reverse-placement studies and unverified papers stay fixed.
The optional `placement` capability holds per-paper ink layers and either a
bounded slide policy or named snap positions, so future papers need not change
the fold engine or editor.

Changing to a different paper resets that sheet's print position. Changing a
garment, folding, going Back, and Start over keep the current paper and position;
Reset print is separate. The garment's `printX`/`printY` URL parameters preserve
its offset on reload. Missing, nonfinite, locked-paper and invalid-snap values
fall back safely; out-of-range sliding values are bounded. Unrelated URL
parameters remain. Accessory and centre offsets are independent and in memory,
matching their existing paper/progress persistence. No localStorage, IndexedDB,
account, migration, or deletion is added.

## Pinboard contract and limits

One current folded piece, seen from the front. It uses a copy of current vertex,
UV, material and texture resources, not predefined outfits or rebuilt sample
geometry. Hidden/kept-aside accessories are omitted; visible separate squares
keep their separate paper. The stand and workshop guides are omitted. The board
centres the piece at its existing sheet scale and only changes its whole-piece
translation and tilt. Arrangement resets on closing; the last chosen background
lasts for the page session. No multi-piece gallery or persistent board save yet.

PNG is 1600 × 1200 with an opaque selected background. It is not a transparent
cutout. Repeated exports restore the preview size; snapshot resources are
released on exit. Native dialogs isolate focus and fold/camera shortcuts. The
workshop animation pauses while an editor is open and resumes after closing.

## Validation

`npm run typecheck`, `npm test`, and `npm run build` cover the candidate. Numerical
checks retain all existing garment and accessory assertions and add malformed
URL, bounds, snap and two-sided registration cases. They do not certify physical
foldability or continuously collision-free folding.

`scripts/check-positioning-browser.cjs` is a separate rendered interaction check.
It requires Playwright/Chromium and a Vite dev server (for the raster diagnostic
imports). Set `BASELINE_URL` to a server at the exact published source to compare
all 42 original front/back rasters. `CAPTURE_DIR` selects the evidence directory.
The harness exercises actual fold/back/reset and paper controls, reload, print
moves at every quarter-turn, bow wings/centre, pinboard resource ownership,
repeated PNGs, mobile touch emulation, all eight designs and camera extremes.

Headless Chromium with software WebGL and emulated phone dimensions is not a
physical phone or Safari playtest. Owner play remains useful for drag feel,
pattern choices and the front-only board presentation.
