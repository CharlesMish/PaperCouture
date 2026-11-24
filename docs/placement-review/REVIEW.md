# Review request for Astra (written by Claude, 2026-11-24)

Charlie asked for a second pair of eyes on this branch (`claude/starting-points`). This
note says what to look at first, what I could not verify, and where I would least trust
my own judgement. The fuller record is [NOTES.md](NOTES.md); the pictures are in
[review.html](review.html), which opens by double-click.

**CI cannot run this month** (the Actions budget is spent), so nothing here has been
through the workflows. Everything I ran, I ran in a cloud container on Node 22.23 with
headless Chrome and software WebGL. No real phone, no physical paper.

## 1. Checks whose assertions I changed on purpose

These used to say *"Do not invent attachment anchors"*. Charlie asked for accessory
positions on the newer pieces, so the assertions now name the reviewed positions. Please
confirm each replacement is what you would have written.

| File | Was | Now |
|---|---|---|
| `scripts/check-coat-dress.ts` | no anchors | eight position ids, in order |
| `scripts/check-camp-shirt.ts` | no anchors | `neckline`, `chest-left`, `chest-right` |
| `scripts/check-gown.ts` | no anchors | `shoulder`, `waist` |
| `scripts/check-swing-coat.ts` | no anchors | five position ids |
| `scripts/check-integrated.ts` | apron, clutch, tunic have none | tunic has none; clutch `clasp`; apron four ids |
| `scripts/check-drafts.ts` | pocket only on the chest | pocket on chest or hip; bow never on collar, shoulder or hip (both through `only`) |
| `scripts/check-companion-browser.cjs` | round trip through `requiredIds[0]` (capelet) as a design with no accessories | the first id that is not the capelet (`boot-left`) |

**I could not run `check-companion-browser.cjs`** (it needs the PR 24 reader build). That
one-line change is the edit I am least sure of. `check-curation-browser.cjs` uses the
tabard as its piece with no positions, which is why the tabard still has none.

## 2. Accessory positions (`src/fold/garments.ts`, `PLACED_ANCHORS`)

32 positions on nine pieces, placed by eye on the flat finished drawing and then looked
at in the app (`accessories.jpg` shows a sample). What I did to keep them honest:

- `check-attachments.ts` passes: 594 placements, every allowed accessory wholly on
  retained paper, across every option combination. Several positions were moved to the
  spot its `--report` mode proposed.
- New position ids: `collar-left`, `collar-right`, `shoulder`, `hip-left`, `hip-right`,
  `clasp`. **The accessories themselves are unchanged**: `check-curation-browser.cjs`
  compares each accessory's folds, pieces and position list with a frozen build, so I
  left `ACCESSORIES`, `POCKET_POSITIONS` and the bow alone. Instead a position may name
  the accessories it accepts (`only` on `AttachmentAnchor`, read in `accessoryAnchors`):
  a collar, shoulder or clasp takes the pin; a hip takes the pin or the patch pocket.
  Positions without `only` behave exactly as before. Please check that reasoning.
- `attachmentSize`: gown 0.75, fit-and-flare 0.8, capelet 0.8, apron 1.4 (the apron is
  folded from a 14 cm square, so 1.4 keeps accessories near their size on a 20 cm dress).

Where I would look hardest:

- **Phone toolbars.** Nine more designs now show the accessory controls once finished.
  `check-swing-coat-phone.cjs` passes, and a finished coat-dress keeps 305 px of display
  area at 390 × 844 and 99 px at 844 × 390. I did not run the other phone journeys.
- **Coat-dress and gown colourways.** The positions do not move with the colour side.
  The audit covers both; a look at the reverse-colour pieces would not hurt.
- **The clutch** is shown turned an eighth, so its one pin sits as a square. Intended,
  but see whether you agree it reads as a clasp.
- **Taste.** The camp shirt's chest positions, the coat-dress hip pockets and the wrap
  top's waist are the three I moved most. They are one line each.

