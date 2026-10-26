// Bitmoji-style brick faces: no image assets, just a small palette + a few
// drawn expressions (render/draw.ts does the actual drawing). Kept data-only
// here so the layout is easy to unit-test.

export type Expression = 'happy' | 'wink' | 'wow' | 'cool' | 'heart' | 'angry' | 'sad';
export const EXPRESSIONS: Expression[] = ['happy', 'wink', 'wow', 'cool', 'heart'];

export const FACE_COLORS = ['#ff9f6b', '#ffd36b', '#8fe3a0', '#6bc9ff', '#c99bff', '#ff8fb3'];

export interface Brick {
  col: number;
  row: number;
  hp: number;
  color: string;
  face: Expression;
  alive: boolean;
  /** Seconds left reacting to a hit — render/draw.ts flashes an 'angry'/'sad' face and a squash while it counts down. */
  hitTimer: number;
}

export interface BrickLayout {
  cols: number;
  rows: number;
  bricks: Brick[];
}

/** One extra row every 2 levels, capped — keeps early levels quick and later ones busier. */
export function rowsForLevel(level: number): number {
  return Math.min(7, 3 + Math.floor((level - 1) / 2));
}

/** A tougher brick (hp 2) shows up more often as levels climb, capped so it never dominates. */
export function toughChance(level: number): number {
  return Math.min(0.35, 0.05 * level);
}

export function buildLevel(level: number, cols: number, rng: () => number = Math.random): BrickLayout {
  const rows = rowsForLevel(level);
  const tough = toughChance(level);
  const bricks: Brick[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      bricks.push({
        col,
        row,
        hp: rng() < tough ? 2 : 1,
        color: FACE_COLORS[Math.floor(rng() * FACE_COLORS.length)] ?? FACE_COLORS[0]!,
        face: EXPRESSIONS[Math.floor(rng() * EXPRESSIONS.length)] ?? 'happy',
        alive: true,
        hitTimer: 0,
      });
    }
  }
  return { cols, rows, bricks };
}

export function levelCleared(layout: BrickLayout): boolean {
  return layout.bricks.every((b) => !b.alive);
}
