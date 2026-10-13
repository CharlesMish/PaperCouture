// Where the Swing coat creases the square, in material coordinates (the
// unfolded square is [-1, 1]^2, y toward the collar). Papers stay independent
// of fold code at runtime; scripts/check-design-pass.ts compares this list
// with the crease pattern of buildSwingCoat() so it cannot drift silently.
//
// Each segment is one straight crease between two vertices of the finished
// crease pattern. The hem fold appears several times because it runs through
// several layers: each layer carries its own copy, reflected by earlier folds.
// These coordinates locate the artwork's sources. They alone do not establish
// reflection symmetry of the combined dye field or physical dyeing behavior.

export type Segment = readonly [readonly [number, number], readonly [number, number]];

export const SWING_COAT_CREASES: readonly Segment[] = [
  // narrow facings
  [[-0.93, -1], [-0.93, -0.7438]], [[-0.93, -0.7438], [-0.93, 0.2879]], [[-0.93, 0.2879], [-0.93, 1]],
  [[0.93, -1], [0.93, -0.7438]], [[0.93, -0.7438], [0.93, 0.2879]], [[0.93, 0.2879], [0.93, 1]],
  // sloping front-panel gates
  [[-0.58, -1], [-0.569, -0.78]], [[-0.569, -0.78], [-0.48, 1]],
  [[0.58, -1], [0.569, -0.78]], [[0.569, -0.78], [0.48, 1]],
  // shoulder flaps
  [[-0.93, 0.2879], [-0.48, 1]], [[-1, 0.3987], [-0.93, 0.2879]],
  [[0.93, 0.2879], [0.48, 1]], [[1, 0.3987], [0.93, 0.2879]],
  // hem, in each layer it passes through
  [[-0.569, -0.78], [0.569, -0.78]],
  [[-0.569, -0.78], [-0.93, -0.7438]], [[-1, -0.7508], [-0.93, -0.7438]],
  [[0.93, -0.7438], [0.569, -0.78]], [[1, -0.7508], [0.93, -0.7438]],
];
