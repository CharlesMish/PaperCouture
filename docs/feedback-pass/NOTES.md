# Owner feedback: accessible folds and legible lapels

## Changes

- Small moving regions get 44×44 CSS-pixel arrow handles. Either hem handle controls
  the pending paired fold. Mouse/touch dragging has a minimum 72px full-progress
  distance instead of dividing by a tiny paper tip's travel. A tap or keyboard
  activation folds; a short drag or cancelled gesture returns to the same step.
  The normal paper drag, Fold button, Back and Start over remain available.
- Wrap skirt starts with an upward length fold, then turns over for the wrap panels.
  A separate turn exposes the hem points before folding them up; another returns
  to the front. Nine steps. Comparison with the merged version found identical
  final material polygons, rigid transforms and layer levels (rounded to 1e-8).
- Lapel vest turns over before the shoulder and lower-edge folds, and turns back
  afterwards. Eight steps. All skirt/vest folds now lift toward the visible side.
- The vest lapel creases are narrower and shallower: upper point ±0.22 instead of
  ±0.30, inner point y=0.60 instead of 0.45. This preserves more printed shoulder
  and reduces the appearance of a neck opening cut through to the edge.
- Fine depth-tested highlights trace the actual lapel material boundaries, following
  the folding geometry. They distinguish lapels from same-coloured backing in Front
  and Workshop views. They do not change paper art or imply a cut-out opening.
- Bow picker and progress naming use **Two-piece bow**. Each wing is still folded
  separately from its own square; no one-piece bow or knot module was added.

The fold engine, timeline and original dress geometry are unchanged. Existing
silhouette choices remain at the same dress step.

## Verification

Typecheck, the geometry/controller/rotation suite, and production subpath build.
The suite additionally checks stable small-fold drag vectors and rejects mountain
folds in the two revised garments. Existing geometry tolerances are unchanged.

`check-feedback.cjs` checks actual pointer interaction in headless Chromium:
mouse drag, short-drag rollback and keyboard activation for all three dress hem
variants; touch drag, tap and touch-cancel at 390×844; reset during pointer capture;
background clicks; no handles in Display; naming and vest captures at 1280×800,
390×844 and 844×390. See `interaction/result.json`.

`check-garments.cjs` checks the revised nine/eight-step sequences forward and backward,
reset during motion, paper/rotation, Display presets, pin/bow positions, accessory
edit/return/remove, viewport layout, and the old dress/jacket choices. See
`garments/browser-result.json`. Both scripts serve the production build under
`/play/paper-couture/` with cmish.dev's security policy.

The captured browser is headless Chromium using software WebGL. Emulated touch and
phone-sized viewports are not real-device or Safari validation. No physical paper
was folded, and geometry tests do not prove continuous collision-free folding.
The lapel outline highlight is a deliberate readability cue; whether it feels too
explicit should be judged in the owner playtest. The turn-over steps make the new
sequences longer, but keep a single visible action per step.

## Review images and result

[Interaction overview](interaction-sheet.jpg) · [Hem grips at phone width](hem-phone.jpg) ·
[Front-view lapels](vest-front.jpg).

Both browser harnesses passed with no page, console, request or policy errors.
The revised geometry suite passed: skirt stack height 0.0565 / worst sampled hinge
gap 0.0385; vest stack 0.0235 / worst gap 0.0165 (starting square side length 2).
