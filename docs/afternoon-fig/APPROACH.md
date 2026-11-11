# Afternoon fig — approach

Working note for one commissioned paper, written before the folds and kept
after them. The other three guest papers are the ballpark, not a style to match.

## What the drawer already holds

| Paper | Author | Kind of design | Board |
| --- | --- | --- | --- |
| Twice folded | Fable 5.2 | A repeat made by folding: indigo and safflower on a quiet vat-blue reverse | Folding fan, reverse-colour kimono |
| Kintsugi celadon | Gemini Argon | An ornamented surface: glaze, vessels, a gold seam, persimmon and gold on the reverse | One-shoulder gown, coat-dress |
| Sardine run | Astra | A block-printed repeat with a joke in the lining: fish on salt paper, tomato ticking behind | Camp-collar shirt, deep pleated skirt |

All three are all-over. All three read at guest-card size. None of them is a single picture.

## The lane

**One branch, two readings of the light.** The front is a warm plaster wall with a fig branch drawn as a shadow. The reverse is that same branch held up to the light: deep shade for the wall, the leaves gone luminous. The two faces agree at every point on the sheet. A fold that turns paper over does not reveal a second pattern. It reveals the other side of this one.

This stays off the three occupied palettes. No indigo lattice, no gold seam, no navy-and-tomato repeat. The thumbnail colors are plaster, soot, and a green lining with yellow-green leaves.

The drawing should have sardine-run's confidence (a cut shape, not a rendered study) and twice-folded's front/back agreement (one motif function, mirrored onto the reverse so it occupies the same sheet points). It should not accumulate kintsugi's inventory of ornaments.

## Placement, decided from the swing coat

The swing coat shows the printed face on the two outer panels and the reverse as the shoulder yoke and the lining, with a narrow reverse facing along each opening.

- The large leaf sits high and near the centre. The coat's shoulder yoke is the reverse of that band, so the leaf is worn as light, and its lower lobe hangs into the opening.
- The smaller leaf sits lower and to one side, where one front panel crops it as shadow. The panel is too narrow for a whole leaf of this size, and that crop is kept.
- The open-front capelet folds its lower half away. The small leaf goes with that half. The large leaf stays, in the lining.

Numbers live in `FIG_LEAVES` in `src/papers/afternoonFig.ts`. The coat proved the first placement wrong, and the leaves moved. See [the notes](NOTES.md).

## Pieces

**Swing coat** is where the picture lands: the shoulder wears the large fig as light, and one panel keeps the smaller fig as shadow.

**Open-front capelet** is the second piece. It keeps the light and folds the shadow away. Fit-and-flare, the lapel vest and the framed brooch were the comparisons. The dress left an empty skirt. The vest repeated the coat at a shorter length. The brooch framed a fragment.

Both pieces stay at 0°. 180° emptied the coat's shoulder. 90° could put a leaf on the yoke only by rotating the sheet onto it.

The board is staged with the other guest photographs: Standard, linen, slim white pins, clear daylight, no guide. The capelet sits above the coat and overlaps its shoulder. Coat 24 cm, the larger offered square (the suggestion is 20). Capelet 18 cm, its suggestion.

## Sufficient to stop

Stop when all of these are true:

- The flat front reads as one branch on a wall, and the flat reverse reads as that branch held to the light. Not a second design, and not a texture.
- On the coat, the shoulder wears the large fig as light and one panel keeps the smaller fig as shadow. On the capelet, folding the lower half away keeps the light and loses the shadow.
- The guest card, at the size of the other three, is readable as plaster, a dark leaf, and a green lining. It does not need a caption to be a different paper.
- The artwork was revised once because of a fold, and the notes say which fold and what moved.
- Folding, stepping back, reloading the pinned board, and exporting the PNG all work. `npm run typecheck`, `npm test`, and `npm run build` pass.
- One paper, two existing pieces. No fold-engine, garment, renderer, or default-paper changes.

Not required, and not claimed: a real phone, physical paper, or a leaf that is botanically complete. A lobe that reads at folded size beats a correct sinus that disappears.

## Out of scope

No new garment. No print-position slider. No fourth palette of gold. No fish, no dye lattice, no glaze crackle.
