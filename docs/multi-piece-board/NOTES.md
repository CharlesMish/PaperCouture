# Retained multi-piece pinboard candidate

This branch is for owner review only. Nothing has been merged to main or published to cmish.dev.

## Base and scope

Rechecked main at `05bba444` and all open PRs before branching. Main predates the current garment collection and pinboard. The candidate is based on `experiment/integrated-studies-20261004` at `bbb466aeca7555a5e8f39dbe2b3af3acbc8c7846`, which incorporates the live source `ce3431b54492cd01553219087fa1a257e720c0c6`. The live page still identified `ce3431b` during inspection.

The PR targets that integration branch. There is no dependency on unaccepted PR19's print badges, accessory paper changes or wording, or PR20/21's swatch/arrow changes. Only the two existing relevant CI timeouts are extended to 60 minutes so their full software-rendered checks can finish; no unrelated design changes were imported.

## Five-minute owner workflow

Use the local candidate at http://127.0.0.1:5196/ (or the packaged production build served over HTTP).

1. Choose **Box jacket**, a paper, and finish its six folds. **Display → Pinboard → Pin current piece** captures it. Move it up with the move buttons or drag its paper.
2. **Return to folding**, choose **Wrap skirt** and a different paper, finish its folds, then **Display → Pinboard → Pin current piece**. Move it below the jacket.
3. Tap either visible piece or use **Selected**. Tilt and move only that piece. Overlap them and try **Bring forward / Send backward**. Choose Linen, Rose or Slate.
4. Try **Remove selected → Undo**. Return to folding, change the current paper or start over, then use **View board**. The captures should be unchanged.
5. Reload the same origin, open **View board**, and **Save PNG**. Confirm the download includes both pieces in their visible order at 1600 × 1200.

A completed single-square accessory can also be pinned from **View board** before attaching. For a two-wing bow, finish both wings and Attach, then choose the bow-only entry under **Capture**. A garment capture includes its currently visible attached accessory and optional centre. This adds no mannequin, wardrobe, new geometry, or new paper designs.

## Behavior and limits

- Opening/closing the board never pins implicitly. Each press of **Pin current piece** deliberately adds another independent capture, including repeated captures of the same design.
- Four pieces maximum. Original relative size is retained; a fixed orthographic 4:3 board and bounded placement keep the supported shapes on the canvas. No board panning or scaling. Tilt is -12° to +12° per piece, as in the original board.
- Visible paper hit testing selects the frontmost piece. Empty-space drags do nothing. Touch cancellation restores the starting position. Move buttons and canvas arrow keys provide alternatives; native selects reach pieces hidden behind another.
- New pieces start in front. Entire pieces occupy non-overlapping depth intervals, including accessories, so layer controls agree with both picking and PNG occlusion. The selection outline is excluded from export.
- Undo retains the last 20 board edits in this tab. Removal is immediate and recoverable with Undo; there is no bulk clear. Undo history does not persist through reload. Background, captures, positions, tilts, layer order and selection do persist.
- No read or write uses Charlie's personal browser profile. Test data is confined to fresh Playwright contexts.

## Persistence and compatibility

The inspected source had no localStorage/sessionStorage save model: it encoded the current garment's design/options/paper/turn/print offset/step/view in the URL, and discarded the original board on close. There are no legacy retained-board records to migrate. Those existing URL semantics are unchanged; unfinished accessories and other design progress still have their previous tab lifetime. Only explicitly pinned work is newly durable.

A separate `paper-couture.pinboard.v1` record has an explicit version 1 schema. Each item stores the exact posed vertex/normal/UV/color buffers and visible part matrices plus bounded procedural paper ID/turn/position/side descriptors. Hidden accessory parts, guides and stand are excluded. Geometry never needs to be refolded on restore. Ink is regenerated from the same unchanged procedural paper implementation; a future paper redesign would need to retain/version that implementation for old boards.

Loads validate version, counts, arrays, finite bounds, references and known papers before creating GPU objects. Saves are capped at 2 million JSON characters and four pieces (the four-piece browser fixture used 87,506 characters). Unknown/corrupt records are preserved and warned about, never silently replaced. Only this one namespaced key is written; URL links and unrelated storage remain intact. Quota/access failures preserve the last successful save, retain the current in-memory board, expose **unsaved** on the workshop launcher, and offer **Retry saving board** and PNG export. Unsaved navigation requests the browser's normal beforeunload warning. Compare-and-save detects another tab's changed record instead of overwriting it. Browser-private storage is device/origin-specific; clearing site data removes it. PNG is an image, not an editable-board backup.

## Validation and evidence

- Node 24: typecheck, existing full npm test suite, new board storage/model tests, production build.
- `scripts/check-board-browser.cjs`: actual button-driven top and bottom folding, explicit add/cancel, retained source invariance, style/return/reset/reload, exact geometry/UV capture, 1600×1200 composite export, exact render/export byte comparison, overlap visibility and picking, layer reversal, removal/Undo, four-item limit, stable GPU counts, failure/retry and concurrent-tab protection. Fresh 1280×900 desktop plus 390×844 and 844×390 touch emulation.
- `scripts/check-positioning-browser.cjs` keeps print registration/offset and full bow/centre coverage, adapted only for explicit pinning and persistent board semantics.
- `scripts/check-curation-browser.cjs` retains the curation/sash workflow and explicitly pins before exporting.
- [Desktop composition](desktop.png), [phone portrait](phone.png), [phone landscape](landscape.png), [actual composite PNG](composite.png), [focused browser result](browser-results.json).

Phone screenshots are emulation, not physical-phone/Safari feel. The bow centre note is an inspection item; no speculative geometry or guide change is bundled. Its existing center-square and handle behavior is exercised in the positioning checks; absent a reproducible owner screen, the reported oddity remains unconfirmed.
