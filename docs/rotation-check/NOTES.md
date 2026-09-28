# Two-sided quarter turns

## Mapping

`Texture.updateMatrix` calls `Matrix3.setUvTransform`. The shader uses `mapTransform * vec3(uv, 1)`, which is

`T(offset) · T(center) · S(repeat) · R(rotation) · T(−center)`.

Front is unchanged: `θ = −(quarterTurns mod 4) · π/2`, centre `(0.5, 0.5)`, repeat `(1, 1)`.

The back canvas is the sheet seen from behind, so the unrotated sample is a mirror in `u`. That mirror is `S(−1, 1)` about the centre. Scale is applied after rotation, so the same `θ` with repeat `(−1, 1)` is mirror ∘ rotation:

`back(uv) = (1 − front(uv).u, front(uv).v)`.

Same angle applied after the mirror does not commute with that, except at a half turn.

## What changed

`src/render/sheetOrientation.ts` sets both textures that way. `makePaperTextures` calls it. The control label is "Turn paper" (`aria-label` "Turn paper (now N°)", name suffix "paper turned N°"). Turning still only replaces the textures, so a fold in progress and the display camera stay where they are.

The diagnostic sheet is `src/papers/rotationCheck.ts`, not in the swatch list. `?paper=rotation-check` loads it. Corner letters and the arrow are drawn at the same material points on both faces (back canvas top-left is material `(1, 1)`).

## What the sheets show

Headless Chromium, SwiftShader, built app. Not a phone, and not physical paper.

`diagnostic-grid-before.png`: flat fronts step clockwise (R moves from the top-left toward the top-right, then the bottom-right). Flat backs and folded backs stay on one arrangement (B and R along the top, A and G along the bottom) at 0°, 90°, 180°, and 270°. `reverse-garden-back-before.png`: the same back picture in all four frames.

`diagnostic-grid.png`: flat fronts match the before fronts. Each flat back is the left-right mirror of that row's flat front, and the folded back matches that flat back. At 90° the flat back has R at the top-left and the arrow toward it. `reverse-garden-back-after.png`: 0° has the flowers across the neck and the stem up the middle; 90° puts the flowers low and the stem across; 180° puts the flowers at the hem; 270° puts the flowers to one side.

Flat back in those grids is the step-0 sheet turned 180° about model Y and lifted slightly so the reverse clears the table. The lift is only in the capture script. A soft shadow sits under that sheet. The flat front still shows the workshop's pending collar peek.

## Check

`npm test` samples `Texture.updateMatrix` for quarter turns 0..3 and for +4. Front samples must be the existing clockwise mapping, the back sample must be the mirror of the front sample, and four turns must match zero.

Run against the old front-only mapping: exit 1, 27 problems. Example: `back q=1 (0.2,0.35) -> (0.8000,0.3500), expected mirror of front (0.3500,0.2000)`.

Run against the same angle applied after the mirror: exit 1, 18 problems. Example: `back q=1 (0.2,0.35) -> (0.6500,0.8000), expected mirror of front (0.3500,0.2000)`. A half turn happens to match, and the centre point matches either mistake. 90° and 270° do not. Restored code: exit 0.

Browser clicks on the built app: turn during a fold (progress 0.14 → 0.22, step unchanged), four clicks return to "now 0°", Reverse garden keeps "paper turned 90°", Back and Start over work, and a turn in the display back view keeps step 6 and the camera. No console errors.
