/** Small deterministic PRNG so procedural papers look the same on every load. */
export function rng(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function solid(ctx: CanvasRenderingContext2D, size: number, colour: string): void {
  ctx.fillStyle = colour;
  ctx.fillRect(0, 0, size, size);
}
