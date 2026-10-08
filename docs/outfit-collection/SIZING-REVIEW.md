# Independent sizing and capacity review

**No unresolved findings in the scoped sizing/cap changes.** One P3 disabled-control regression was reproduced, reported, fixed by the implementation owner, and independently rechecked. No production repository files were edited by this review.

Review source: `collection-candidate` versus `feb9cc80f5ca0da7ef2e49619665458c2f923c5a`. Runtime snapshot base was `8a73e283d54be04246d94cf262a3b594ae30c475` plus the root's uncommitted cap-five/UI overlay, recorded in `sizing-review-overlay.diff`. Final focused recheck copied only the owner's updated `src/ui/pinboard.ts` into that private snapshot and rebuilt it.

## Resolved finding

**P3 — Starting-square selector was re-enabled after export despite no finished source.** `src/ui/pinboard.ts` set `size.disabled` only in `refreshSize()` (line 166), while `exportPNG()` restored every select and called only `refresh()` (lines 329–330). With a saved board and an unfinished workshop, triggering PNG failure changed the empty Starting square size select from disabled to enabled. No board data was lost. The owner added the missing disabled-state restoration to `refresh()` (now line 243). Reproduction changed from `before: true, after: false` to `before: true, after: true`.

Evidence: `export-disabled-result.json` and `export-disabled-fixed-result.json`. The test forces `toBlob(null)` in a fresh synthetic browser context and does not touch any user storage.

## Verified reasoning and execution

- Uniform positive scale is baked into capture part matrices. Geometry attributes, UVs and paper recipes are unchanged; restore still consumes only the frozen snapshot, so descriptive `paperSize` is never reapplied.
- Legacy records do not gain metadata or inferred physical dimensions on load. The new parser's optional bounded metadata and old snapshot parser are compatible for records within their respective item-count limits. The previously documented old-reader rejection of five-item records remains a capacity compatibility limitation, with bytes preserved.
- `copyBoard` still shares immutable snapshots and now also immutable size descriptions; no mutation path resizes an existing board item. Changing a future Starting square size choice leaves captured state unchanged.
- All eleven supported jacket/vest accessory combinations were captured in the standalone and attached paths using the actual Pin UI. Non-bow source dimensions matched within 2e-6 in every dimension, including the upright rotated tulip. Bow centre, two-wing assembly and three companion-square labels were inspected separately.
- Sixteen-centimetre garment captures correctly proportioned their companion-square metadata. Removal/Undo and reload preserved the serialized captures. At 320×568 the size selector stayed 168px wide, controls were reachable, and no horizontal overflow occurred.
- Private production build and `check-sizing.ts` passed. Runtime checks had zero page exceptions. The owner also wired the sizing unit/browser checks into the combined test/CI path during review.

The vest/sash combination is intentionally unavailable: sash needs the centre waist anchor and vest has only side panel anchors. The review harness initially tried this unsupported pair, then excluded it and completed all supported pairs. This was a test assumption, not an application regression.

## Limits

This pass targets sizing/capture/cap behavior, not a fresh artistic or foldability review of the new garments and papers. The runtime harness skipped fold animation with the diagnostic controller, then used actual capture/selection/Undo/reload controls; the main implementation tests cover complete fold flows. It used headless Chromium with software WebGL and synthetic browser profiles, not physical iPhone/Safari testing. Final mixed-outfit visual acceptance and full combined CI remain the implementation owner's checks.

`accessory-review-results.json` contains all eleven passing cases. Supporting 320px screenshots are `review-jacket-tulip-320.png`, `review-jacket-bow-320.png`, `review-vest-tulip-320.png`, and `review-vest-bow-320.png`.
