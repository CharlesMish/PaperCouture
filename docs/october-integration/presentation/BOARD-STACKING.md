# Board stacking integration

Charlie requested the board change from Claude's kimono-companions work be
integrated into the newer twelve-piece corkboard branch. This pass starts from
PR35 head `e49ffa9057f98931550caf9642d74e52639a8eb0` and narrowly ports the
placement logic from `5a7fd8e20eed56a2797480adfc77885a2eeb5eaf`.

## Behavior

Previously, each capture sat above every earlier capture, even when they were
far apart. Now captures whose axis-aligned XY bounding boxes do not overlap
rest at the board depth. Where boxes overlap, later captures sit above earlier
captures with the existing `.025` clearance. Bounds include the complete
captured garment and any attached accessory. The test is conservative: empty
space inside a box can still cause stacking.

Pins and figure guides remain separate decorations. Pins follow the visible
paper surface and stay hidden when another piece covers their attachment
point. The twelve-slot limit, both board formats, cork finishes, guide controls,
photograph mode and capture geometry are retained.

There is no save migration or new stored field. Opening a board preserves its
saved contents. Its rendered shadows/depth may intentionally change, including
on Original board; restoring the previous global depth staircase would defeat
this correction. Reordering, moving, tilting and Undo recompute depth from the
current arrangement.

This is not a merge of Claude's complete branch. The new kimono, gown,
coat-dress, zori, fan and classic-paper work remains separate, as do Claude's
fan-instruction corrections. The shared fold engine and paper artwork are not
changed here. PR35 remains the integration destination; the separate website
is not updated by this pass.

## Verification

The focused production regression is
`scripts/check-board-stacking-browser.cjs`, added to the existing October
phone-and-board CI job. It uses real retained mitten captures in isolated
fixtures, then real board controls. It checks:

- Twelve disjoint captures at board depth, surface-following pins, capacity,
  unchanged saves and identical 2400 × 2800 exports after reload.
- Overlap clearance, a separate third piece, Bring forward, hidden covered
  pins and exact Undo export restoration.
- Moving and tilting out of a stack, reset into it, Undo and reload, with
  unchanged captured meshes and material records.

The same twelve-capture fixture was first rendered on the unmodified PR35
head. It reproduced the old depth staircase: the first capture's minimum z
was `-.10`, while the twelfth was about `.3202`, despite no boxes overlapping.
The candidate places all twelve at `-.10`.

Local Node 24 validation passed: clean `npm ci`, typecheck, the full `npm test`
suite and production build. All five production browser gates passed:

- Focused stacking regression (twelve separated pieces, overlap, pins,
  movement/tilt, Undo and reload/export identity).
- Existing Roomy board regression, including twelve actual mixed captures,
  capacity, format bounds, and touch cancel/commit/Undo at 390/320 px.
- Existing presentation regression, including actual pin placement, excluded
  guides, photograph/export pixel parity, stable GPU resource counts and
  finishing controls at 390/320 px.
- Existing independent-guide regression (movement, size, bounds, saved state,
  Undo, export and touch/keyboard controls).
- Existing board-review regression (primary-button hover, guide/paper
  selection handoff and constant guide stroke weight).

[Compact machine results](STACKING-RESULTS.json) retain the baseline/candidate
depths, export hashes and each gate's checks. The first focused test attempt
asked the tilt control for 17 degrees, outside its existing -12 to 12 range;
the harness was corrected to use 12 and rerun successfully. The application
range was not changed. No application failure required a broader repair.

Browser execution uses Chromium 141.0.7390.37 with software WebGL and emulated
touch, not a real phone or Safari. Historical default-guide PNG comparison
against the old Chromium runtime was not requested; the current guide/Undo
and export checks passed in this runtime. Physical-paper foldability is
outside this board change. Exact-head GitHub CI is reported in PR35 rather
than inferred from the preceding head's green status.
