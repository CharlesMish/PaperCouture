# Room to compose a top and bottom

Owner-review candidate only. No production merge or deployment.

## Diagnosis and lineage

Remote checks confirmed source PR22 merged at `097bb8580282dec1f6332aa71fe851857aa4a204` on
`experiment/integrated-studies-20261004`. The live page's source metadata is
`b47b9805e8e0a0a1de456f2cdfd4a97b2a3c0e59`, whose tree is identical to that merge.
Website PR36 merged at `35a40a028e4a90d9a0c4af183074bbadeaecb4ed`. Source default `main`
remains the older `05bba444be376664aeb8c1c35d0463f5cf59e26f`. This branch starts at
`097bb85`; separate open PR19/20/21 are not included. Task-6 files were read only.

The published movement bounds are the actual posed paper bounding boxes, including
attached accessories and tilt, with a 0.08-unit edge margin. The camera and backing
both cover 3.6 × 2.7 units. There is no extra board hidden outside the camera and no
arbitrary smaller movement rectangle to unlock. The 2.54 usable vertical units are
too short for several top/bottom combinations.

Measured vertical gap at opposite movement limits (negative means overlap):

| Captured pair | Before, 0° | After, 0° | Before, ±12° | After, ±12° |
| --- | ---: | ---: | ---: | ---: |
| Longer box jacket + classic wrap skirt | -0.150 | 1.350 | -0.642 | 0.858 |
| Short lapel vest + pleated skirt | -0.240 | 1.260 | -0.648 | 0.852 |
| Longline vest + long wrap skirt | -0.760 | 0.740 | -1.188 | 0.312 |

These are exact rendered-geometry bounding-box gaps, not an assertion that every
point inside each bounding rectangle is paper. The poses are reproducible from the
published v1 fixtures under `fixtures/`.

## Candidate

Keep width 3.6 and increase height to 4.2. The taller backing, camera, pointer mapping,
movement limits, preview ratio and PNG all use the same layout constants. Garments
are not scaled. Four-piece capacity, 0.08 nudges, edge margin and ±12° tilt stay intact.
The 1.5 extra vertical units cover the largest tested pair plus comfortable clearance
at full tilt. This is room for a single composed outfit, not a promise of 2–3 outfits.

The phone canvas stays 336 px wide at 390 × 844 and 266 px wide at 320 × 568. For example,
the longer jacket remains 156.4 px / 123.8 px wide respectively at zero tilt. Desktop
uses a height-limited preview: the full board remains visible instead of flowing
outside its modal. Short phones keep a separately scrollable tool area. Phone landscape
shows a smaller overview because height is scarce; portrait is the intended composition view.

PNG output is intentionally portrait **1800 × 2100**, replacing 1600 × 1200. It uses
the same fixed orthographic scene and omits selection outlines. Export is an image,
not an editable backup. The filename and selected-background behavior are unchanged.

## Saves and compatibility

No schema or storage-key migration is needed: v1 stores exact captured geometry,
paper descriptors and world coordinates, not a viewport size. The loader/store and
snapshot implementation are unchanged. Old coordinates are a subset of the new
board; opening does not move pieces or rewrite the stored bytes. Existing spacing
remains as saved until the owner moves it. Each old capture keeps its vertices,
normals, UVs, colors, part matrices, paper ID/turn/offset/side and ordering.

New positions still satisfy the v1 parser. An old application build can parse them,
but its smaller camera may clip items moved into the added area; downgrading the
renderer cannot display the taller board. No automatic destructive clamp is added.
Unknown/corrupt saves remain protected; storage failures and tab conflicts retain
their existing warning/retry behavior and previous durable save.

## Checks and evidence

Node 24.16.0: `npm ci`, `npm run typecheck`, `npm test`, `npm run build`.

- `scripts/check-board-space-browser.cjs`: three published saved pairs, 0°/±12°,
  opposite button limits, 1280×900 and 1440×1200 desktop, 390×844 and 320×568 portrait;
  camera/backing/preview parity, no clipping or stretching, phone paper size parity,
  old saves loaded without rewriting, exact captures after movement, removal/Undo,
  reload and byte-identical composite export.
- `scripts/check-board-browser.cjs`: button-driven folding and explicit capture;
  source invariance, independent pieces, layering/picking/occlusion, four-piece cap,
  repeated removal/Undo, resource lifetime, reload, unknown-version preservation,
  quota failure/retry, concurrent tabs; 390/320 portrait and 844×390 landscape touch
  drag, empty-space handling and cancellation. Uses new isolated browser contexts.
- Existing print positioning and curation checks retain front/back, quarter-turn,
  shifted floral ink, accessory/bow-centre/sash and composite coverage. Both existing
  CI workflows remain enabled, plus a separate composition-space job with artifacts.

`evidence/` retains selected before/after screenshots, composites and JSON results.
`review.html` opens a compact comparison on any device without modifying browser saves.
The full local outputs include every viewport and tilt tested.

These are browser-emulation checks, not physical-phone/Safari feel or physical-paper
foldability certification. Owner phone review remains the gate before merge/publication.

## Phone review proposal

First open `review.html` on the phone for the visual comparison. For interaction,
serve this candidate locally over the Mac's private LAN (after choosing to expose
the preview), or approve a separate private preview. Use a separate origin from
the live site. Do not publish this candidate into the live product for testing.

1. Capture a longer jacket and classic wrap skirt; move both apart to taste.
2. Repeat with longline vest/long skirt, tilt each, then drag back to a close waist join.
3. Scroll the tools at 320-ish width; confirm the board remains visible and readable.
4. Move, cancel a touch, remove/Undo, reload and save the portrait PNG.

Physical feel, tool scrolling and the new PNG aspect ratio need the owner's judgment.
The proposed broader design commissions are in [COMMISSION-BRIEFS.md](COMMISSION-BRIEFS.md).
