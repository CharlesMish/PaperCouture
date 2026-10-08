# First outfit collection fold review

This candidate adds **Boat-neck top**, **Cross-wrap top**, and a separately pinnable **Folded hat**. Two tops and one useful accessory earned inclusion. The third garment study, Funnel coat, is parked because it looks too much like the existing straight dress; it is not selectable or imported by production code.

All three additions remain clearly labelled experiments. These are intact-square paper silhouettes with credible engine folds, not certified physical models or miniature hollow clothes. Neither top has a cut neck opening or armhole. The hat remains flat; its underside has not been opened into a wearable cavity. There are no newly claimed attachment anchors.

| ID | Role | Steps including turns | Raw finished width × height | Suggested starting square |
| --- | --- | ---: | ---: | ---: |
| `boat-top` | Broad short top with folded neckband | 7 | 1.720 × 0.920 | 16 cm |
| `wrap-top` | Narrower top with crossed printed panels | 8 | 1.137 × 1.345 | 18 cm |
| `hat` | Independent crown and brim accessory | 7 | 2.000 × 0.800 | 8 cm |

The suggestions use the collection's 20 cm reference square. They scale an entire retained sheet uniformly when captured; they do not reshape facets or stretch print. The standalone workshop intentionally inspects each sheet closely; outfit comparisons on the board are the sizing acceptance test. Existing design constructions and accessory transforms were not edited.

## Why these folds

**Boat-neck top:** a folded reverse band creates the broad neckline, two sloping side folds narrow the waist, two tiny shoulder tips are tucked behind, and one deep hem shortens the body. The additional tip fold removes protrusions created where the neckband meets the slanted side creases. The result is a broad short shape that can sit above a narrow skirt.

**Cross-wrap top:** work with the print underneath, bring in two diagonal panels sequentially, turn over, fold the shoulder corners behind, and shorten the hem. The panels overlap lower down; the V above them exposes the continuous backing. Initial side folds left too much reverse across the chest and resembled the previously rejected robe study. The retained version has a smaller lining V (11.5% front exposure in the normal-projection diagnostic) and printed diagonal panels.

**Folded hat:** first put the print underneath and fold the lower panel upward. Shape both crown corners through the whole retained stack, flatten the top, turn over, and lift the brim. Doing the crown corners before the lower panel left rectangular backing wings outside the crown; that sequence was rejected. In the retained sequence the lower panel is inside the crown outline. The final brim turns two layers as one, so its visible face remains printed. Its instructions deliberately do not claim a reverse-colour brim.

**Rejected Funnel coat:** the first narrow-shoulder proportions failed the engine's trapped-flap check. A wider version passed all sampled geometry checks, but its finished silhouette remained too similar to the straight dress. Its source and three rendered views are retained here as a rejected study, excluded from the registry and production module. A broader shoulder-wrap candidate was not added because the existing neckerchief already covers a similar triangular retained-paper construction and the earlier broad cape was rejected on visual grounds.

## Verification and limits

`node --import tsx scripts/check-outfit-folds.ts` checks every intermediate retained material area, rigid transform, seam/closed-edge invariant, unique operation IDs, valley-fold semantics, 81 poses per operation, rigid facet edges, hinge gaps, table clearance, operation endpoint continuity, sampled strict triangle piercing, completed face exposure, all forward/back steps, mid-fold reversal, and reset. All three pass: zero sampled strict triangle piercings; maximum hinge gaps .0220/.0275/.0275 respectively, below the established .044 limit. Material area remains 4. Render-layer gaps are visual separation, not thickness simulation. These checks do not prove continuous collision freedom or certify physical-paper foldability.

`check-outfit-folds-browser.cjs` renders real app Front/Angle/Back views. Evidence uses the existing Pinstripe and lining paper so both sides are distinct and facet orientation is visible. Additional quiet-paper, print-offset and progression review is recorded alongside it. Browser emulation is not a physical-phone or Safari feel test. Integrated mixed-outfit, sizes, board movement, Undo/reload/export and portrait checks belong to the coordinated collection candidate, because this helper does not own board or size controls.

`check-outfit-folds-progress.cjs` also passed all 22 real forward operations, a Back/forward round trip on every design, one rendered 50% pose for every operation, Running stitch Front/Back, positioned Corner bloom Front/Back, four actual pattern turns returning to the original state, and reload preserving the finished step and offset. No page errors. The first harness run used an incorrect exact accessible name for the existing rotation button; correcting the selector resolved that harness failure without an app change. Both browser scripts accept `PLAYWRIGHT_MODULE`, `CHROMIUM_EXECUTABLE_PATH`, `BASE_URL`, and `CAPTURE_DIR` rather than requiring a particular local browser path.

- [Front, angle and back comparison, including rejected coat](evidence/contact-sheet.jpg)
- [Quiet paper and positioned blossom comparison](evidence/quiet-paper-and-position.jpg)
- [Boat-neck progression](evidence/boat-top-progression.jpg), [cross-wrap progression](evidence/wrap-top-progression.jpg), [hat progression](evidence/hat-progression.jpg)
- [Browser result](evidence/progression-results.json), [geometry checks](fold-checks.txt), [existing test suite](test-log.txt)

The quiet-paper review leaves clear broad printed areas on all three designs. Moving Corner bloom can align the blossom with the lower body or hat brim; it cannot make material buried by a real fold reappear on the front. Some of the flower remains clipped by a folded edge in these test positions. That is an honest material visibility constraint, not a reason to change fold geometry or texture coordinates. The folded hat front and doubled brim both show the printed side; its back visibly retains the crown corner flaps.

Final facet counts are modest: 13 for Boat-neck top, 10 for Cross-wrap top and 11 for Folded hat (22, 20 and 22 flat triangles, before the renderer adds paper thickness). These counts inform the collection performance review; they do not alone establish safe board capacity. Typecheck, the existing complete npm test suite, the new geometry check, and the production build all passed with Node 24.

The registry adds IDs without changing any old IDs, constructors, defaults, captures, or stored data. New snapshots can represent these new designs without reinterpreting old snapshots. The existing four-piece PR23 board and preview remain outside this isolated branch.
