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

| Piece | Finished dimensions from a 20cm square | Proposed square | Resulting board dimensions |
| --- | --- | --- | --- |
| Collared capelet | 2.000 × 1.000 | 14cm | 1.400 × 0.700 |
| Ankle boot, each direction | 1.450 × 1.217 | 8cm | 0.580 × 0.487 |
| Existing Box jacket | 1.676 × 1.140 | existing20cm | unchanged |
| Existing classic Wrap skirt | 1.640 × 1.270 | existing20cm | unchanged |

Changing the starting square uniformly preserves folds and print registration. Extra creases are not added simply to shrink these pieces. Defaults are coordinated in the integration branch; this helper does not change existing defaults or saved captures.

The capelet widens downward, opposite to the boat-neck top, but shares the hat's broad six-edge outline. Its reverse collar and use as a shoulder layer must earn its place in a mixed outfit. It pairs better with the tall cross-wrap top: the 14cm capelet leaves roughly 0.51 board units of that top below it when their top edges align. It would hide almost the entire short boat-neck top, so it is not advertised as a universal layer over every design. The raw foot has a flat toe, projecting shaft and diagonal heel edge; it can resemble a soft folded stocking, and does not claim a shaped three-dimensional shoe sole.

Recommended acceptance composition: cross-wrap top, classic skirt, capelet, and two separately pinned boots, using the existing five slots. The pair at8cm plus0.12 units of gap spans1.28 units, smaller than the skirt's1.64 width. Integrated portrait readability, bounds, layering, Undo/reload/export and performance remain the coordinated branch's acceptance tests.

## Print placement diagnostics

`check-companion-visibility.ts` uses the existing real-engine `paperLanding` helpers to generate source-canvas visibility maps at all four pattern turns: print and reverse seen from Front and Back, with9,216 material samples per design. Coordinate inverse and visible-area invariance pass. These are flat normal-projection maps, not exact visibility predictions for a tilted camera; raised flap edges can obscure small regions in the actual Display presets. No blossom radius or synthetic flower mask is assumed.

- [Capelet source-canvas maps](visibility/capelet.svg)
- [Toe-left boot maps](visibility/boot-left.svg)
- [Toe-right boot maps](visibility/boot-right.svg)
- [Machine-readable diagnostic](visibility/results.json)

Actual Corner bloom before/after offsets and quiet-paper fold progression are captured by `check-companion-folds-browser.cjs`. Browser emulation remains distinct from a physical-paper or real-phone trial.
