# Drafts: papers, fold choices, sailor-collar top, neckerchief and pocket square

**Proposal only.** First drafted on branch `drafts/papercouture-drafter-20260930` (PR #11), taken from
`feature/geometry-collection-20260930` (PR #10). The follow-up branch
`drafts/papercouture-drafter-astra-followup` applies Astra's review of PR #11; see
[Astra follow-up](#astra-follow-up) at the end. Charles asked for these drafts. Nothing
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

1. Cuffs: is a small **printed** turned-back corner acceptable? If not, the choice should be parked. The engine can't show a reverse cuff without a trapped or torn fold.
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
   is required, Astra and I agree the choice should be parked. The engine cannot fold one without
   trapping or tearing paper.
2. Papers: keep both, one, or neither? This is still your scope decision.
3. Sailor top: now parked. Re-entry needs a front neckline or shoulders. The shoulder-triangle
   fold failed the hinge gate (0.083 against the 0.044 limit), and I did not relax that gate.
4. Patch pocket: is "Folded patch pocket" the right name? A pocket square that tucks into a pocket
   would need a pocket mechanism in the garment, which is out of scope here.
