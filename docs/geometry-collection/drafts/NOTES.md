# Drafts: papers, fold choices, sailor-collar top, neckerchief and pocket square

**Proposal only.** First drafted on branch `drafts/papercouture-drafter-20260930` (PR #11), taken from
`feature/geometry-collection-20260930` (PR #10). The follow-up branch
`drafts/papercouture-drafter-astra-followup` applies Astra's review of PR #11; see
[Astra follow-up](#astra-follow-up). The exploration branch
`drafts/papercouture-drafter-explore-13` (PR #13) is described in
[PR #13 exploration](#pr-13-exploration), PR #14 in [PR #14](#pr-14), and PR #15 in [PR #15](#pr-15) at the end. Charles asked for these drafts. Nothing
here is accepted until he reviews it in the browser. All of it uses the existing fold and turn
ops, as valley folds with explicit turn-overs. There is no engine change, no painted fold, no
slider and no new primitive. Every default stays at baseline parity.

Note: the collection brief said "no more papers" for that batch. Charles asked for the two
papers below as a separate request, so they are included here as proposals.

| Item | Status |
| --- | --- |
| Paper: Pinstripe and lining | Passes checks |
| Paper: Border print | Passes checks |
| Pleated skirt: shallow / classic / deep pleats | Passes checks |
| Box jacket: plain / printed turned corners | Passes checks. **Partially meets the brief**: the turned corner shows print, not the reverse. Now named and described that way at the choice |
| Sailor-collar top | **Parked as a study** (not selectable). Passes geometry checks, but the front is a plain rectangle with no neckline or shoulders |
| Neckerchief (neckline) | Passes checks |
| Folded patch pocket (was "Pocket square"; chest-left / chest-right) | Passes checks as a flat "TV fold" patch. The pointed version was removed |
| Pinafore (fallback) | Not attempted |
| Paper: Starlit lining (PR #13, reverse-first) | Passes checks, including placement checks for where the reverse lands |
| Wrap skirt: short / classic / long (PR #13) | Passes checks. Classic matches PR #10 byte for byte |
| Folded tulip (PR #13, waist anchors) | Passes checks. It shows one face only (the print) |
| Lapel vest: Short / Longline / Tapered hem (PR #14; named "Pointed hem" until PR #15, id `pointed`) | Passes checks. Short and Longline match PR #13 byte for byte |
| Paper: Compass lining (PR #14 experiment) | Hidden (URL `?paper=compass-lining` only). Passes the coverage experiment check |
| Paper coverage report (PR #14) | `scripts/paperCoverage.ts`, report in `coverage/coverage.md` |

## Papers

**Pinstripe and lining** (`src/papers/pinstripeLining.ts`, id `pinstripe-lining`)
- Front: charcoal with chalk pinstripes.
- Reverse: a drawn burgundy paisley in `drawBack`, not a flat colour.
- The lining only appears where the garments already turn the reverse outward: the dress collar, the jacket sleeves and collar band, the vest lapels, and the sailor collar.
- `check-drafts.ts` asserts that each of those regions really exposes the reverse.

**Border print** (`src/papers/borderPrint.ts`, id `border-print`)
- Front: one indigo wave band with coral rules. It sits at canvas rows 0.66–0.86 (exported as `BORDER_BAND`), so on the A-line dress it lands across the front just above the hem.
- Reverse: plain indigo with one cream wave rule near the top edge. That edge becomes the collar band, so the rule shows on the dress collar.
- The check follows band material through the real dress fold. The band must be visible and unflipped on the front at three rows × three x positions, and within 0.3 of the hem. The reverse rule must show on the collar.
- On the pleated skirt the band lands near the hem. On the sailor top it covers the lower front.

Both papers are registered in `PAPERS` before the diagnostic paper. Their swatch notes are one line.

## Fold choices (garmentOptions / FoldDecision)

**Pleat depth** (`pleats` URL key; decision `pleatDepth` at `pleats-return`)
- Choices: `shallow` / `classic` (default) / `deep`. Only the return-crease x values change: 0.41/0.61, 0.36/0.56 and 0.30/0.50.
- Classic keeps the PR #10 literals, and its state fingerprint is unchanged.
- The share of reverse showing across the mid row is shallow 0.00, classic 0.09, deep 0.27.
- Shallow therefore shows no reverse between the pleats. It reads as a crisper, narrower pleat and not as a different colour.
- Offsets below about 0.14 tear at the hem corners (tear check), so there is no shallower choice.

**Jacket cuffs** (`cuffs` URL key; decision `cuffs`, placed before `turn-2`)
- `plain` (the default) is byte-identical to the baseline. `turned` adds one op, `jacket-cuffs`, after `turn-2`, so the result is 7 steps.
- Why the cuff is a corner and not a band: each sleeve is two layers joined along its upper edge. The collar band is on top and shows the reverse. The side flap is underneath, shows print, and runs on under the body.
  - A band across both layers is trapped by the body layers, and would show the same colour anyway.
  - A band of the top layer alone leaves a moving/static seam off the crease, which is a tear.
  - The only clean flap is a top-layer corner, hinged from the sleeve tip to a point 0.1 in along the raw top edge (`only: 'collar'`).
- Turning that corner back shows the **printed** side and uncovers the printed under-layer. The cuff therefore reads as a small print "kite" at each sleeve end, not a reverse cuff.
- A reach of 0.11 or more breaks the rule that grouped folds must move separate paper, so the margin is small.
- The two flaps are small, so the existing FoldHandles give them 44px grips at 1280×800 and at 390×844. The browser review asserts this.

## Sailor-collar top (parked study: `docs/geometry-collection/drafts/sailor/sailorTopStudy.ts`)

Parked after Astra's review; see the follow-up section. The description below is kept as the study record.
`sailor-top.jpg` shows the study as it rendered when it was selectable.

Six steps:
1. `sailor-band`: fold the top half down onto the print.
2. `sailor-turn`: turn the paper over.
3. `sailor-sides`: fold both sides at x = ±0.5 so they meet at a back seam.
4. `sailor-collar`: fold every layer down at y = 0.1.
5. `sailor-hem`: fold the hem up at y = −0.75.
6. `sailor-front`: turn to the front.

- The collar colour comes from layer order. The deep band from step 1 is the lowest layer under the top of the back, so the all-layer fold in step 4 brings it out on top as a large square of the reverse across the back.
- A narrow strip of the band finishes the front neckline.
- Anchors: neckline (0, −0.06); chest ±0.22, −0.3; waist ±0.22 / 0, −0.56. Attachment size is 0.75.
- Result: 1.00 × 0.85 with 15 facets, stack height 0.040, worst hinge gap 0.0385 (limit 0.044).

**Removed, with the reason:** a final front fold of the shoulder corners, from (±0.5, −0.16) to (±0.3, 0.1).
- It made shoulder triangles in the collar colour, which looked like a real sailor collar coming over the shoulders.
- At the neckline the stack is 6–8 layers deep, and the fold's sampled hinge gap was 0.0825, against the 0.044 limit.
- Moving it earlier doesn't help: the collar fold would carry it to the back, and a crease before the collar would cross the whole top.
- I did not relax the gate, so the top is a sleeveless box. The front is plain apart from the neckline strip, and the collar is best seen in Display › Back.
- A real sailor collar also comes to a V at the front. That needs the same thick-corner fold and was not attempted.

## Accessories (`src/fold/accessories.ts` registry)

Pin and bow keep their original pieces, scales and bow offsets. The registry adds allowed positions:
- Kerchief: neckline only.
- Folded patch pocket: chest-left or chest-right only.
- Pin and bow: unrestricted.

The studio disables an accessory type when a garment has none of its positions (the skirts have no neckline or chest). If the current position is not allowed, it falls back to the first allowed one.

- **Neckerchief** (`src/fold/neckerchief.ts`, 5 steps, scale 0.17): band y = 0.6 → turn → left and right corner folds as separate ops, because the flaps overlap → turn to the front. The result is a printed triangle hanging from a reverse neckband.
- **Folded patch pocket** (`src/fold/pocketSquare.ts`, id `pocket`, 5 steps, scale 0.14): band y = 0.7 → turn → sides ±0.5 → bottom y = −0.2 → turn. The result is a printed pocket with a straight reverse band on top (a "TV fold").
  - Folding the two top corners down to a point was tried and removed. The corners are four layers deep by then, and the gap was 0.0605 against the 0.044 limit.

## Verification at PR #11 (browser only; no real phone, Safari or physical paper)

This section describes PR #11. The follow-up's changed counts and checks are listed at the end.

- `npm run typecheck`: passes.
- `npm test` passes:
  - `check.ts` now also runs turned cuffs, the sailor top, the neckerchief and the pocket square through its endpoint, hinge, table and controller checks.
  - Collection: 23 constructions and 99 decision transitions. The `valid`, URL-key and default assertions are extended for `pleatDepth` and `cuffs`.
  - Attachment audit: 278 placements (was 182), none outside the retained paper. It now loops over every accessory × its allowed anchors.
  - New `scripts/check-drafts.ts`, imported by `check-collection.ts`, covers:
    - checkState on every state, plus 21 animation samples per op for hinge gap and table clearance, endpoint continuity, and valley-only folds;
    - sailor collar and neckline faces;
    - cuff parity, prefix and uncovering;
    - the pleat fingerprint and reverse-share ordering;
    - accessory faces and position rules;
    - the papers' drawn reverses and band/lining placement.
- `npm run build -- --base /play/paper-couture/`: passes.
- `scripts/check-drafts-review.cjs` is an optional headless Chromium review with software WebGL. It covers:
  - the papers on dress, jacket and vest;
  - all three pleat depths;
  - turned cuffs walked through the UI, with the grip sizes;
  - the sailor top front, back and angle on three papers;
  - the neckerchief and pocket square folded in the studio and attached;
  - the kerchief and pocket disabled on the skirt;
  - a diamond pin regression.
  
  There were no page errors. Contact sheets are in this directory.

## Open questions for Charles (PR #11; see the follow-up for their status)

1. Cuffs: is a small **printed** turned-back corner acceptable? If not, the choice should be parked. With the current layered sleeve construction, the reverse-band folds I tried trapped or tore paper (a result of that construction, not a general limit; see PR #13).
2. Pleats: three depths, or just classic and deep? Shallow shows no reverse.
3. Sailor top: is a sleeveless box with the collar at the back worth keeping? Or should it be parked, like the robe, until the hinge gap limit (or a thinner neckline stack) allows the shoulder triangles?
4. Accessory position rules: is kerchief-at-neckline-only and pocket-at-chest-only right? Kerchief and pocket scales (0.17 and 0.14) are guesses.
5. Papers: the batch brief said no more papers. Keep both, one, or neither?
6. Should the pocket square use its own paper default? It currently uses the shared accessory paper, like the pin.

## Astra follow-up

Branch `drafts/papercouture-drafter-astra-followup`, off PR #11's head `caecb0f`. It applies
Astra's review comment on PR #11 (review of head `caecb0f` against merge-base `82589c0`). There are no engine
changes, no new fold primitives and no painted folds. Defaults keep baseline parity (the classic
pleat fingerprint and plain-cuff parity asserts still pass).

| Astra point | Status | What changed |
| --- | --- | --- |
| Keep both papers (owner scope decision) | Kept, no change | Whether both belong in the catalogue is still Charles's call |
| Keep all three pleat depths, Classic default | Kept, no change | - |
| Refine cuffs: name/describe them as printed turned sleeve corners at the choice | Addressed | The choice is now **Sleeve ends** with options *Plain* / *Printed corners*. The legend reads "Sleeve ends: plain, or small turned corners that show the print". The reveal hint, the fold title ("Turn back the sleeve corners") and hint, and the garment name ("Box jacket, turned sleeve corners") all say it is a printed corner, not a reverse cuff band. The URL value `cuffs=turned` and the geometry are unchanged. If a reverse band is required, this choice should be parked (see open questions) |
| Park the sailor top as a selectable garment | Addressed | Removed from `GarmentId`, `GARMENTS`, `buildGarment`, the anchors and `attachmentSize`. The builder moved to `docs/geometry-collection/drafts/sailor/sailorTopStudy.ts`, with its old anchors kept as `SAILOR_STUDY_ANCHORS`. `check-drafts.ts` and `check.ts` still run its geometry gates, and assert that it is not selectable. `?design=sailor` now opens the dress, which `check-collection.ts` and the browser review assert. Re-entry needs a recognizable front neckline/shoulder treatment under the existing continuity and hinge gates |
| Neckerchief: "Tie it on" -> "Place it" | Addressed | The final hint now reads "Place it at the neckline; it is not knotted or locked on." The band hint says "folded neckband" (it said "rolled") |
| Pocket semantics: patch-pocket motif, not a tucked hankie | Addressed | Display name **Folded patch pocket** (id `pocket` and file name unchanged). The hints describe a printed patch that lies flat on the chest, with nothing tucked into the garment. No pocket mechanism was added |
| P3: accessory selector after a garment round trip | Addressed | `StudioControls` now remembers a selection that was displaced by the availability fallback, and restores it when that accessory is available again. A deliberate change in the selector clears the memory, so the user's own choice wins. The browser review walks jacket -> wrap skirt (finish) -> jacket (finish) for the neckerchief and the patch pocket and expects the kept item with **Edit accessory**. It also checks that a Two-piece bow deliberately chosen on the skirt stays selected (**Fold accessory**) back on the jacket. With the old `studioControls.ts` the same review fails at the round trip. `check-drafts-review.cjs` also now declares `errors` outside the async body, because its final catch could not report them |

Counts after parking: 22 supported constructions (was 23), 99 decision transitions and 263 attachment placements (was
278; the sailor's 15 are gone).

Contact sheets refreshed: `fold-choices.jpg` (the cuff sheet now shows the choice copy at 390x844),
`accessories.jpg` (sailor cells replaced by jacket and dress placements) and the new
`accessory-roundtrip.jpg`. `papers.jpg` is unchanged because the paper renders did not change.
`sailor-top.jpg` is kept as the parked study's record.

Checks run on this branch (Node 24.21, headless Chromium with software WebGL; no real phone,
Safari or physical paper): `npm run typecheck`, `npm test`, `node --import tsx scripts/check-drafts.ts`,
`npm run build -- --base /play/paper-couture/`, and `scripts/check-drafts-review.cjs`. All passed. The headless review was also run against the old `studioControls.ts` as a control: it fails at the neckerchief round trip (selector shows Diamond pin / Fold accessory).

### Open questions after the follow-up

1. Cuffs: is a clearly labelled **printed** turned corner acceptable? If a reverse-colour cuff band
   is required, Astra and I agree the choice should be parked. With the current layered sleeve construction,
   the reverse-band folds I tried trapped or tore paper. That is a result of the attempted
   construction, not a proof that no reverse cuff can be folded.
2. Papers: keep both, one, or neither? This is still your scope decision.
3. Sailor top: now parked. Re-entry needs a front neckline or shoulders. The shoulder-triangle
   fold failed the hinge gate (0.083 against the 0.044 limit), and I did not relax that gate.
4. Patch pocket: is "Folded patch pocket" the right name? A pocket square that tucks into a pocket
   would need a pocket mechanism in the garment, which is out of scope here.

## PR #13 exploration

Branch `drafts/papercouture-drafter-explore-13`, taken from PR #12's head `0b21556`, targeting
`feature/geometry-collection-20260930`. Charles asked for a broader exploration in three areas:

- drawn reverses designed around where each face lands;
- discrete choices on existing garments, kept away from the neckline and shoulders;
- valley-fold accessories at existing anchors.

There is no engine change, no new fold primitive, no painted fold, no slider and no
progression system. There are no new garment families and no small folds near the neckline
or shoulders.

### Astra's review of PR #12

Astra left one issue comment on PR #12, reviewing `0b21556`. There were no formal reviews
and no inline comments.

| Astra point | Status | What changed |
| --- | --- | --- |
| Keep the follow-up: the round trip is verified and the deliberate Bow choice is right | Kept | Both round-trip cases and the Bow override still pass in the browser review |
| Keep the sailor top parked, the cuff/accessory copy, the papers and the pleat depths | Kept, no change | Catalogue scope and the printed-corner style are still Charles's calls |
| P3 (inherited): attach a Neckerchief, pick Two-piece bow without folding, then pick Neckerchief again. The button said **Fold accessory** but opened the finished piece | Addressed | `StudioControls` remembers the kept accessory and whether it is attached from the last render (`kept`). `actionLabel()` is now the single rule for **Edit** or **Fold**, used both by `render()` and by the selector's `onchange`. `onchange` still clears `displaced`. New browser case: turn the kept kerchief's paper once, attach it, pick Bow (**Fold accessory**), then Neckerchief (**Edit accessory** at once). Edit reopens it at step 5 with the same paper and turn (`{"id":"kerchief","step":5,"paper":"tidal-bands","turns":1}`), and Back to garment keeps it attached. As a control, the same case fails on PR #12's `studioControls.ts` (`kerchief`/`Fold accessory`) |
| Doc: #12's GitHub diff is cumulative from PR #10 (nine commits). Only [`caecb0f...0b21556`](https://github.com/CharlesMish/PaperCouture/compare/caecb0f...0b21556) holds the four follow-up commits | Noted | Recorded here and in the PR #13 body. #13 is also stacked: its own commits are `0b21556...` the #13 head |
| Doc: "the engine cannot" make a reverse cuff is too strong | Addressed | Both places now say that, with the current layered sleeve construction, the reverse-band folds I tried trapped or tore paper. That is a result of that construction, not a general limit |
| Optional: a timeout knob for the harness under concurrent software-WebGL load | Addressed (optional) | `REVIEW_TIMEOUT_MS` sets the per-action timeout (default 20000). This round's run used 40000 |

### Tools

- `scripts/paperLanding.ts` maps each sheet sample to the face (print or reverse) seen in the
  Front and Back views of a finished construction. It maps canvas points in both directions
  (`canvasPoint` / `materialPoint`), using the same canvas conventions as `textures.ts` /
  `sheetOrientation`.
- `docs/geometry-collection/explore/landingMaps.ts` writes these maps for all five garments.
  `landingMaps.py` draws them as `landing-maps.png`.
- For each paper and turn, the "capture" metric is the share of each face's ink that reaches
  the Front view. It came from a box-only helper (it rasterizes the real paper drawings in
  Chromium) and is not committed. The numbers quoted below are **provisional**. PR #14
  commits the measurement as `scripts/paperCoverage.ts`, and its report replaces them
  (`coverage/coverage.md`). Both landing tools are flat normal-projection diagnostics, not
  exact Display-camera visibility (see PR #14).

### Hypotheses

| # | Hypothesis | Outcome | What I learned |
| --- | --- | --- | --- |
| H1 | A **reverse-first** paper, designed from the landing maps: the reverse is the star and the front is quiet | **Kept (in this draft)**: *Starlit lining* | At turn 0 the reverse shows in four predictable places: the top band (dress and jacket collar and sleeve tops, the pleats waistband, the vest lapel tips), a centre column (the vest front opening, the dress back, the pleats back), the wrap-skirt front triangle and the dress back. Every drawn feature is put in one of these. 48-50% of the reverse ink reaches the Front view on the dress and jacket. Averaged over all five garments at 0°, Starlit scores 0.34, against 0.29 for Reverse garden and 0.21 for Ink reverse. Border print scores 0.53, but its only reverse drawing is the small collar rule. The design is turn-specific: the average falls to 0.09-0.10 at the other turns |
| H2 | One motif that a **quarter turn** moves from the dress hem to the jacket chest | **Confirmed, with an existing paper** (finding; no new paper) | A quarter turn hardly does it: at 90° or 270° only about 2% of the canvas is both on the dress hem (turn 0) and on the jacket chest. A half turn works for one compact region: cols 0.28-0.72, rows 0.69-0.81 (about 5-6% of the sheet). Border print's hem band already sits there. At 0° it is the dress hem, and at 180° it lands across the jacket chest (`h2-border-print-turn.jpg`). A second paper would duplicate it |
| H3 | A small **paper-level recommended turn**, without a progression system | **Not supported by ink coverage** for one hint per paper (finding only; wording corrected in PR #14) | The capture metric matches the known rankings (Corner bloom best at 270° on the dress; Falling chevrons at 0°). But where the turn matters, the best turn depends on the garment. Corner bloom is best at 270° on the dress, 90° on the jacket and 180° on the skirt. Reverse garden is best at 0° on the dress and 180° on the skirt. The all-over repeats (lattice, seed dashes, checks, pinstripe) are flat across turns. A hint would have to be per paper and per garment, so none was added |
| H4a | **Wrap-skirt length**: Short / Classic / Long | **Kept (in this draft)** | This is the first skirt decision, at the length crease, far from the waistband. The `skirt-length` and `skirt-hem` creases move together (y -0.30 / -0.55 / -0.80). Heights are 1.02 / 1.27 / 1.52. All 3 lengths x 2 wraps x 2 bands pass the gates, with a worst hinge of 0.0385. Classic is unchanged from PR #10 (fingerprint asserted). The long skirt also shows more of Border print's band |
| H4b | **Vest pointed / cutaway hem** | **Parked** | The corner folds pass the gates (hinge 0.0385). But the natural place for them is after `vest-shorten`, which already holds the vest-length decision (one decision per fold). Adding it would also move the reveal turn, which shifts the decision indices. It needs a combined length-and-hem decision or three more steps. I held it back to keep scope down |
| H4c | **Dress length** (hem crease y -0.6 / -0.7 / -0.8) | **Parked** (passes the gates) | All 9 silhouette x sleeve combinations pass. I did not ship it: it would be the third dress decision, and it folds away part of Border print's hem band, the placement that paper is designed around |
| H5 | A **folded tulip** from its own square, valley folds only, at the waist anchors | **Kept (in this draft)** | 4 steps (one turn-over and three valley folds): turn over, fold in half along the diagonal, then two petal folds at 33° from the centre line. It gives a three-point tulip and is placed at `waist-left` / `waist` / `waist-right` on all five garments (the vest has only left and right). The angle only works from 30° to 36°. Below that, the second petal catches the first; at 29° the facets split. The tulip needed a per-accessory `lift` so it sits below the skirt and pleats waistband edges. Without it, 45 placements were outside the paper |

Negative results that are worth keeping:

- **Tulip, first version.** Petal folds hinged at the right-angle corner gave long, thin
  "arrow" petals. They were rejected by eye before any checks.
- **Two-tone tulip.** Folding only the top layer of each petal, so that the reverse shows,
  tears: the crease crosses the joined diagonal edge. The drafted tulip is **one face (the
  print)**. A two-tone flower needs a different base, not a partial fold.
- **Single-motif papers barely reach the skirt and vest fronts.** For example, Corner bloom
  on the skirt at 0° shows 0.00 of its motif. Such papers suit the dress and jacket.
- **Ink reverse's ring is not "lost".** It is 100% visible on the dress Back view and 74% on
  the wrap-skirt front, so nothing needs to change there.

### Counts and checks

The collection now has 30 supported constructions (was 22), 167 decision transitions (was 99)
and 399 attachment placements (0 outside the retained paper).

`check-drafts.ts` adds:

- Starlit landing assertions, sampled through the real constructions at 128 x 128. Trim in
  the Front view: dress 0.87, jacket 0.88, pleats 0.60. Column: vest front 1.00, dress back
  1.00. Moon: skirt front 1.00, dress back 0.91.
- Skirt-length gates, heights and the classic fingerprint.
- Tulip gates and shape: the base is the lowest point; two petal tips, one each side; the
  cup tip shows between them; every visible face is print; waist positions on every
  garment.

`check.ts` adds the tulip and the short and long skirts.

The browser review adds:

- the direct reselect case;
- Starlit on all five garments;
- Border print at turns 0 and 2;
- the skirt-length choice at 1280x800 and 390x844, walked through the UI;
- the tulip folded in the studio and attached on the dress, skirt, vest and pleats.

New contact sheets: `starlit-lining.jpg`, `skirt-lengths.jpg`, `tulip.jpg`,
`h2-border-print-turn.jpg` and `landing-maps.png`. `accessory-roundtrip.jpg` was refreshed
with the reselect cell.

Checks run on this branch (Node 24.21, headless Chromium with software WebGL; no real phone,
Safari or physical paper): `npm run typecheck`, `npm test`, `node --import tsx scripts/check-drafts.ts`,
`npm run build -- --base /play/paper-couture/` and `scripts/check-drafts-review.cjs`. All passed.

### Open questions after PR #13

1. Starlit lining is designed for turn 0 (at other turns its reverse mostly hides). Is a
   turn-specific paper acceptable, or should the catalogue only hold papers that work at
   every turn? This is also part of the paper-count question.
2. Tulip: is a one-face (print only) tulip acceptable? A two-tone version needs a different
   base.
3. Should dress length or the vest hem ship in a later round? Both pass the gates. The vest
   hem needs a combined decision.
4. Is a per-garment "try this turn" hint wanted at all? The data supports only per paper and
   garment, and I have not built it.
5. Catalogue scope: Pinstripe, Border print and Starlit are all proposals. Keep which ones?

## PR #14

Branch `drafts/papercouture-drafter-14`, taken from PR #13's head `81abb15`, targeting
`feature/geometry-collection-20260930`. It is stacked like #11-#13, so GitHub's diff is
cumulative; this PR's own commits are `81abb15...` the #14 head. "Kept" / "in this draft"
means included in this open draft PR, not released.

There is no engine change, no new fold primitive, no painted fold, no slider and no
progression system. There is no new garment and no fold near the neckline or shoulders.

### Astra's review of PR #13

One issue comment on PR #13 (review of `81abb15`); no formal reviews and no inline comments.

| Astra point | Status | What changed |
| --- | --- | --- |
| Keep the re-selection fix, the qualified cuff wording, the sailor parked, the discrete skirt lengths | Kept, no change | - |
| **P3:** a fresh finished-skirt URL (`?design=skirt&paper=tidal-bands&step=9&view=display`) opened at camera distance 4.84, but Reset view gives 4.19. Resolve the final insets before seeding the camera | **Addressed** | Reproduced here as 4.80 against 4.19 (long skirt: 5.59 against 4.88; the dress also started at 5.52 against 5.66, the older inconsistency). Cause: the start-up code in `src/main.ts` computed the front view **before** `view.jump('display')`, so the distance came from the workshop dock measured at step 0 (now taller, with the skirt-length choice). The jump re-runs `layout()` with the display panel's insets, so the fix switches first and then seeds the camera. New browser check, for short/classic/long skirts, the pointed vest and the dress: the fresh URL, Reset view and ordinary workshop entry (finished fold, then Display) all give the default distance, which is kept after resizing to 390x844 and back. Before and after: `display-framing.jpg` |
| Landing tool: label it a flat normal-projection diagnostic, not an exact Display-camera oracle | **Addressed** | Stated in `scripts/paperLanding.ts`, in the #13 notes and in the coverage report, with Astra's verification numbers and the tilted-preset example |
| The ink-capture numbers use an uncommitted helper: commit it or keep them provisional | **Addressed** | Committed as `scripts/paperCoverage.ts` (idea 1 below). The #13 numbers are marked provisional; the committed report replaces them. They agree within a few hundredths (for example Starlit's reverse ink at 0°: 0.34 provisional, 0.33 committed) |
| Ink coverage does not establish the best turn, nor disprove all per-paper hints | **Addressed** | #13's H3 now reads "not supported by ink coverage" instead of "disproved", and the report says coverage is not a judgement of which turn looks best |
| Owner recommendations: keep Pinstripe and Border; keep Starlit as an optional 0° paper with a short alignment/Back-view cue if it is selected; keep rotation | **Deferred to Charles** (no change) | The cue depends on Charles selecting Starlit for the catalogue, so I did not add one. The Compass experiment below is an alternative that works at every turn and needs no cue. Noted: Starlit at 180° gives the dress back a hem trim |
| Tulip: one face is fine; it has **four steps: one turn-over and three valley folds**, not four folds | **Addressed** (wording) | The #13 notes, the `check-drafts.ts` output and the browser-review line now say "4 steps (1 turn-over, 3 valley folds)" |
| Keeping the vest hem and dress length parked, and no generic turn hint, are useful outcomes | Partly superseded | Charles asked this round for the vest pointed hem combined with the length choice, so it is idea 2. Dress length stays parked, and there is still no turn hint |
| "Shipped" means included in the open draft | **Addressed** (wording) | #13's "Kept (shipped)" now reads "Kept (in this draft)" |
| No CI status or workflow entries | Noted | All results here are local runs, not CI |

### Ideas and experiment

| # | Item | Outcome | What I learned |
| --- | --- | --- | --- |
| Idea 1 | **Paper coverage report**: the landing map turned into a committed, reproducible report that flags garment fronts with no motif | **Kept** (a report plus a `--check` mode; not part of `npm test`, because it needs Chromium) | The papers are drawn by their own draw functions in headless Chromium (`scripts/paperRaster.ts`, bundled with esbuild), then mapped through `paperLanding.ts` at 128x128 samples. See "Coverage lessons" below |
| Idea 2 | **Vest pointed hem**, as a third choice of the vest-length decision: Short / Longline / **Pointed hem** | **Kept** | Pointed is the longline body plus one extra valley fold (`vest-hem-points`, right after `vest-shorten`). The fold lifts each lower outer corner along a crease from the side (rise 0.25) down to near the front opening (run 0.45). The hem then falls to two points beside the reveal, like a waistcoat. (PR #15: the backing joins the low tips, so it reads as a tapered, blunt V; the choice is now named **Tapered hem**.) All tested rise/run pairs pass the gates for both lengths (hinge 0.0385). Putting it inside the length decision avoided #13's "one decision per fold" problem. `check-collection` passes: 31 constructions, 172 transitions, 414 attachment placements with 0 outside the paper, so the tulip and pin waist anchors still fit. Short and Longline are unchanged (fingerprints asserted) |
| Experiment | **Compass lining**: can a reverse-first paper keep Starlit's placement at *every* turn? Draw the reverse with four-fold rotational symmetry (one quarter drawn four times, rotated 90°; trims mitred at the corners; four-point sparkles, which are symmetric themselves) | **Confirmed; kept as a hidden paper** (`?paper=compass-lining`, not in the swatch row) | A turn rotates both canvases about the sheet centre, so a symmetric reverse lands identically at every turn: the report measures exactly the same drawing at 0/90/180/270°. (PR #15: equal totals alone do not prove this, so the check now compares ink per sample as well.) At 0° it keeps Starlit's front motif (dress 0.031 against 0.031, jacket 0.051/0.051, vest 0.029/0.027, pleats 0.031/0.031) and triples it on the wrap skirt (0.059 against 0.019). Starlit's worst turns fall to 0.003-0.004 on the dress, jacket and pleats. The costs: the reverse is busier (four crescents; the dress back shows all four, the skirt front up to three), and first attempts with plain crossing trims made plaid-like corners on the sleeves and skirt sides, which mitring fixed. The capture share of the reverse ink drops from 0.33 to 0.16, but only because more ink is drawn, so that number does not rank these two |

### Coverage lessons (idea 1)

> **Corrected in PR #15** (Astra's review of PR #14): "no motif" below should read **low
> visible ink (< 0.5%)**. It is a measurement, not a guarantee that nothing shows: Plum
> scatter on the classic skirt at 270° keeps two small petal marks at 0.00498. The report
> covers each garment's **default shape** only. The set constant is now `KNOWN_LOW_INK`. The
> Compass claim is now checked per sample, not only in total.

- **A "plain front" test is vacuous.** Every garment shows both faces (collars, lapels, the
  skirt's wrap), so the smallest share of any front that differs from its main colour is 0.13.
  No paper can leave a garment front plain, and the check says so.
- **The useful flag is "no motif"**: the front shows at most a fleck of either face's
  drawing (under 0.005 of its area). I set the threshold against 16 screenshots. At 0.006 and
  above a small but real motif showed (a Reverse garden sprig, an Open stems leaf, Ink
  reverse's line). At 0.003 and below there was nothing, or one star. Starlit's dress at 180°
  (0.003) shows one star on the collar.
- **No motif at any turn:** Midnight orchard on the vest, and Plum scatter on the wrap skirt
  and the vest. These single-motif papers put their motif where the vest folds (and the skirt
  wrap) hide it. `--check` records this set (`KNOWN_NO_MOTIF`) and fails if it changes, so a
  new or edited paper gets noticed. 27 paper/garment/turn cells show no motif at some turn;
  most are single-motif papers on the skirt or vest, and Starlit away from 0°.
- **Two measurement bugs, found by the Compass experiment:**
  - Sampling a 256px canvas at 128 samples put every sample exactly on a pixel edge, so a
    quarter turn shifted thin features by a pixel. The symmetric paper measured 0.037 at 0°
    against 0.048 at 90°.
  - Point sampling also aliased regular thin repeats: at one raster size every Seed dash was
    missed.
  - The report now uses a 384px canvas (an odd multiple of the sample grid) and averages ink
    over each sample's pixel block. The symmetric paper now measures equal at every turn,
    within 0.001.
- The report is a flat normal-projection diagnostic like the landing tool, and coverage is
  not taste: it says where drawing lands, not which turn looks best.

### Checks

`check-drafts.ts` adds the pointed-hem gates and structure:

- one extra valley fold after the length fold, otherwise the longline sequence;
- creases below the waist;
- the lowest hem beside the opening, with the sides raised by the rise;
- Short and Longline fingerprints.

The tulip line now reports its turn-over and folds. `check.ts` adds the pointed vest.
`paperCoverage.ts --check` covers the no-motif set and the Compass experiment (the same
drawing at every turn, and at least 90% of Starlit at 0° on every garment).

The browser review adds:

- the display-framing case (5 constructions: fresh URL, Reset view, workshop entry,
  390x844 and back);
- the vest hem choice at 1280x800 and 390x844, chosen and folded through the UI;
- Compass on all five garments at turns 0 and 1, and the dress back at turn 2;
- Starlit at turn 2 for comparison.

New contact sheets: `display-framing.jpg`, `vest-pointed-hem.jpg` and `compass-lining.jpg`.
The report is in `coverage/coverage.md` (data in `coverage/coverage.json`).

Checks run on this branch (Node 24.21, headless Chromium with software WebGL; no real phone,
Safari or physical paper): `npm run typecheck`, `npm test`, `node --import tsx scripts/check-drafts.ts`,
`scripts/paperCoverage.ts --check`, `npm run build -- --base /play/paper-couture/` and
`scripts/check-drafts-review.cjs`. All passed. As a control, the probe on PR #13's
`src/main.ts` gave 4.80 (fresh) against 4.19 (reset) for the skirt URL.

### Open questions after PR #14

1. Compass or Starlit? Compass works at every turn but is busier (four crescents). Keep
   Starlit, swap it for Compass, offer both, or leave Compass hidden?
2. If Starlit stays and is catalogued, do you want Astra's short alignment/Back-view cue?
3. Vest: is "Pointed hem" the right name, and is rise 0.25 / run 0.45 the right amount of
   point?
4. Should `paperCoverage.ts --check` run in CI? It needs Playwright's Chromium, like the
   browser review.
5. (PR #15: read "low visible ink" for "no motif"; see [PR #15](#pr-15).) Midnight orchard and Plum scatter show no motif on the vest (and Plum scatter on the wrap
   skirt) at any turn. Is that acceptable for single-motif papers, or should they be adjusted
   in a later round?

## PR #15

Branch `drafts/papercouture-drafter-15`, taken from PR #14's head `8015d59`, targeting
`feature/geometry-collection-20260930`. It is stacked like #11-#14, so GitHub's diff is
cumulative; this PR's own commits are `8015d59...` the #15 head. This round applies Astra's
review of PR #14. There is no engine change, no new fold primitive, no painted fold, no
slider and no progression system.

**No new ideas this round.** Charles allowed one if it was genuinely strong. I did not have one
in the proven areas (landing-map papers, small safe choices, accessories on their own
square) strong enough to justify the extra review, so none was added.

### Astra's review of PR #14

One issue comment on PR #14 (review of `8015d59`); no formal reviews and no inline comments.

| Astra point | Status | What changed |
| --- | --- | --- |
| Keep the start-up framing fix, the normal-projection wording, the committed ink helper, the softened "best turn" claim, the tulip step wording, the draft wording and the vest body choice | Kept, no change | - |
| **P3:** the Display entry endpoint depends on frame timing. The unmodified harness failed (classic skirt entry 4.1874 against 4.1937 default); also present in PR #13. `view.update()` reaches the endpoint before `placePiece()`, whose camera branch skips `inDisplay`. Apply the final pose when the transition completes | **Addressed** | `src/main.ts`: when the view reports that Display is reached, the camera is set to the Display pose (`stage.placeCamera(displayCamPos, target)`) before orbit is enabled, so the end of the tween no longer depends on the last frame's progress. And if the fit changes during the transition (a resize), the Display pose is scaled with it, as `reframe` already does once in Display. Probe before the fix: entry minus default -0.0065 / -0.0008 / -0.0065 on three skirt entries, up to -0.032 on the dress. After: 0 (float noise, about 1e-15) over three round trips for the short, classic and long skirts, the dress and the tapered vest |
| Acceptance: repeated entry, fresh URL and Reset agree across lengths and resizes, and the harness passes **without widening the tolerance** | **Addressed** (tolerance tightened) | `scripts/check-drafts-review.cjs` now enters Display from the workshop three times per construction and compares each entry, the fresh URL and Reset view at 1e-9 relative (was 1e-3), and prints 6 decimals. It passes: for example, classic skirt fresh 4.193719 = reset 4.193719 = entry x3 4.193719; at 390x844, 7.591948 = 7.591948. Control: the same harness fails on PR #14's `src/main.ts` (short skirt, second workshop entry: camera 3.508320 against default 3.502599; the first entry happened to pass, which is the frame dependence) |
| **P3:** "no motif" is wrong where a small mark survives (Plum scatter, wrap skirt, 270°: two petal marks, 0.00498). Call it "low visible ink (<0.5%)", and say the report covers default garment shapes only (Midnight orchard on the short skirt stays under the threshold at every turn, max 0.00189) | **Addressed** | `scripts/paperCoverage.ts` and `coverage/coverage.md`: the flag is now **low visible ink (< 0.5%)**, described as a measurement, not "no motif", with Astra's Plum example. The report states that it measures the default shape of each garment only, lists those defaults, and gives the Midnight short-skirt example. The `--check` names and messages match. The numbers are unchanged (`coverage.json` is byte-identical). The PR #14 notes above carry a correction |
| Add variant rows only if exhaustive coverage is intended | **Declined** (for now) | Exhaustive coverage is not the aim: the report is a diagnostic for the default shapes, and the scope is now stated. Adding variants would multiply the rows (lengths, pleat depths, cuffs, hems) without a decision that needs them. Easy to add later if Charles wants it |
| Equal ink totals do not prove spatial identity (Compass) | **Addressed** | `paperCoverage.ts --check` now compares Compass's ink **per sample** across the four turns and fails if more than 0.1% of the visible samples change. Result: dress, jacket, vest and pleats 0.00%, wrap skirt 0.03% |
| Keep Compass hidden; its catalogue status is Charles's call | Kept hidden | Still `?paper=compass-lining` only |
| Keep Pinstripe, Border and the calmer Starlit, with a brief 0° / Back-view cue | **Partly addressed**; the rest deferred to Charles | Starlit's swatch tooltip now reads "Dove front, night-sky reverse; set for 0°. Try the Back view" (the only change; within the 60-character limit). A visible cue in the panel is a UI addition that depends on Charles cataloguing Starlit, so it was not added |
| Optional rename: "Tapered hem", since the hem reads as a tapered, blunt V | **Addressed** | The choice button, construction name ("Lapel vest, tapered hem"), step title ("Taper the hem"), hint and checks now say tapered. The ids stay `pointed` and `vest-hem-points`, so `?vestLength=pointed` URLs keep working |
| The quiet Midnight / Plum results and the parked dress length can stay | Kept, no change | - |
| Keep coverage opt-in; CI adoption is the owner's choice | Kept opt-in | Deferred to Charles |
| Validation: all passed except the author harness stopping at framing; no CI entries | Noted | The harness now passes with the stricter tolerance. All results are local runs, not CI |

### Checks

Run on this branch (Node 24.21, headless Chromium with software WebGL; no real phone, Safari
or physical paper): `npm run typecheck`, `npm test` (31 constructions, 172 transitions, 414
attachment placements, 0 outside), `node --import tsx scripts/check-drafts.ts`,
`scripts/paperCoverage.ts --check` (27 low-ink cells at some turn, 3 at every turn; Compass
per-sample check as above), `npm run build -- --base /play/paper-couture/` and
`scripts/check-drafts-review.cjs`. All passed.

Updated contact sheet: `vest-pointed-hem.jpg` (same file name; relabelled Tapered hem and
re-shot with the new step title). `display-framing.jpg` and `compass-lining.jpg` are
unchanged: the framing fix changes the entry distance by about 0.03 at most, which does not
show in a screenshot, and nothing about Compass's drawing changed.

### Open questions after PR #15

1. Is **Tapered hem** the right name (ids kept as `pointed`)?
2. Starlit: is the tooltip cue enough, or do you want a visible 0° / Back-view cue in the
   panel if Starlit is catalogued?
3. Compass: keep hidden, offer it, or swap it for Starlit?
4. Should `paperCoverage.ts --check` run in CI? It needs Playwright's Chromium.
5. Should the coverage report also cover variant shapes (lengths, pleat depths, hems), or
   stay on the defaults?
