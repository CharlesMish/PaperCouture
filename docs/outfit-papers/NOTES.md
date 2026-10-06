# Three outfit companion papers

This is development work on the reviewed PR23 source
`feb9cc80f5ca0da7ef2e49619665458c2f923c5a`. It changes no fold geometry, existing
paper drawing/ID, defaults, board size, stored capture or production deployment.
The larger-board preview remains a separate preserved candidate.

| Paper | Recommendation | Outfit role | Placement |
| --- | --- | --- | --- |
| Oat linen | Curated companion | Warm oat body, muted plum reverse. Fine broken fibres read almost solid at board scale, letting adjacent flowers remain the focal point. | Fixed printed texture. Both faces turn with the sheet. No claim of real linen or woven geometry. |
| Slate grain | Curated companion | Blue-grey body, pale sage reverse. Quiet flecks and a lighter trim offer a different value balance from Oat linen. | Fixed printed texture. No false promise of sliding texture or seamless repeats. |
| Ginkgo pairs | Experimental motif | Four small paired fan leaves on cream with corresponding cream/sage leaves on plum. Useful alongside a quiet bottom or accessory. | Finite ±25% slide; leaves can crop at sheet edges or disappear behind folds. Ground and grain stay fixed. |

The two quiet companions are intentionally less decorative. Existing Running
stitch, pinstripes and florals already offer stronger marks; adding three more busy
prints would not address outfit coordination. These colours connect plum, cream,
blue-grey and sage without requiring every piece to use the same paper. “Curated”
is guidance based on the rendered study, not physical-paper certification.

Ginkgo is separate from Plum scatter: small paired fan leaves, a quieter palette,
and registered ink on both faces rather than blossoms on one face. An initial
rounded outline read too much like hearts and was refined into fan leaves before
the retained evidence. It stays experimental because a sparse design is inherently
placement dependent. There is no universally best turn or offset.

The original first four curated papers remain first. Existing visible and hidden
papers retain their exact art, IDs, names, curation status and availability.
Oat/Slate follow the first four; Ginkgo sits with the existing experiments. Changing
to these papers follows the existing explicit reset-to-original print-position
behavior. No drawing is retroactively changed on an existing saved capture.

## Evidence and reproduction

Run Node 24, `npm run typecheck`, `npm test`, `npm run build`, then serve the
candidate with Vite and run:

```sh
DEV_URL=http://127.0.0.1:5203 \
BASELINE_URL=http://127.0.0.1:5293 \
CAPTURE_DIR=/path/to/isolated-output \
node scripts/check-outfit-papers.cjs
```

`BASELINE_URL` should serve exact PR23 source; it is optional for later runs, but
was supplied for this study. `PLAYWRIGHT_MODULE` and `CHROMIUM_EXECUTABLE_PATH`
can point at an existing installation. Each test uses a new disposable browser
context. Never clear or substitute the owner's browser storage for a test.

The test compares all 46 prior front/back rasters and registry metadata, verifies
Ginkgo's corresponding ink contours at all four turns and three offsets within
one raster pixel, and checks stationary grain, finite clipping and normalized
fixed placements. The gallery covers Box jacket, Pleated skirt, Bib apron and
Envelope clutch at all four turns, with front/back and shifted Ginkgo examples.
Real Fold/Back, retained paper offsets, independent captures, moves, remove/Undo,
reload, composite PNG and 390/320 portrait controls are exercised separately.

This paper-only branch retains PR23 garment sizes. Its mixed-board evidence is a
paper/capture regression, **not approval of the known oversized clutch**. The
integrated collection's explicit sheet-size choices must supply the final mixed
outfit acceptance image. New fold candidates also need their own geometry and
rendered review; the papers do not make a weak construction credible.

These are Chromium software-WebGL renders and browser touch emulation. They do
not establish physical-paper stability, continuous collision freedom or real
iPhone/Safari feel. The [portable commission brief](COMMISSION-BRIEF.md) is ready
for Charlie to copy; no external model was contacted.
