# Design expansion and curation study

Isolated draft work based on merged source PR17 `9e3fa0af830c4dccaa554c9e7bdec2b77be6ec96`.
That merge has the same tree as its accepted candidate
`f3f735cd68d784ca3850dafdefa8030124d3088f`; both are ancestors of this branch.
Production source/site publication remains the separate PR17/33 work. This study
does not modify the website repository, merge, deploy, or change hosting.

## Four candidates, strongest first

| Candidate | Recommendation | What is actually implemented | Limit |
| --- | --- | --- | --- |
| Running stitch | Curated paper | Deterministic cream dash squares on blue-grey, clay reverse with fine marks | Printed marks, not thread. Fixed placement; quarter-turns work. |
| Folded sash | Promising accessory experiment | Five operations on a separate complete square; printed bar and reverse upper border; independent paper/turn/offset; central waist placement | A small placed accent, not a belt, tie, knot or paper lock. |
| Arc study | First experimental paper | Three open arcs, mirrored material contours on the reverse; bounded artwork sliding on both sides | Large motifs are cropped or buried by folds. Some turns are weaker; there is no universal best placement. |
| Pointed tabard | Lower-priority silhouette experiment | Seven operations on one retained square; narrow straight body, pointed hem and reverse upper band | Reads partly as a pennant. No neck opening, arms, ties or reviewed accessory anchors; keep experimental. |

The tabard was widened from an early narrow version so it reads less like a necktie.
An early sash with two return strips buried the entire printed face; it was rejected.
The retained sash folds its border first, narrows from behind, then turns back to reveal
a printed centre. New geometry remains crease-based, with original material coordinates.
There is no engine rewrite, mesh morph, cutting or arbitrary shape slider.

Previous studies were inspected before designing: the Library Sol61 fold report and
the source's integrated/divided-silhouette notes. Apron, clutch and one-shoulder tunic
already exist and are not new candidates here. Bridge culottes require a three-square
assembly with unproved joins; the held-open fork loses its split at closure. Lantern,
riding panels, radial badge, cape/bolero, robe and trousers remain parked. This pass does
not pretend the tabard is a pair of trousers or a physically wearable garment.

## One scroll, modest guidance

The paper picker uses its existing single scroller, with `Curated` and `Experiments`
markers. The first eight papers are Stripe and disc, Running stitch, Pinstripe and lining,
Plum scatter, Border print, Botanical sprigs, Indigo lattice, and Ivory, ink border.
This favors visible body/trim contrast, readable small motifs, and established useful
placements. Stripe and disc remains first to preserve the familiar default.

Arc study begins the experimental group, followed by every remaining old paper.
This group means bolder, sparse, or more placement-dependent choices; it does not mean
the old papers stopped working. All 19 previously visible papers remain visible,
with the same IDs and artwork. The two existing diagnostics keep their previous hidden status.
Selecting or following a URL to an old paper still resolves it directly.

Design keeps the original five collection garments first, then clutch, apron, tunic and
tabard in the experimental group. Accessories keep their existing five choices first;
Folded sash follows under `Experiments · separate square`. Experimental construction
and placement limits stay visible on short screens as well as desktop.

Defaults, existing URLs, fold options, per-design in-memory progress, separate-sheet
print state, original attachments, pinboard behavior and save semantics are retained.
No localStorage/sessionStorage writes, deletions, migrations, backend or accounts are added.
Tabard holds a completed accessory aside, like the other unsupported silhouettes.
Sash uses only the existing central waist anchor, with its complete footprint checked.

## Verification and limits

- Node 24: `npm ci --offline`, `npm run typecheck`, `npm test`, `npm run build` pass.
- Exact baseline comparison: all 42 old front/back raster hashes, eight original garment
  operation lists, and five original accessory constructions/transforms match PR17.
- New geometry: retained area 4.000 for each square; 81 poses per operation; rigid edges,
  material connectivity, endpoints, reversible controller, reset, floor clearance and
  strict triangle-interior piercing checks pass. Tabard has 10 final facets and worst
  sampled hinge gap 0.0220; sash has five facets and gap 0.0165. Lowest vertex 0.0015.
  Normal-projection reverse shares are about 13.9% and 38.5%; these are diagnostics,
  not measurements from a perspective camera.
- Complete polygon-footprint audit: 442 offered accessory placements across supported
  garment variants, zero area outside retained paper, including the new sash.
- Actual Chromium software WebGL renders: desktop 1100×800; emulated phone 390×844 and
  844×390; Fold/Back, half-fold poses, Front/Angle/Back, four paper rotations, shifted
  front/reverse views, independent accessory print/edit, design round trips, URL reload,
  old final swatch reachability, pinboard and a real 1600×1200 PNG export.
- Arc study masks: corresponding printed contours agree after reverse mirroring at
  four rotations and three offsets (within fewer than 64 antialiased boundary pixels
  per 1024² canvas). Stationary background/grain and changed ink pixels checked separately.
- New tabard camera: both zoom limits and three azimuths stay at or above table y=0.025
  in all three viewports. No horizontal page overflow or page exceptions in passing runs.

The evidence is local headless Chromium plus visual inspection in the Codex browser.
It is not Safari, real iPhone play, continuous collision certification or a physical
paper trial. Coplanar contact, tangency, finite thickness, fold stability and motion
between sampled poses remain untested. No independent design reviewer was assigned.

The initial browser harness assumed Attach/design switching kept a particular mode;
the app correctly returned to Display after Attach and Workshop after switching designs.
The harness was corrected to follow those existing transitions. Passing result files,
rather than the discarded incomplete harness runs, are the acceptance evidence.

## Reproduce and play

Use Node 24, `npm ci`, then `npm run dev`. The normal app includes the candidates.
Try `?paper=running-stitch`, `?paper=arc-study`, or
`?design=tabard&paper=running-stitch&step=7&view=display`.
Finish Dress, Box jacket, Wrap skirt or Pleated skirt; choose Folded sash under Accessory.
Give the sash its own paper, Fold five times and Attach. It is kept aside on the vest
and unsupported silhouettes because they do not offer a central waist anchor.

`npm run check:curation` is included in `npm test`. Optional browser scripts use a
Playwright installation supplied via `PLAYWRIGHT_MODULE` and a Chromium executable via
`CHROMIUM_EXECUTABLE_PATH`. Serve the final production build at `BASE_URL` (default 4183),
the current source at `DEV_URL` (5183), and an untouched exact PR17 source at
`BASELINE_URL` (5184). Run `scripts/check-curation-ink.cjs`, then
`scripts/check-curation-browser.cjs`. The CI workflow creates that pinned baseline.
`FLOW_ONLY=1` exercises just the accessory/mobile section for focused debugging.

The Library packet includes a comparison/report, images, source hashes, raw captures,
test results and a frozen built preview. Full screenshots are omitted from Git to keep
the draft small; summary sheets and passing results are retained here. To play the
downloaded frozen preview, serve the packet's `preview` folder over localhost HTTP.
