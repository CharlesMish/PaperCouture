# Cross-front robe — parked after visual review

The candidate retains one square and has a genuine overlapping front with a turned reverse-colour edge. It is **not accepted into the garment picker**. The outward sleeve flaps expose a large reverse-colour shawl across the chest, with an awkward narrow point where it meets the body. That region dominates both plain paper and Cut-paper mosaic. The result does not meet the proposed restrained robe, even though its construction is coherent.

The lead independently reviewed `plain-front.png` and the Mosaic front capture and agreed to park it. No new fold primitive, hidden material, painted seam or engine change was used. A future robe should investigate a different sleeve/material allocation; simply shortening the current corner folds leaves almost no projecting sleeve. Further iterations are outside this batch.

## Evidence

- `rendered-study.jpg`: actual existing Three.js `SheetView`/`Stage`, front, angle and back, with plain two-sided paper, Cut-paper mosaic, Reverse garden and Botanical sprigs. Common camera framing, no decorative interface. The top reverse area stays visually dominant across papers.
- `plain-front.png`: larger plain-paper front capture.
- `probe.png`: exact resting facet polygons alongside the current A-line dress and Box jacket, front and back at common scale. This is a geometry plot, not a gameplay screenshot.
- `browser-errors.json`: no browser page exceptions from the study captures. This was an isolated Vite study page; no end-to-end application interaction claim is made.

## Construction and checks

`crossFrontRobeStudy.ts` is deliberately under this documentation directory, not `src/fold`, and is not registered or imported by the application.

- Nine operations: `robe-edge`, `robe-turn`, `robe-left`, `robe-left-sleeve`, `robe-right`, `robe-right-sleeve`, `robe-back`, `robe-hem`, `robe-front`.
- All fold operations lift toward the viewer; the hem uses an explicit turn-over and reveal.
- Material area: 4.000000 (complete square).
- Final facets: 10. Final width × height: 1.436670 × 2.000000 (initial square side = 2).
- Maximum stack offset: 0.051000.
- Worst sampled hinge gap: 0.038500; existing limit 0.044000.
- Lowest sampled vertex: z = 0.001500, above the table.
- `scripts/check-robe.ts` checks every resting state's area/rigidity/connectivity, operation ID uniqueness, upward fold senses, shared endpoints between steps, and 41 samples per operation for hinge gaps and table penetration. It passed after archiving the construction.

Earlier diagnostic probes included an extra neck-band fold and varied sleeve angle. The neck-band doubled already stacked material; some choices exceeded the existing hinge-gap limit. Removing it made the final archived candidate pass the existing geometry gate, but did not fix its visual problem. A deep hem was also rejected because it left small lateral tabs; the archived sequence only turns the existing hem points.

These results do not prove physical foldability or continuously collision-free folding. The study was not tested on real paper, a real phone or Safari, and was not taken through accessory or four-turn interaction tests after the visual rejection.

## Reproduce

From the repository root, using the existing project dependencies:

```sh
node --import tsx scripts/check-robe.ts
node --import tsx docs/geometry-collection/robe/probe.ts
python docs/geometry-collection/robe/plot.py
```

The optional polygon plot uses Python matplotlib. `capture.cjs` starts its own Vite server and captures the actual renderer; it needs Playwright with an available Chromium, supplied externally if necessary:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright \
CHROMIUM_EXECUTABLE_PATH=/absolute/path/to/chromium \
node docs/geometry-collection/robe/capture.cjs
```

The capture recreates individual PNGs for all twelve views. `study.html` may also be opened through the usual Vite dev server at `/docs/geometry-collection/robe/study.html?paper=plain&view=front`. `paper`, `view`, `turn`, `step` and `progress` support focused study. The page imports the archived construction and existing renderer directly; it does not change the main application.

No attachment anchors or edge-highlight tags are proposed for integration because this garment is parked.
