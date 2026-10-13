// One layout drives backing, movement bounds, camera, preview and PNG.
export const BOARD_WIDTH = 3.6;
export const BOARD_HEIGHT = 4.2;
export const BOARD_MARGIN = .08;
export const BOARD_EXPORT_WIDTH = 1800;
export const BOARD_EXPORT_HEIGHT = 2100;
export type BoardFormat = 'standard' | 'roomy';
export const BOARD_FORMATS = {
  standard: { width: BOARD_WIDTH, height: BOARD_HEIGHT, exportWidth: BOARD_EXPORT_WIDTH, exportHeight: BOARD_EXPORT_HEIGHT },
  roomy: { width: 4.8, height: 5.6, exportWidth: 2400, exportHeight: 2800 },
} as const;
