# Combined Paper Couture main-site publication

Charlie authorized this publication on 2026-10-08: push the corrections, wait
for GitHub CI, and publish to the main cmish.dev site after independent review.
A separate hosted preview is not required. These instructions supersede the
historical local-only and preview-only restrictions in earlier handoffs.

## Frozen foundation and bounded presentation change

The independently accepted continuity correction is
`3372f86b400fe3c7498ecd85367abd9901a2af19`, based on Claude's PR28 at
`c3145ed82cf4155cc9e35e7f4f3aef0cb291e3bc` and wardrobe PR26 at
`21109e70e9e3a8ecf5da6a5a0a532aacceb6b4f4`.

The only additional application change is in `src/ui/studioControls.ts`:
garments and separately folded accessories each have one selector list, and
their selected notes omit the Experimental prefix. Names, IDs, registry order,
availability, construction-limit text and all selection behavior remain.
Paper categories are unchanged. Geometry, paper art, saved snapshots, board
placement, camera and exports are identical to the reviewed foundation.
Browser assertions now check list membership and the specific limits instead
of requiring an experimental group heading.

The metadata and design documentation retain construction limitations. A
single collection is a presentation choice, not a claim that every design is
physically foldable. The documented synthetic hinge-strip intersections,
Sunray alignment limitations and slight swatch-ring clipping remain.

## Source and site integration

The existing source stack is correction/publication -> PR28 -> PR26 -> PR25
-> PR24 -> PR23 -> `experiment/integrated-studies-20261004`. Merge from the top
with ordinary merge commits, preserving all reviewed ancestry. Each changed
PR head must have passing GitHub checks before the next merge. All six relevant
workflows target every base in this stack; candidate checkouts use exact PR heads.
Separate PR19/20/21 and the duplicate Sunray-only PR27 are not bundled.

Site PR39 is based directly on main `35a40a028e4a90d9a0c4af183074bbadeaecb4ed`
and already contains the complete wardrobe import; it does not depend on
merging older site preview PR37/38. Extend that import once with the final
accepted source head, validate the source hashes, and merge PR39 normally.
Unrelated site and Quarto work must remain unchanged.

The final source and site diffs require the existing independent reviewer's
approval before merge or deployment. GitHub checks must be green for the exact
heads; this document alone is not approval. Verify the public source marker,
asset hashes and desktop/mobile-sized capture, reload and PNG behavior after
main-site deployment. Browser emulation is not physical-phone validation.

## Integration test compatibility

The older PR24 companion-paper suite allowed only Plum seed beyond its frozen
26-paper registry. PR28's Sunray addition is now explicitly recognized as the
second allowed addition. All 52 old face rasters, 96 sampled positioned rasters,
old metadata and old registry order remain exact; Sunray's name/visibility and
experimental paper category are asserted separately. No raster or geometry
threshold is relaxed.
