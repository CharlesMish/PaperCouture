# Independent review baseline

The reviewer copied the baseline production `dist/` before integration and ran
the existing `scripts/check-feedback.cjs` against that copy under the project's
site Content Security Policy. This is a separate browser run from the lead's
typecheck, tests and build.

Passed in headless Chromium with software WebGL:

- Mouse drag, short-drag rollback and keyboard activation on the hem handles of
  all three existing dress silhouettes.
- At 390 × 844, emulated touch drag, cancellation, tap, reset and background-click
  behavior.
- Handles hidden in Display; the accessory selector says Two-piece bow.
- Vest Display at 1280 × 800, 390 × 844 and 844 × 390, with no browser errors.

The reviewer inspected the portrait and landscape vest images. The garment and
controls remain visible in both; the landscape garment is naturally smaller.
These provide a comparison for any added choice and revisit controls.

Runtime limitation: Sparticuz font extraction initially failed on `chown` in the
execution environment. The reviewer expanded the existing bundled font archive
using `tar --no-same-owner` and reran. No application or browser dependency was
changed. This was browser emulation, not Safari, real-phone or physical-paper
verification.

Transient baseline evidence is in
`/workspace/scratch/8e5030389593/couture-review-baseline/docs/feedback-pass/interaction/`.
Integrated-build evidence belongs beside this note when that review is complete.
