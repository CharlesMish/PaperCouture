// Measurements in step instructions. A construction writes a length on the sheet with
// cm(units) (the whole side of the square is 2 units), computed from the same numbers
// that place its creases. The workshop shows it in centimetres (millimetres below
// 1 cm) on the square the piece is suggested for, so an instruction can be followed
// with real paper and never disagrees with the fold it describes.
// scripts/check-instructions.ts checks each one against the step's creases.

/** A length on the sheet, in sheet units (the square's side is 2). */
export const cm = (units: number): string => `{{${+units.toFixed(5)}}}`;

const MEASURE = /\{\{(-?\d+(?:\.\d+)?)\}\}/g;

/** The lengths written in an instruction, in sheet units. */
export const measuresIn = (text: string): number[] => [...text.matchAll(MEASURE)].map(m => Number(m[1]));

/** A length in centimetres, to the nearest millimetre: "1.5 cm", "2 cm", "6 mm". */
export function showLength(cmLength: number): string {
  const mm = Math.round(cmLength * 10);
  return mm < 10 ? `${mm} mm` : `${mm / 10} cm`;
}

/** An instruction as shown, for a square of `squareCm` centimetres. */
export function formatHint(hint: string, squareCm: number): string {
  return hint.replace(MEASURE, (_, u) => showLength((Number(u) * squareCm) / 2));
}

/** Where two lines meet (each a point and a direction), for placing a landmark. */
export function lineMeet(p: { x: number; y: number }, d: { x: number; y: number }, q: { x: number; y: number }, e: { x: number; y: number }) {
  const den = d.x * e.y - d.y * e.x;
  if (Math.abs(den) < 1e-12) throw new Error('parallel lines do not meet');
  const s = ((q.x - p.x) * e.y - (q.y - p.y) * e.x) / den;
  return { x: p.x + d.x * s, y: p.y + d.y * s };
}
