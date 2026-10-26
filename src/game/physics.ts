// Pure collision math — no DOM, no canvas, so it's cheap to unit-test.

export interface Vec {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Does a circle (center + radius) overlap an axis-aligned rect? */
export function circleRectOverlap(cx: number, cy: number, r: number, rect: Rect): boolean {
  const nx = clamp(cx, rect.x, rect.x + rect.w);
  const ny = clamp(cy, rect.y, rect.y + rect.h);
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy <= r * r;
}

/**
 * Reflects a ball's velocity off a rect it has just hit, by bouncing on
 * whichever axis has the smaller penetration (classic Breakout heuristic —
 * good enough for a paddle/brick, no need for exact normals).
 */
export function reflectOffRect(ball: Vec & { vx: number; vy: number }, rect: Rect): { vx: number; vy: number } {
  const centerX = rect.x + rect.w / 2;
  const centerY = rect.y + rect.h / 2;
  const overlapX = rect.w / 2 + 4 - Math.abs(ball.x - centerX);
  const overlapY = rect.h / 2 + 4 - Math.abs(ball.y - centerY);
  if (overlapX < overlapY) return { vx: -ball.vx, vy: ball.vy };
  return { vx: ball.vx, vy: -ball.vy };
}

/**
 * Paddle hits steer the ball: hitting the left edge sends it left, the
 * center sends it straight up, the right edge sends it right. `offset` is
 * -1 (left edge) to 1 (right edge). Speed is preserved.
 */
export function paddleBounceVelocity(offset: number, speed: number): Vec {
  const clamped = clamp(offset, -1, 1);
  const angle = clamped * (Math.PI / 3); // up to 60 degrees off vertical
  return { x: Math.sin(angle) * speed, y: -Math.cos(angle) * speed };
}

export function speedForLevel(level: number, base: number, perLevel: number, max: number): number {
  return Math.min(max, base + (level - 1) * perLevel);
}