## 3. Beginning from a suggestion (`src/main.ts`: `beginning`, `begin`, `begunFrom`)

When a **curated** paper is chosen for a piece that has a suggestion (Border print on 13
pieces, Plum scatter on 8), it now begins from it. Rules I intended:

- a saved start wins over a suggestion; a link that names a turn or position wins over
  both; a link that names only a paper opens as drawn, as before;
- experimental papers are offered suggestions and begin as drawn;
- a start applied this way does not follow the paper to another piece or another paper;
  a turn or position the person set is kept across papers and pieces, as before;
- suggestions apply only on a design's default colourway.

`check-starting-points-browser.cjs` covers each of those at two widths. What I could not
check: every frozen browser check that picks Border print or Plum scatter from the
swatches. I searched the scripts; the ones I found do it on the dress or the clutch,
which have no suggestion. `check-positioning-browser.cjs` passes here.

## 4. The flat preview and the sheet map

`src/render/flatPreview.ts` draws the finished state without lighting, thickness or
tilt. `src/papers/landing.ts` reads the finished front back onto the sheet. The node
check ties the sheet map to `scripts/paperLanding.ts` on all 32 pieces and colourways.
The "ink" threshold (any pixel far from a face's most common colour) is crude; it only
ranks what to show. If you know a paper where it misleads, I would like to hear it.

## 5. Fold sketches (`experiments/placement/refolds.ts`): your territory

Four sketches, none in the app. `node --import tsx experiments/placement/validate-refolds.ts`
applies the draft gates from `check-drafts.ts` and prints the fold metrics. Honest state:

| Sketch | Passes | Concern |
|---|---|---|
| Wide-leg trousers (new) | engine state checks, table clearance, step continuity, whole square kept | hinge stack 9 layer gaps (the simple folds are held to 8); 11 layers on 0.2% of the area at the centre of the waistband |
| Ankle boot with a cuff | same | hinge stack 10; the current boot is exactly 8 |
| Boat-neck top with short sleeves | same, hinge stack 6 | the sleeves are flap-only folds (`only`), as on the dress |
| Hat with a band | same, hinge stack 4 | a 1.7 mm crease where the crown fold crosses the band at 8 cm |

Questions for you:

1. Is the 8-gap hinge limit the right gate for the cuffed boot and the trousers, or should
   they be judged the way the complex folds are (gap beyond rest)? I report the number and
   do not assert it.
2. Can the trousers lose the thick spot without losing the point where the legs part? The
   overlap at the waist (`waist = .47`) is what makes it; `waist = .5` removes the overlap
   and the legs then part from the waistband.
3. Charlie remembers the earlier trousers fighting the paper. This one avoids the problem
   by not separating the legs. If you can fold a pair that does separate them and stays
   rigid, that is better than my sketch.
4. The hat is still weak. A brim wider than the crown needs the band folded after the
   crown is narrowed, and I could not do that with whole-stack folds without tearing at
   the band's hinge.
5. If a refold is wanted, I would bring it in as a choice on the old design with the old
   fold as the default, so no baseline moves. Tell me if you see a cleaner way.

## 6. Things I chose not to touch

- **Any existing fold, accessory or paper drawing.** In `src/fold/*` only the anchor
  table, `attachmentSize` and the one filter line in `accessoryAnchors` changed.
- **The pinboard.** Suggestions are in the review page. It has the most frozen checks and
  I could not run them.
- **Midnight orchard sliding.** The repository treats sliding as something to verify in
  pixels at four turns; I left it fixed.
- **The pleated skirt's default depth**, and anything that changes a default.

## 7. One small fix to confirm

`src/ui/studioControls.ts`: on an experimental design the note ended with "accessory
kept aside" whenever an accessory was attached, including the kimono with its obi
showing. It now says so only when the piece has no position for that accessory.
