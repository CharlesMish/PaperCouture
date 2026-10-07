// Where the default A-line dress puts its creases, in material coordinates
// (the unfolded square is [-1, 1]^2, y toward the top of the dress). Papers
// stay independent of fold code at runtime; scripts/check.ts compares these
// numbers with buildDress() so they cannot drift apart silently.
//
// The two slanted side creases, extended upward, meet on the centre line
// above the sheet at (0, SIDE_APEX_Y). Folding a side flap is a reflection in
// a line through that point, so rays from it fold onto rays from it and
// circles around it fold onto the same circles. A drawing built only from
// those rays and circles stays lined up when the flaps go round to the back.

/** Model y of the collar fold line (the top 0.2 of the sheet folds down). */
export const COLLAR_Y = 0.8;
/** Half-width of the dress at the neckline and at the hem. */
export const SHOULDER = 0.5;
export const HEM = 0.82;

/** Where both side creases meet when extended upward (above the sheet). */
export const SIDE_APEX_Y = COLLAR_Y + (SHOULDER * (COLLAR_Y + 1)) / (HEM - SHOULDER);
/** Angle of each side crease from vertical, in radians. */
export const SIDE_HALF_ANGLE = Math.atan2(HEM - SHOULDER, COLLAR_Y + 1);
