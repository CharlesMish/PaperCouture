# Plum seed: one retained companion paper

Based on frozen PR24 `574b2b10cc2894586f2ee3f8c9496035365e6408`.
The owner supplied an external Plum seed proposal and visual references. The
proposal's palette, 196 seed locations and dimensions are adapted here to the
actual `PaperDesign` API. Its stand-in geometry checks are not app evidence.
Raw external text, archives and reference images remain outside this repository.

Plum seed is worth retaining as a curated digital-paper companion. It adds a
discrete, irregular two-ink texture between the existing quiet grain and larger
flowers. It does not replace or redraw any current paper.

| Paper | Visible distinction | Reverse | Positioning |
| --- | --- | --- | --- |
| Plum seed | 196 small elliptical seeds, jittered positions and varied angles; plum/sage on pale oat | Corresponding oat/wheat seeds on plum | Fixed finite sheet; quarter-turns only |
| Existing Seed dashes | Regular 16×16 grid of identical straight brown dashes | Plain sage | Existing half-cell presets remain available |
| Existing Oat linen | Much finer, low-contrast broken fibres, nearly solid at board scale | Muted plum fibres | Existing fixed placement |

The actual jacket views show the distinction: Plum seed keeps visible marks on
its body and contrasting collar/sleeves, Seed dashes makes regular horizontal
rows, and Oat linen stays quiet. The seed marks also remain legible on a small
8 cm clutch beside a 16 cm boat-neck top and a 20 cm skirt. All four turns are
usable without a privileged motif landing, which supports the curated placement.
This editorial label is not a claim of physical-paper testing.

No second paper was added. Existing Corner bloom and Plum scatter already let
the owner position flowers. Another blossom would need a distinct, demonstrated
visible use on the actual capelet/accessory study before earning another swatch.

## Registration and honest limits

The back is drawn through one explicit horizontal canvas reflection, applied to
both seed centres and ellipse orientations. This does not assume that an external
reflection formula matches the engine. Tests sample the actual front/back texture
matrices at all four quarter-turns and compare the drawn seed contours at the
same material points, allowing only one pixel at reflected antialiased boundaries.
All four turns have zero unmatched contours.

Seeds are finite motifs. Their full rotated ellipses lie inside the original
square; the minimum material-space edge clearance is about 0.00384 units on the
`[-1,1]²` sheet. The longer seed diameter is 3% of the sheet side. There are
145 plum and 51 sage seeds on the front; the same material positions use the two
reverse inks. They are not claimed to form a seamless repeat.

There is deliberately no `placement` property. The existing print-position dialog
plainly says that placement is fixed. Unsupported URL offsets normalize to zero;
all eight face/turn raster comparisons remain pixel-identical when such an offset
is supplied. Existing papers keep their current sliding or preset behavior.

## Verification

- Node 24 typecheck, full existing `npm test`, build, and the new seed-bound check
  pass. Seed generation is deterministic, every whole ellipse stays bounded,
  both inks are present, and unsupported positions normalize safely.
- Exact PR24 comparison: all 26 prior papers, 52 front/back rasters, names,
  curation/visibility and relative picker order remain unchanged. A further 96
  supported-offset face rasters match: all Seed dashes presets and two bounded
  positions for each sliding paper, each at all four turns.
- Actual Chromium renders: jacket, pleated skirt, clutch and boat-neck top at
  every new-paper turn, front and back. Matched cameras compare Seed dashes and
  Oat linen. Real Fold/Back preserves the print; before/after views are retained.
- A mixed board keeps the new captures and an existing Plum scatter offset
  independent. Move, remove/Undo, reload and a real 1800×2100 PNG pass. The
  390×844 and 320×568 controls remain reachable with no horizontal overflow.

No geometry, size recommendation, stored-capture interpretation, board cap,
camera, renderer, default paper or existing paper art was changed. These are
software-WebGL/browser-emulation checks, not physical paper or real-phone use.

Run from the repository with Node 24 and local Vite servers:

```sh
DEV_URL=http://127.0.0.1:5303 \
BASELINE_URL=http://127.0.0.1:5313 \
CAPTURE_DIR=/path/to/isolated-output \
node scripts/check-companion-papers.cjs
```

The baseline must serve exact PR24. `BASE_URL` is accepted if `DEV_URL` is absent.
`PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE_PATH` can identify an existing test
installation. The browser check also runs `scripts/check-plum-seed.ts`. It uses
only disposable contexts, never the owner's browser storage.
