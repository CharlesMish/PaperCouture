# Paper studies — what folding does to the pattern

Captures are from one Chromium session (Playwright, software WebGL), viewport 900×680. Every shot in a category used the same camera position (matched to 0.001 model units). Flat shots are workshop step 0. `folded-grid.png` is the finished dress at the Front preset, then Angle, then Back. UI chrome was hidden after layout. Pattern rotation turns the front drawing only; the reverse does not rotate.

`sheet-map.png` (`npm run sheet-map`) shows which parts of the square reach the finished dress. Left is the printed side as `drawFront` sees it, right is the reverse as `drawBack` sees it (from behind). Warm is seen from the front of the dress, cool from the back, grey is folded away; the thin lines are the side creases.

On the finished dress the collar and the sleeves show the reverse. The Back preset is mostly that same reverse across the centre, with a patch of the front drawing where a side flap lies on top.

## Stripe and disc

Most of the red disc is on the front, low and left of centre. The left edge cuts it, and a small red piece shows on the back. The stripes stay readable on the front. The blue-grey reverse is the collar, the sleeves, and the main field of the back. No rotation set was shot.

## Ivory, ink border

The front is the empty ivory centre. No border and no corner mark show there. The collar and sleeves are black. The back is mostly that black reverse, with an ivory patch from a folded flap. The frame is nearly symmetric, so a quarter turn does not rearrange the front the way a one-sided motif does. No rotation set was shot.

## Indigo lattice

The lattice covers the front and still reads as one repeat. Nothing large gets cropped. The ochre reverse is the collar, the sleeves, and the main field of the back; a dark blue patch of the front pattern sits on that back. A quarter turn changes which way the diagonals lean. It is visible, and it does not make or break the dress. No rotation set was shot.

## Botanical sprigs

The sprigs cover the front. Some are cut at the side edges. The mauve reverse is the collar, the sleeves, and the main field of the back, so the back is not a second field of sprigs. A little of the print shows on the flap. Rotation moves which sprigs sit on the front. No rotation set was shot.

## Wide frame

Flat, this is a dark green frame: thick bands at the top and bottom, thin bands at the sides, rust rules, empty middle. At 0° the front of the dress is that empty middle, with a dark green band along the hem. The top band falls in the collar zone, so the collar is the rust reverse instead. 180° also keeps a green band along the hem. At 90° and 270° there is no hem band; a narrow green strip stays on the left edge and the rest of the front is empty. The back field is the rust reverse, with a dark green patch where a side band folded in.

## Corner bloom

One flower, low and to the left on the sheet. At 0° most of the bloom is on the left edge of the skirt. The leaves are cut off at that edge. It is not a thin crescent. At 90° the flower moves to the upper left and the collar cuts the top of it. At 180° it sits on the upper right of the front. At 270° most of it sits on the lower right of the skirt, still meeting the edge. The collar, the sleeves, and the back field are the dark green reverse. Almost none of the red flower is on the back. 270° is the best front: the flower is low on the skirt rather than pushed into the collar. 0° is the one that shows the side cut.

## Open stems

A few stems on a bare ground. At 0° they read on the front: stem, leaves, and the small berries, with a lot of empty paper around them. The collar and the back field are the tan reverse. Some green is on the back flap, not a second full stem. More of the drawing stays on the front at 0° than at 180° or 270°, where it shifts up and less of it remains in the skirt. 90° still crosses the bodice. 0° is the best of the four.

## Falling chevrons

The marks point toward the bottom edge of the sheet, and the strokes get heavier that way. At 0° the front is heavier toward the hem. At 180° the dark marks sit in the upper part of the dress and the skirt is the light end. At 90° the heavier side is the left. The collar, the sleeves, and the back field are the grey reverse, so the back is not a second sheet of chevrons. 0° is the best: the weight sits in the skirt.

## Seed dashes

Short horizontal dashes on a wide grid. On the front they are a fine texture. You can see dashes, and you can see the ground between them. They do not form a figure, and they do not turn into noise. The collar, the sleeves, and the back field are the muted green reverse, which is easier to see than the dashes. A quarter turn would stand the dashes on end. At this size that is a small change, so no rotation sheet was made.

## Ink reverse

The front is a warm ground with one dark vertical stroke and a small diamond. The stroke sits on the bodice and is not split by a crease. The reverse is the same dark ink across the sheet, with a pale ring drawn in the middle. On the finished dress that ring does not appear. What shows is the dark field: the collar, both sleeves, and the main field of the back. A pale patch of the front paper lies on the back where a flap folds in. The contrast is the dark reverse against the pale front, not a disc on the sleeve. Rotation was not sheeted. The ring does not turn with the pattern; turning the front only swings the single stroke.

## Sunray pleats

Drawn to the fold rather than placed on it. Both side creases, extended upward, meet on the centre line well above the sheet: y = 3.6125 on the [-1, 1] square, about 1.3 sheet-widths above the top edge. Every pleat is a ray from that point, nine pleats fill the front, and the two side creases are the outermost valleys. The hem band and its gold rule are circles round the same point. The numbers live in `src/papers/dressMarks.ts`; `npm test` fails if they stop matching the dress.

At 0° the pleats run parallel to the sides of the dress and close in toward the collar. The top of the hem band curves up toward the sides. Collar and sleeves are the plain teal reverse.

The back is where it differs from every other paper. A side fold is a reflection in a line through that apex, so the pleats on each flap stay parallel to the dress sides, and the flap's hem band and rule land at the same distance from the apex as before. The reverse draws the same rule at that distance. On the Back preset the gold rule runs unbroken from one pleated side panel, across the teal centre, to the other, and the teal band runs into the teal back. Nothing else in the set lines up across a fold.

Rotation breaks this on purpose: the reverse does not turn, so only 0° closes the hem. At 180° the pleats narrow toward the hem and the band is folded away under the collar. At 90° and 270° the pleats lie across the dress and only a small teal corner of the band is left at one side of the hem.

Not folded in real paper. On a printed sheet the outer valleys must sit on the side creases; a fold a millimetre or two off on a 15 cm square shows as a sliver of the next pleat at the dress edge.

## Rank after folding

Best of the six new papers:

1. Falling chevrons at 0°. The marks and the heavier hem still read on the front.
2. Corner bloom at 270°. The flower sits on the lower right of the skirt. At 0° most of the bloom is on the left edge and the leaves are cut off.
3. Ink reverse at 0°. The collar, the sleeves, and the back are dark ink against the pale front and its single stroke.

Weakest:

1. Wide frame. The front stays empty apart from a hem band (0° and 180°) or a narrow left strip (90° and 270°).
2. Seed dashes. They survive as texture and do not clutter the dress. The green reverse is the part you actually notice.
3. Open stems. The front is mostly bare paper. Less of the drawing stays there at 180° and 270°.

Sunray pleats was added later and drawn from the sheet map, so it is not ranked with these six. At 0° it is the only paper whose drawing follows the creases and meets itself on the back.
