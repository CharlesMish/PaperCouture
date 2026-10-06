# Starting paper sizes for outfits

The envelope clutch and bib apron were being captured at the same starting-square scale as the jacket and skirt. Their fold patterns retain more of the square's width: at the prior common scale, the clutch was 79% of the wrap skirt's width and the apron was 122%. More folds would alter the finished outline, visible paper and instructions. Choosing an appropriately smaller starting square addresses the proportion issue while preserving every fold.

New captures use an explicit convention: a 20 cm square occupies two board units before folding. The workshop remains a close-up for inspecting folds and print placement. The board's **Starting paper** selector offers concrete square sides, marks the suggestion, and applies the choice only when **Pin current piece** is pressed. The selected capture's readout records its square size. Suggested sizes are optional; a common 20 cm square remains available for direct comparison.

| Piece | Suggested square | Previous common-scale width × height | Suggested width × height |
| --- | --- | --- | --- |
| Box jacket | 20 cm | 1.676 × 1.140 | 1.676 × 1.140 |
| Wrap skirt | 20 cm | 1.640 × 1.270 | 1.640 × 1.270 |
| Bib apron | 14 cm | 2.000 × 1.700 | 1.400 × 1.190 |
| Envelope clutch | 8 cm | 1.300 × 1.020 | 0.520 × 0.408 |

The collection candidates use 16 cm for Boat-neck top, 18 cm for Cross-wrap top and 8 cm for Folded brim hat. Their geometry and fold review are supplied separately by the collection work. These are miniature outfit paper sizes, not claims of physically verified wearable garments.

One uniform capture transform scales all posed facets, seams, attached squares and layer spacing. Vertices, normals, UVs, paper rotations and print offsets stay unchanged. The print fills the chosen starting square, so its features scale with the square; this is not cropping a fixed-size printed sheet. An attached accessory's recorded square scales with its garment. A standalone accessory captured from its folding workshop now uses its registry square size; capturing that same accessory after attachment has matching dimensions.

## Existing boards

No automatic migration or resize occurs. Existing version-one matrices, geometry, paper recipes, titles and positions load unchanged; opening the board does not rewrite saved bytes. An earlier capture says its starting square was not recorded, rather than retroactively claiming the user chose 20 cm. New optional `paperSize` metadata describes the already-baked snapshot; restoring it never applies scale again. The old version-one parser tolerates the additive item field. Remove/Undo and reload retain the original snapshot. Failed saves retain the earlier durable record and show the existing retry/PNG warning.

To replace an earlier oversized capture, fold the design again and pin a new capture with the suggested square, then remove the earlier piece when satisfied. Removing it remains undoable. The size selector does not silently resize old saved work.

The reviewed PR23 board extent, camera, export dimensions and four-piece cap are unchanged by this sizing patch. Capacity is a separate integration decision.

## Checks

Node 24: `npm run typecheck`, `npm test`, `npm run build`, and `node --import tsx scripts/check-sizing.ts` pass. [Measured bounds and focused checks](measurements.json) cover retained geometry, uniform nested-assembly transforms, unchanged UV/material data, legacy load identity, optional metadata validation, reload, quota failure and Undo save.

The unchanged `scripts/check-board-browser.cjs` passes against this candidate: independent captures, exact PNG scene, layer occlusion/picking, repeated removal/Undo/reload, 390/320 portrait and landscape touch drag/cancellation, storage failure/retry and cross-tab protection. Browser emulation does not establish real iPhone/Safari feel or physical-paper foldability.

`scripts/check-sizing-browser.cjs` passes same-square/suggested mixed comparisons at desktop/390/320, actual size-selection and capture controls, published-save compatibility, a custom 6.4 cm square, quota/reload/Undo, and standalone-versus-attached accessory parity. Fixed comparison positions are diagnostic placement; actual movement controls are tested separately. The suggested clutch measures 0.520000003 × 0.408000002 across all three viewports; the apron is 1.400000000 × 1.189999992. There are no page errors. The unchanged existing board browser checks also pass.

- [Focused sizing results](browser-results.json)
- [Existing board regression results](board-regression-results.json)
- [Common starting-square comparison](evidence/same-square-desktop.png)
- [Suggested sizes, desktop](evidence/suggested-desktop.png)
- [Suggested sizes, 390 portrait](evidence/suggested-390.png)
- [Suggested sizes, 320 portrait](evidence/suggested-320.png)

These screenshots record the four-piece sizing patch before the separate capacity integration. The test changed the **next** square selector back to 20 cm after capture to prove that kept pieces do not resize; the pinned clutch's readout remains 8 cm. Future captures now restore the selector before taking review screenshots. At 320, the controls scroll below the full board; shortening the introductory hint to one line is recommended for integration so the complete 44 px starting-square selector is visible immediately. The recorded 390 selector is fully visible.

Full-resolution 1800 × 2100 composites remain in the task's `output/sizing-browser/` folder; both desktop comparisons, the 320 suggested board and accessory parity export are byte-identical to the rendered scene with the selection outline excluded.
