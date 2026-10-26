import { describe, expect, it } from 'vitest';
import { buildLevel, levelCleared, rowsForLevel, toughChance } from '../src/game/bricks';

describe('rowsForLevel', () => {
  it('starts at 3 rows and caps at 7', () => {
    expect(rowsForLevel(1)).toBe(3);
    expect(rowsForLevel(3)).toBe(4);
    expect(rowsForLevel(100)).toBe(7);
  });
});

describe('toughChance', () => {
  it('never exceeds the cap', () => {
    expect(toughChance(1)).toBeCloseTo(0.05, 5);
    expect(toughChance(100)).toBe(0.35);
  });
});

describe('buildLevel', () => {
  it('builds cols x rows alive bricks with a deterministic rng', () => {
    const layout = buildLevel(1, 6, () => 0);
    expect(layout.cols).toBe(6);
    expect(layout.bricks).toHaveLength(6 * rowsForLevel(1));
    expect(layout.bricks.every((b) => b.alive)).toBe(true);
  });
});

describe('levelCleared', () => {
  it('is false while any brick is alive', () => {
    const layout = buildLevel(1, 2, () => 0);
    expect(levelCleared(layout)).toBe(false);
  });
  it('is true once every brick is dead', () => {
    const layout = buildLevel(1, 2, () => 0);
    for (const b of layout.bricks) b.alive = false;
    expect(levelCleared(layout)).toBe(true);
  });
});
