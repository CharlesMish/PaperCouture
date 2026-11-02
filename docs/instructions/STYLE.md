# Writing step instructions

Each step's `hint` is what someone folding a real square needs to make that fold
without seeing the screen. The title says what the step does in a few words; the
hint says where the crease goes, what moves, and (briefly) what it becomes.
`npm run check:instructions` checks the rules below that a script can check.

## Voice

- Second person, imperative, present tense: "Fold the top edge down by 2 cm."
- Lead with the action and its landmarks. Then, at most one short sentence on what
  it becomes or what to watch for ("This band becomes the collar.").
- Plain words a folder uses: edge, corner, centre line, crease, flap, layer, point,
  print side, other colour, toward you / behind, in half, to the centre.
- Say which layers move when it matters: "all the layers", "the top layer only",
  "the flap only".
- Say which way: "down onto the print", "up behind", "out past the shoulder".
- Turn-over steps: "Turn it over from side to side" (the app always turns about the
  vertical centre line), plus what is now where if that helps.
- Aim for 1 to 3 sentences, about 250 characters at most; a collapse (several creases
  at once) may need a little more, written as a short sequence.

## Measurements

- Never type a number of centimetres or a percentage. Write lengths with
  `cm(units)` from `src/fold/measure.ts`, computed from the same values that place
  the creases (the square's side is 2 units). The workshop shows them in cm or mm on
  the piece's suggested square and says which square.
- Prefer an exact landmark when there is one: "in half", "to the centre line",
  "corner to corner", "until the points touch the band", "along the edge of the
  layer beneath". Add a measurement when the landmark alone is not enough.
- Every measurement must be a distance the step's creases really have on the paper
  as it lies (from an edge, between creases, or along a crease), in this step or the
  next one (for a line creased now and folded then). The check enforces this.
  `npm run fold-measurements -- <design>` prints those distances for each step.
- Angles in degrees only when exact and foldable (45 degrees, "in half").

## Leave out

- Percentages, and notes meant for reviewers or about what the piece lacks ("no
  locking closure", "continuous backing", "not tucked", "rigid", "facets",
  "material"). Those belong in the piece's notes (`experiment` in
  `src/fold/garments.ts`) or its documentation.
- "Along the guides" on its own: the guides are on screen, not on the paper.

## Example (the dress, step 3)

> Fold each side in along a slanting crease: from the top edge 5 cm in from the side,
> to the bottom edge 1.8 cm in from the side. Fold all the layers. The slant gives
> the skirt its A-line.

Written as `` `Fold each side in along a slanting crease: from the top edge ${cm(1 - p.shoulder)} in from the side, to the bottom edge ${cm(1 - p.hem)} in from the side. …` ``.
