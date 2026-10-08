# Independent integrated bow-centre review

The production build was copied to a private temporary directory before starting
the review, then served under `/play/paper-couture/` with the project's restrictive
site security policy. `build.json` records the exact built JavaScript entry.

The reviewer used the actual UI throughout the accessory flow. A URL started with
the dress already folded; the bow wings and centre were folded with the interface
buttons, not controller jumps.

Passed cases:

- Fold both bow wings and attach the existing two-piece bow.
- Choose Cut-paper mosaic for the wings at 180°, separately from Tidal bands on
  the garment at 0°.
- Start the centre, choose Midnight orchard at 90°, fold twice, go Back once and
  return to the garment. Both wings remain complete and attached.
- Resume the partial centre at its exact saved step and paper turn.
- Start its next animation and press Start over while it is moving. The centre
  resets; returning to the garment retains both wings.
- Fold all five centre steps and Attach centre. The complete third component is
  visible, with its independent paper and turn; garment and wing papers are intact.
- Hide and show the folded centre without losing any completed folds.
- Revisit the dress side folds, choose Wide flare and refold. The complete
  three-piece assembly and all three paper selections/turns return correctly.
- Edit the completed centre, unfold two steps and return. Only the incomplete
  centre is hidden. Resume its saved step, finish and attach it again.
- At 390×844 and 844×390, show/hide, Edit centre and Back to garment remain usable
  through ordinary pointer clicks. The landscape toolbar scrolls horizontally;
  there is no horizontal document overflow.

No console errors, page exceptions, failed network requests or policy violations
were recorded. `result.json` contains the observed state after every checkpoint
and the responsive layout measurements.

The assembled desktop image shows a distinct centre, and the portrait view leaves
the garment visible between the controls. The landscape view fits a smaller
garment; the fold/centre controls remain reachable in the scrolling top strip.

This is headless Chromium with a touch-enabled emulated viewport, not Safari or a
real phone. No physical paper was folded. The geometric validity of the centre is
covered separately in `../trousers-centre/NOTES.md`.

Rerun after a production build:

```sh
PLAYWRIGHT_MODULE=/path/to/playwright \
CHROMIUM_MODULE=/path/to/@sparticuz/chromium/build/index.js \
node scripts/check-centre-review.cjs
```

No application source was changed by this independent review.
