# Balanced outfits: starting paper and a first collection

This isolated follow-up to PR23 makes **new captures use explicit starting-square sizes**, adds **two tops and one independently placed hat**, and allows **five board pieces**. The reviewed PR23 branch and hosted preview remain unchanged. There is no production merge or new deployment in this study.

## Proportions

Every independent design previously started at the same square scale. That worked for inspecting one fold, but gave the apron and clutch too much visual weight beside garments. Actual posed captures, including the clutch's display rotation, measured:

| Piece | Same-square width × height | Suggested square | New width × height |
| --- | ---: | ---: | ---: |
| Box jacket | 1.676 × 1.140 | 20 cm | unchanged |
| Wrap skirt | 1.640 × 1.270 | 20 cm | unchanged |
| Bib apron | 2.000 × 1.700 | 14 cm | 1.400 × 1.190 |
| Envelope clutch | 1.300 × 1.020 | 8 cm | 0.520 × 0.408 |

The clutch changes from 79% to 32% of the skirt's width; the apron from 122% to 85%. Sizes describe starting squares, not finished dimensions. New captures use one board unit per 10 cm. This new convention does not assign a historical paper size to old captures.

**Starting paper** offers a suggested square, smaller/larger alternatives and the source's original square size. Workshop and Display remain close-up inspections. A uniform scale is baked into captured matrices, including attached accessories and seam depth. Vertices, UVs, normals, paper recipes, turns and print offsets remain exact. The control changes the next capture; it cannot silently resize something already pinned. Selected-piece text records the main and accessory square sizes.

Changing starting paper solves this problem without extra creases. More folds would change the silhouette and visible ink, and could introduce trapped flaps. The nine old constructions and six accessory definitions are retained. Independent accessories now have the same small-square proportions whether captured in their workshop or from an attached assembly.

## Collection choices

| Addition | Role | Suggested square | Status |
| --- | --- | ---: | --- |
| Boat-neck top | Broad, short top with folded reverse band | 16 cm | Experimental geometry |
| Cross-wrap top | Narrower crossed panels over continuous backing | 18 cm | Experimental geometry |
| Folded hat | Independent flat crown and brim silhouette | 8 cm | Experimental geometry |
| Oat linen | Quiet oat/plum companion | — | Curated paper |
| Slate grain | Quiet blue-grey/sage companion | — | Curated paper |
| Ginkgo pairs | Positionable paired leaf motifs | — | Experimental paper |

Two useful tops and one accessory earned inclusion. The funnel coat was rejected because it looked too much like the existing straight dress. A broad wrap would duplicate existing triangular accessories and the previously rejected cape. Three or four garments was a target for variety, not a quota.

The new geometry retains the whole square. The tops have continuous backing, without cut neck openings or armholes. The hat remains flat, without an opened wearable cavity. A first hat sequence left rectangular backing outside the crown; changing the fold order resolved it. The doubled brim shows the printed face, and the instructions say so. See [construction review and intermediate/front/back evidence](../outfit-folds/NOTES.md).

Oat and Slate leave room for a focal print. Ginkgo stays experimental because some turns bury or crop its leaves. Its front/back masks register at four turns and three offsets; ground/grain stay stationary. All 46 old paper-face rasters and their identities remain exact. See [paper review](../outfit-papers/NOTES.md).

## Five pieces and persistence

Five supports a specific composition: top, skirt, outer layer, hat and clutch. Board dimensions, camera, portrait scale and 1800 × 2100 PNG remain unchanged from PR23. Six adds texture cost without a clear first-collection need.

A separate capacity audit used actual PR23 captures before integrating the collection. Ordinary mixed five used about 124k save characters and 12 GPU textures. Five dresses with two-wing bows and separate centres used about 254k characters and 32 textures. Remove/Undo counts stayed stable. The two-million-character limit is unchanged. Texture memory, rather than triangle count or JSON, is the reason to remain conservative. Software-WebGL measurements do not certify physical-phone performance.

Old version-one records load without a migration write or inferred size. Frozen matrices, materials and positions remain authoritative. Optional size metadata is descriptive and is never applied again during restore. Damaged/unsupported records, unavailable storage, quota errors and another tab's newer data retain their preservation behavior. Tests never opened or cleared a user browser profile.

Rollback has a practical limit: PR23 cannot load five-item records or recipes for newly introduced papers. Its parser rejects the record and prevents overwrite, preserving bytes rather than dropping pieces. At most four pieces with only old papers remain structurally readable by the old parser; baked scale does not depend on metadata. This separate draft does not expose the live board to that transition.

## Review and further work

Geometry tests cover retained area, rigid facets, seams, reversible controllers, endpoints, table clearance and 81 sampled poses per operation. No sampled strict triangle piercings were found. These checks do not establish continuous collision freedom or physical-paper stability.

Coordinated acceptance covers actual mixed outfits, exact old-board rendering, future-only size changes, old/new captures together, movement bounds, five-piece selection, touch cancellation, layers, remove/Undo, quota/retry, reload and exact PNG at desktop, 390/320 portrait and landscape. Detailed results accompany this document. Browser emulation is distinct from an iPhone/Safari trial.

There are now 12 standalone designs and six attached-accessory types, plus existing fold options. The longer-term 25–30-choice catalogue and 5–10-piece boards remain design directions. Establish phone usability and physical-paper confidence in this set before expanding.

The [portable Claude/Grok brief](../outfit-papers/COMMISSION-BRIEF.md) is ready to copy. Independent proposals are useful now; implementation commissions should use this candidate's exact inventory and await owner review of its proportions and experimental folds. No external model was contacted.
