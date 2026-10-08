# Garment choices and pleated skirt

Implemented from played source `305f8ef` on `polish/plum-petals`. Planning brief: source PR #9.
The lead integrated five construction work packages and an independent review pass.

## Accepted

| Garment | Choices | Where the decision appears |
| --- | --- | --- |
| Dress | Three existing side folds × Classic/Lifted/Dropped sleeves | Before `sides`, then before `sleeves` |
| Box jacket | Cropped / Longer | Before `jacket-hem` |
| Wrap skirt | Original / Opposite wrap; one broad turn / two compact turns | Before `skirt-wrap-left`, then `skirt-waist` |
| Lapel vest | Short / Longline | Before `vest-shorten` |
| Pleated skirt | One new seven-step construction | No additional choice menu yet |

The current default garments retain their original folds and resting geometry. The one-turn
wrap waistband is printed, not reverse-facing: the study corrected that initial hypothesis.
Mirroring the wrap changes actual creases and panel order while keeping the paper's material
coordinates. The pleated skirt uses real returned panels, with reverse-colour channels and band.

Choose options at the fold they change. The thumbnails come from actual finished geometry,
at a shared scale within each choice. The Revisit selector lists completed decision points.
Revisiting rewinds the affected folds while keeping compatible preferences, paper and turn.
Completed accessories remain stored and reappear once the garment is finished again.

The existing Two-piece bow can gain a five-step folded centre from a separate third square.
The centre has independent paper and rotation. Returning partway, resetting it, removing it
or hiding it preserves the two wings. The UI calls the completed arrangement a three-piece bow.
This is decorative assembly, not a claim of a self-locking paper joint.

## Small integration corrections

- Choice controls preserve keyboard focus when their geometry thumbnails are refreshed.
- The choice controller uses stable operation IDs and bounds retained progress by the verified
  common fold prefix. Different caption text alone does not invalidate geometry.
- Step counts and progress marks follow the one-/two-turn skirt selection (eight/nine).
- Wrap attachment positions mirror and retain left/right labels as viewed. Longline vest
  panel points and longer jacket waist points follow the changed proportions.
- Edge skirt and vest lapel placements move slightly inward to contain the full bow.
- An inherited neckline bow overhang is corrected by lowering that point from `top-.17`
  to `top-.18`. The full projected pin and bow material fits at all 182 supported placements.
- The 44px small-flap handles, minimum drag distance, explicit upward folds, vest boundary
  highlights, original paper art and two-sided pattern rotation are retained.

## Parked experiments

**Cross-front robe:** the construction passes geometry checks, but the large reverse chest
area reads as a shawl and the narrow central point looks awkward. Kept as a runnable study
under `robe/`; it is not registered in the app or bundled into production.

**Trousers:** interior lower-flap hinges tear their existing attachments. A repair using free
boundaries restores connectivity but leaves a solid centre and sleeve-like wings. Two attempts
were enough to establish this batch's limit; no selectable trousers or new folding primitive.

## Verification and evidence

`npm ci`, typecheck, `npm test`, and the production build under `/play/paper-couture/` pass.
`npm test` includes the existing suite plus `scripts/check-collection.ts`:

- Default-state parity, retained material, rigidity, connectivity, adjacent-step endpoints,
  and 21 animation samples per fold for the accepted constructions.
- Eighteen garment configurations and 78 decision transitions, including evaluated-state
  verification of the common prefixes, preferences and malformed URL recovery.
- Complete polygon coverage of the pin and both assembled bow wings at 182 placements;
  coverage checks include polygon interiors, not just anchor centres or vertices.

Workers inspected real Three.js `SheetView` study captures for new geometry. The lead viewed
the sleeve/jacket comparisons, skirt/vest facet study, robe rejection, pleated skirt and
integrated portrait/landscape and assembled-bow screenshots. See the per-study NOTES files
for the actual alternatives, metrics, material mapping checks and reproduction commands.

Independent production-browser review used headless Chromium with the site's security policy:

- `review/CORE_REVIEW.md`: real controls for choices, ordered revisits, focus, paper and
  independent accessory preservation; 390×844 and 844×390 layouts; no console/network errors.
- `centre-review/result.json`: both bow wings, centre return/resume/reset, independent papers,
  attach/toggle, garment revisit and responsive controls; no errors.
- Baseline feedback checks independently covered small-flap drag, short-drag rollback,
  keyboard, emulated touch cancellation/tap and reset behavior.

The core review identifies its exact JS bundle. That run preceded the final 0.01-unit neckline
anchor correction; the footprint test covers the correction. Final preview checks are recorded
with the delivery rather than retroactively attributed to the earlier browser run.

Useful visual references:

- [Sleeves and jacket proportions](dress-jacket/plain-front.png)
- [Patterned wrap and vest choices](skirt-vest/pattern-comparison.png)
- [Pleated skirt, front/angle/back](pleats/contact-sheet.jpg)
- [Assembled bow with centre](centre-review/assembled-desktop.png)
- [Portrait sleeve decision](review/sleeve-choice-390.png)

Raw intermediate captures and geometry dumps are regenerable with each study's scripts;
the review package keeps selected comparisons rather than every individual tile.

## Remaining limits

Real phones, Safari and physical folding are not tested. Sampled geometry checks do not
certify continuous collision-free physical folding. Landscape phone height leaves a small
workshop paper view at choice steps; the fixed-size handles and Fold control remain usable,
and the studio strip scrolls horizontally. No persistence across reload was added.

Good next playtest: compare Lifted and Dropped on the same paper, reverse the wrap without
turning the pattern, revisit the band while keeping an accessory, and fold the pleated skirt
from its initial square. Evaluate whether the actual choices feel distinct before adding
another axis or reopening the parked studies.
