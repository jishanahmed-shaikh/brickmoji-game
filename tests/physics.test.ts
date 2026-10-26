import { describe, expect, it } from 'vitest';
import { circleRectOverlap, clamp, paddleBounceVelocity, reflectOffRect, speedForLevel } from '../src/game/physics';

describe('clamp', () => {
  it('holds values inside the range unchanged', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it('clamps below the minimum', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it('clamps above the maximum', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('circleRectOverlap', () => {
  const rect = { x: 100, y: 100, w: 50, h: 20 };
  it('is true when the circle center is inside the rect', () => {
    expect(circleRectOverlap(120, 110, 5, rect)).toBe(true);
  });
  it('is true when the circle just touches a corner', () => {
    expect(circleRectOverlap(100 - 3, 100 - 4, 5, rect)).toBe(true);
  });
  it('is false when nowhere near the rect', () => {
    expect(circleRectOverlap(0, 0, 5, rect)).toBe(false);
  });
});

describe('paddleBounceVelocity', () => {
  it('sends a center hit straight up', () => {
    const v = paddleBounceVelocity(0, 100);
    expect(v.x).toBeCloseTo(0, 5);
    expect(v.y).toBeCloseTo(-100, 5);
  });
  it('sends a left-edge hit up and to the left', () => {
    const v = paddleBounceVelocity(-1, 100);
    expect(v.x).toBeLessThan(0);
    expect(v.y).toBeLessThan(0);
  });
  it('preserves speed (vector magnitude)', () => {
    const v = paddleBounceVelocity(0.6, 200);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(200, 5);
  });
});

describe('reflectOffRect', () => {
  it('flips vx on a side hit', () => {
    const ball = { x: 100, y: 110, vx: 5, vy: 5 };
    const rect = { x: 95, y: 90, w: 10, h: 40 };
    const v = reflectOffRect(ball, rect);
    expect(v.vx).toBe(-5);
    expect(v.vy).toBe(5);
  });
});

describe('speedForLevel', () => {
  it('grows with level and caps at max', () => {
    expect(speedForLevel(1, 400, 30, 700)).toBe(400);
    expect(speedForLevel(2, 400, 30, 700)).toBe(430);
    expect(speedForLevel(50, 400, 30, 700)).toBe(700);
  });
});
