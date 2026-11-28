# Figure study (Claude, 2026-11-27, second pass 2026-11-28)

Branch `claude/figure-study`, stacked on `claude/starting-points` (PR #54), at Charlie's
request in a Claude chat. It follows [Astra's follow-up](../placement-review/ASTRA-FOLLOWUP.md)
and three reference pictures Charlie found: two of flat paper dolls and one of oshi-e.
Nothing in the app changes. Not merged or deployed.

`study.html` in this folder opens by double-click.

## What it is

A sketch-lane page (`experiments/figure/`, no CI, nothing in `src/` reads it) that asks
whether the wardrobe can dress a person. Everything folded is drawn from the app's own
fold engine and papers with the flat preview from PR #54. The head, hair and feet are
cut shapes drawn on the canvas.

Three trials:

1. **A kimono laid flat, and a kimono being worn.** The studio's kimono with a head
   behind it; a worn figure assembled from a wrapped body, two sleeves and the studio's
   obi; and the same head with the camp shirt and deep pleated skirt of *Fish Market
   Saturday*.
2. **The parts, loose and assembled**, with a first list of what someone needs at a
   table.
3. **The shoulder first, then a hand** (second pass). The greeting pose with the first
   sleeve root, with the root tucked farther behind the body, and with a cut hand added.
4. **One board, two outfits, one moment** (second pass). A cork board with two figures
   that can be dressed, posed, dragged, pinned and unpinned. It opens on Astra's test:
   the plum kimono and *Fish Market Saturday*, placed as if they have just seen each
   other.

Controls under Trial 1 change the kimono paper and its turn, the obi and fan paper, how
far the fronts part at the hem, the hair, and the pose. The board has its own controls.

## What I found

- The studio's kimono is the garment laid out. With a head it reads as a kimono on a
  stand. I would not build on it.
- Worn, a kimono is an assembly. The worn body here is **one square and five plain
  folds** (`wornBody` in `experiments/figure/parts.ts`): the top edge turned down for the
  collar, each front folded across from the neck, both sides folded behind. Each sleeve
  is a smaller square folded in half with one corner turned.
- **The front on the viewer's right lies on top**, the wearer's left over the right. That
  is how a kimono closes, so it is fixed and should never be offered as a choice. When a
  figure turns to face the other way, only the pose turns (`facing` in `scene.ts`).
- How far the fronts part is a real choice: nearly closed shows a little lining at the
  hem, open reads as hakama.
- Western pieces need nothing new. They are already the shape they have on a body.
- A sleeve and a head tilt partly read as a greeting. A cut hand at the cuff is missing.

## Second pass, after Astra's reply

- **The shoulder.** Astra saw board between the raised sleeve and the collar. The sleeve's
  root sat 0.95 cm inside the body's edge, so lifting the sleeve opened a gap. It is now
  1.75 cm inside (`SHOULDER_TUCK` in `scene.ts`) and a little lower, and the sleeve's
  square grows from 7 to 7.6 cm so the same width shows. Trial 3 keeps the old root
  beside the new one.
- **The hand.** A small rounded piece of card at the far end of the sleeve's top edge.
  I would keep it: it says which end is the wrist and gives the fan a holder. It can be
  switched off per figure on the board.
- **Arms.** An arm is now `{ raise, across?, front? }`. `across` starts the sleeve at the
  outer shoulder and lays it over the body, using the other side's sleeve fold. The
  shirt's sleeves are part of its fold, so that figure's arms are cut card from the
  sleeve hems.
- **The board.** Two figures, each leaning about 4° toward the other with her head
  tilted the same way; the kimono lifts her near sleeve and holds a fan across her body,
  the shirt waves. "Both standing" shows the same pair with no moment in it. I think the
  test passes, and that lean, head and one sleeve do the work without faces.

### Onto the app's pinboard

This board is a canvas sketch, not `src/ui/pinboard.ts`. What I found there:

- The pinboard already has an outline outfit guide for one or two figures
  (`appearance.guide`, `guideTransforms`, `makeFigureGuides` in `src/board/decor.ts`),
  movable, sizable, and optionally kept in the photograph.
- A pinned piece already stores a position and a tilt (`BoardItem`).
- So a cut figure (head, hair, neck, feet, hands) could be a second style of that guide,
  and the shirt and skirt could be pinned over it with no new folds. That is the smaller
  step.
- The worn kimono is the larger one. Its body and sleeves are sketches. They would need
  to become app designs, pass the real draft checks, and be pinned as a group that moves
  together.
- A pose on the real board would be a lean and a head tilt on the guide, plus the tilt
  each pinned sleeve already has.
- I did not change the pinboard. It has the most browser checks in the project
  (`check-board-*.cjs`) and none of them can be run from here.

## Three crafts, kept apart

Paper Couture folds garments from one uncut square. Paper dolls (washi ningyō; the flat
bookmark kind is shiori ningyō) fold papers around a card figure, cut the hair and glue
the parts. Oshi-e wraps cloth over padded card shapes and pastes them into a raised
picture; nothing is folded. The study keeps the first craft's rule for everything worn,
borrows the cut figure from the second, and takes only pose from the third.

## Checks

- `node --import tsx experiments/figure/validate-parts.ts`: the worn body at all three
  front openings and both sleeves pass the draft gates from `check-drafts.ts`. At a
  12 cm square the body is 5.6 × 12.1 cm, 6 layers at most, hinge stack 8.0 layer gaps
  (the limit the simple folds are held to), narrowest facet 5.4 mm.
- `npm run typecheck`, `npm test`, `npm run build`: unchanged from PR #54 and passing.
- The packaged page was opened in headless Chrome at 1280 and 390 px: every control
  pressed, a figure dragged with the mouse and moved with the arrow keys, the second
  figure unpinned and pinned again, no page errors, no sideways scroll. Touch dragging
  was not tried on a real phone.
- **Nothing has been folded, cut or glued in physical paper.** The sizes in the table
  list are a first guess.

## If this goes further

- Bring the worn body into the wardrobe as its own piece ("Kimono, worn"): it is one
  square with no cuts.
- Give figures their own room with their own rule (folded clothes on a cut figure, glue
  allowed), separate from the one-square wardrobe.
- The cut figure as a second style of the pinboard's outfit guide (see above).
- An under-collar in a third paper.
- A physical trial of the bookmark at the listed sizes before any of it is called
  "make at home".
