# Collared capelet and independent ankle boots

This study adapts the supplied capelet and boot crease proposals to the real Paper Couture engine at PR24 `574b2b10cc2894586f2ee3f8c9496035365e6408`. The external stand-in checker and its pictures were treated as proposals, not app validation; none of its scripts was executed. Raw submitted files are deliberately outside this repository.

The current candidates are `capelet`, `boot-left` and `boot-right`. All remain labelled experiments. Each is one intact square, and each boot is captured independently. “Left” and “right” describe the toe direction in Front view, not an anatomical foot. No new paired-sheet assembly, engine mechanism, cut opening, fastening, or wearable cavity is introduced.

## Adaptation and geometry

The capelet keeps its first valley collar fold. A turn-over lets the hem and two shoulder folds be worked as valleys on the reverse, followed by a reveal turn: six operations. Each boot turns over first, folds both thirds, the diagonal ankle and the toe corner as valleys, then turns to the printed front: six operations. The coordinates are mirrored while working from the reverse. The second boot mirrors authored crease coordinates rather than using a negative display scale, so both boots retain the printed front.

`check-companion-folds.ts` compares 1,600 material samples per construction against the proposed mountain endpoints interpreted by the real engine, including material face identity. It also compares 1,600 material samples across the mirrored boot variants. All pass. There is no dependency on the external checker.

Every state retains area 4, closed material edges and rigid transforms. At 81 poses per operation, rigid edge lengths, operation continuity, floor clearance and strict triangle-piercing checks pass. Both directions of the controller, mid-fold reversal and reset pass. The capelet has nine facets; each boot has twelve.

The largest capelet hinge gap is `0.027500000000000156`. The boots reach `0.044` (toe left) and `0.04399999999999999` (toe right), at the end of their final reveal turn. The established limit remains `0.044`; no tolerance was widened. This is the renderer's layer-spacing allowance, and the boot has no margin beneath that gate. Minimum sampled height is `0.0015`; sampled strict triangle piercings are zero. These checks do not prove continuous collision freedom or physical-paper foldability.

[Exact geometry results](geometry-checks.txt) · [Front/angle/back app renders](evidence/front-angle-back.jpg)

## Size and curation

| Piece | Finished dimensions from a 20 cm square | Proposed square | Resulting board dimensions |
| --- | --- | --- | --- |
| Collared capelet | 2.000 × 1.000 | 14 cm | 1.400 × 0.700 |
| Ankle boot, each direction | 1.450 × 1.217 | 8 cm | 0.580 × 0.487 |
| Existing Box jacket | 1.676 × 1.140 | existing 20 cm | unchanged |
| Existing classic Wrap skirt | 1.640 × 1.270 | existing 20 cm | unchanged |

Changing the starting square uniformly preserves folds and print registration. Extra creases are not added simply to shrink these pieces. Defaults are coordinated in the integration branch; this helper does not change existing defaults or saved captures.

The capelet widens downward, opposite to the boat-neck top, but shares the hat's broad six-edge outline. Its reverse collar and use as a shoulder layer must earn its place in a mixed outfit. It pairs better with the tall cross-wrap top: the 14 cm capelet leaves roughly 0.51 board units of that top below it when their top edges align. It would hide almost the entire short boat-neck top, so it is not advertised as a universal layer over every design. The raw foot has a flat toe, projecting shaft and diagonal heel edge; it can resemble a soft folded stocking, and does not claim a shaped three-dimensional shoe sole.

Recommended acceptance composition: cross-wrap top, classic skirt, capelet, and two separately pinned boots, using the existing five slots. The pair at 8 cm plus 0.12 units of gap spans 1.28 units, smaller than the skirt's 1.64 width. Integrated portrait readability, bounds, layering, Undo/reload/export and performance remain the coordinated branch's acceptance tests.

## Print placement diagnostics

`check-companion-visibility.ts` uses the existing real-engine `paperLanding` helpers to generate source-canvas visibility maps at all four pattern turns: print and reverse seen from Front and Back, with 9,216 material samples per design. Coordinate inverse and visible-area invariance pass. These are flat normal-projection maps, not exact visibility predictions for a tilted camera; raised flap edges can obscure small regions in the actual Display presets. No blossom radius or synthetic flower mask is assumed.

- [Capelet source-canvas maps](visibility/capelet.svg)
- [Toe-left boot maps](visibility/boot-left.svg)
- [Toe-right boot maps](visibility/boot-right.svg)
- [Machine-readable diagnostic](visibility/results.json)

`check-companion-folds-browser.cjs` passed all 18 real Fold/Turn operations, a Back/forward round trip on each design, 18 midpoint renders, eight additional 25%/75% ankle and toe views, quiet Oat linen Front/Angle/Back, and actual Corner bloom before/after positions. The capelet and toe-right boot were rendered Front/Back at all four pattern turns; the mirrored toe-left boot has a representative 0° comparison plus its full four-turn material maps. The tested offset is exactly right 12.5% and up 12.5%, applied with real Position print buttons. Completed geometry remained unchanged and reload retained the design, finished step, turn and position. No page errors.

The [selected blossom comparison](evidence/selected-blossom-before-after.jpg) shows two useful cases without a proxy flower shape: at 0° the capelet's original blossom crosses the folded hem, while the tested shift brings the blossom above it. At 90° the toe-right boot's original blossom crosses the side/ankle edge, while the shift places its flower on the shaft. Other turns and offsets can still hide the motif; the printed material cannot be moved independently of its fold.

- [Capelet blossom comparisons at every turn](evidence/capelet-blossom-four-turns.jpg)
- [Toe-right boot blossom comparisons at every turn](evidence/boot-right-blossom-four-turns.jpg)
- [Capelet fold progression](evidence/capelet-progression.jpg), [toe-left progression](evidence/boot-left-progression.jpg), [toe-right progression](evidence/boot-right-progression.jpg)
- [Quiet capelet](evidence/capelet-quiet.jpg), [quiet toe-left boot](evidence/boot-left-quiet.jpg), [quiet toe-right boot](evidence/boot-right-quiet.jpg)
- [Browser result](evidence/browser-results.json)

The extra ankle and toe frames retain a connected sheet visually. The final boot reveal's maximum allowed layer gap is still reported explicitly above; rendered review does not turn a sampled limit into a physical-paper guarantee. Typecheck, the existing full npm test suite, the new geometry/visibility checks and production build pass with Node 24. Browser emulation remains distinct from a physical-paper or real-phone trial.
