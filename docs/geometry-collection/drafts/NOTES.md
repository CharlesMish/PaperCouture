# Drafts: papers, fold choices, sailor-collar top, neckerchief and pocket square

**Proposal only.** This is branch `drafts/papercouture-drafter-20260930`, taken from
`feature/geometry-collection-20260930` (PR #10). Charles asked for these drafts. Nothing
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
| Box jacket: plain / turned cuffs | Passes checks. **Partially meets the brief**: the turned cuff shows print, not the reverse |
| Sailor-collar top | Passes checks. **Partially meets the brief**: sleeveless box, and the shoulder fold was removed |
| Neckerchief (neckline) | Passes checks |
| Pocket square (chest-left / chest-right) | Passes checks as a flat "TV fold". The pointed version was removed |
| Pinafore (fallback) | Not attempted, because the sailor top passed |

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

## Sailor-collar top (`src/fold/sailorTop.ts`, design `sailor`)

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
- Pocket: chest-left or chest-right only.
- Pin and bow: unrestricted.

The studio disables an accessory type when a garment has none of its positions (the skirts have no neckline or chest). If the current position is not allowed, it falls back to the first allowed one.

- **Neckerchief** (`src/fold/neckerchief.ts`, 5 steps, scale 0.17): band y = 0.6 → turn → left and right corner folds as separate ops, because the flaps overlap → turn to the front. The result is a printed triangle hanging from a reverse neckband.
- **Pocket square** (`src/fold/pocketSquare.ts`, 5 steps, scale 0.14): band y = 0.7 → turn → sides ±0.5 → bottom y = −0.2 → turn. The result is a printed pocket with a straight reverse band on top (a "TV fold").
  - Folding the two top corners down to a point was tried and removed. The corners are four layers deep by then, and the gap was 0.0605 against the 0.044 limit.

## Verification (browser only; no real phone, Safari or physical paper)

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

## Open questions for Charles

1. Cuffs: is a small **printed** turned-back corner acceptable? If not, the choice should be parked. The engine can't show a reverse cuff without a trapped or torn fold.
2. Pleats: three depths, or just classic and deep? Shallow shows no reverse.
3. Sailor top: is a sleeveless box with the collar at the back worth keeping? Or should it be parked, like the robe, until the hinge gap limit (or a thinner neckline stack) allows the shoulder triangles?
4. Accessory position rules: is kerchief-at-neckline-only and pocket-at-chest-only right? Kerchief and pocket scales (0.17 and 0.14) are guesses.
5. Papers: the batch brief said no more papers. Keep both, one, or neither?
6. Should the pocket square use its own paper default? It currently uses the shared accessory paper, like the pin.
