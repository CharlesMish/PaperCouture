# Visual piece chooser

Charlie requested finished previews and a stronger ordering for the collection.
Browse pieces opens a responsive, keyboard-accessible modal with all 27 current
main designs. Kimono, Coat-dress, One-shoulder gown, Folding fan and Zori lead;
the compact name selector follows the same order. Existing design IDs, default
entry design, saved board records, geometry, materials and fold choices remain.

Previews are generated from finished default material facets, including each
piece's display rotation. They use neutral front/back colours and individual
framing; they are shape previews, not a promise of physical paper foldability or
relative outfit scale. Patterns are selected in the existing workbench. Each
piece is folded separately and combined using the existing twelve-piece board.

Run `npm run previews` after geometry changes. `npm run check:previews` checks that
the committed previews match the actual construction. The generated preview
module loads only when opening the gallery, avoiding runtime construction of 27
timelines on a phone. New registry designs remain discoverable even before an
editor assigns them a position in the presentation order.

`check-design-picker-browser.cjs` checks all previews, order, modal keyboard and
focus behaviour, selecting through both controls, progress/paper/options/board
preservation, reload and horizontal bounds at 1280, 390 and 320 px. This is browser
emulation, not a physical-phone or Safari test. The existing phone journey is also
run because the extra button changes workbench layout.
