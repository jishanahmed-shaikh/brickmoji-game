import type { Input } from './input';
import {
  BOARD_W,
  BOARD_H,
  PADDLE_Y,
  BALL_R,
  BASE_SPEED,
  SPEED_PER_LEVEL,
  MAX_SPEED,
  LIVES_START,
  MAX_BALLS,
  POWERUP_R,
  POWERUP_FALL_SPEED,
  POWERUP_DROP_CHANCE,
  POWERUP_TYPES,
  WIDE_MUL,
  WIDE_DURATION_S,
  SLOW_MUL,
  SLOW_DURATION_S,
  brickRect,
  paddleWidth,
  resetBall,
  startLevel,
  type Ball,
  type GameState,
  type PowerupType,
} from './state';
import { levelCleared } from './bricks';
import { circleRectOverlap, clamp, paddleBounceVelocity, reflectOffRect, speedForLevel } from './physics';

export const LEVEL_CLEAR_BANNER_S = 1.4;

export interface LoopHooks {
  onGameOver(score: number): void;
  onPaddleHit(): void;
  onWallHit(): void;
  onBrickHit(stillAlive: boolean): void;
  onLifeLost(): void;
  onLevelClear(): void;
  onPowerup(type: PowerupType): void;
}

function ballSpeed(state: GameState): number {
  return speedForLevel(state.level, BASE_SPEED, SPEED_PER_LEVEL, MAX_SPEED) * state.speedMul;
}

function followPaddle(state: GameState, input: Input): void {
  if (input.pointerX !== null) {
    state.paddleX = clamp(input.pointerX - paddleWidth(state) / 2, 0, BOARD_W - paddleWidth(state));
  }
}

function paddleRect(state: GameState) {
  return { x: state.paddleX, y: PADDLE_Y, w: paddleWidth(state), h: 26 };
}

function launch(state: GameState): void {
  const v = paddleBounceVelocity(0, ballSpeed(state));
  const ball = state.balls[0]!;
  ball.vx = v.x;
  ball.vy = v.y;
}

function restart(state: GameState): void {
  state.score = 0;
  state.lives = LIVES_START;
  startLevel(state, 1);
  state.phase = 'SERVE';
}

function applyPowerup(state: GameState, type: PowerupType): void {
  if (type === 'WIDE') {
    state.paddleWidthMul = WIDE_MUL;
    state.paddleWidthTimer = WIDE_DURATION_S;
  } else if (type === 'SLOW') {
    state.speedMul = SLOW_MUL;
    state.speedTimer = SLOW_DURATION_S;
  } else {
    const src = state.balls[0];
    if (!src) return;
    const speed = Math.hypot(src.vx, src.vy) || ballSpeed(state);
    const baseAngle = Math.atan2(src.vy, src.vx);
    for (const delta of [-0.4, 0.4]) {
      if (state.balls.length >= MAX_BALLS) break;
      const angle = baseAngle + delta;
      state.balls.push({ x: src.x, y: src.y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed });
    }
  }
}

function maybeDropPowerup(state: GameState, x: number, y: number, rng: () => number): void {
  if (rng() >= POWERUP_DROP_CHANCE) return;
  const type = POWERUP_TYPES[Math.floor(rng() * POWERUP_TYPES.length)] ?? 'MULTI';
  state.powerups.push({ x, y, type });
}

function updateEffectTimers(state: GameState, dt: number): void {
  if (state.paddleWidthTimer > 0) {
    state.paddleWidthTimer -= dt;
    if (state.paddleWidthTimer <= 0) state.paddleWidthMul = 1;
  }
  if (state.speedTimer > 0) {
    state.speedTimer -= dt;
    if (state.speedTimer <= 0) state.speedMul = 1;
  }
}

function stepBall(state: GameState, ball: Ball, dt: number, hooks: LoopHooks): boolean {
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.x - BALL_R < 0) {
    ball.x = BALL_R;
    ball.vx = Math.abs(ball.vx);
    hooks.onWallHit();
  } else if (ball.x + BALL_R > BOARD_W) {
    ball.x = BOARD_W - BALL_R;
    ball.vx = -Math.abs(ball.vx);
    hooks.onWallHit();
  }
  if (ball.y - BALL_R < 0) {
    ball.y = BALL_R;
    ball.vy = Math.abs(ball.vy);
    hooks.onWallHit();
  }

  const paddle = paddleRect(state);
  if (ball.vy > 0 && circleRectOverlap(ball.x, ball.y, BALL_R, paddle)) {
    const offset = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    const v = paddleBounceVelocity(offset, ballSpeed(state));
    ball.vx = v.x;
    ball.vy = v.y;
    ball.y = paddle.y - BALL_R - 1;
    hooks.onPaddleHit();
  }

  for (const brick of state.layout.bricks) {
    if (!brick.alive) continue;
    const rect = brickRect(brick.col, brick.row);
    if (!circleRectOverlap(ball.x, ball.y, BALL_R, rect)) continue;
    brick.hp -= 1;
    state.score += 10;
    brick.hitTimer = 0.22;
    if (brick.hp <= 0) {
      brick.alive = false;
      maybeDropPowerup(state, rect.x + rect.w / 2, rect.y + rect.h / 2, Math.random);
    }
    const v = reflectOffRect(ball, rect);
    ball.vx = v.vx;
    ball.vy = v.vy;
    hooks.onBrickHit(brick.alive);
    break; // one brick per frame keeps the bounce readable
  }

  return ball.y - BALL_R <= BOARD_H; // false once it has fallen off the bottom
}

function stepPowerups(state: GameState, dt: number, hooks: LoopHooks): void {
  const paddle = paddleRect(state);
  state.powerups = state.powerups.filter((p) => {
    p.y += POWERUP_FALL_SPEED * dt;
    if (circleRectOverlap(p.x, p.y, POWERUP_R, paddle)) {
      applyPowerup(state, p.type);
      hooks.onPowerup(p.type);
      return false;
    }
    return p.y - POWERUP_R <= BOARD_H;
  });
}

export function step(state: GameState, input: Input, dt: number, hooks: LoopHooks): void {
  const tapped = input.consumeTap();
  followPaddle(state, input);

  if (state.phase === 'TITLE') {
    if (tapped) restart(state);
    return;
  }

  if (state.phase === 'GAME_OVER') {
    if (tapped) restart(state);
    return;
  }

  if (state.phase === 'SERVE') {
    const ball = state.balls[0]!;
    ball.x = state.paddleX + paddleWidth(state) / 2;
    ball.y = PADDLE_Y - BALL_R - 2;
    if (tapped) {
      launch(state);
      state.phase = 'PLAYING';
    }
    return;
  }

  if (state.phase === 'LEVEL_CLEAR') {
    state.bannerTimer -= dt;
    if (state.bannerTimer <= 0) {
      startLevel(state, state.level + 1);
      state.phase = 'SERVE';
    }
    return;
  }

  // PLAYING
  updateEffectTimers(state, dt);
  for (const brick of state.layout.bricks) {
    if (brick.hitTimer > 0) brick.hitTimer = Math.max(0, brick.hitTimer - dt);
  }
  state.balls = state.balls.filter((ball) => stepBall(state, ball, dt, hooks));
  stepPowerups(state, dt, hooks);

  if (state.balls.length === 0) {
    state.lives -= 1;
    hooks.onLifeLost();
    if (state.lives <= 0) {
      state.phase = 'GAME_OVER';
      hooks.onGameOver(state.score);
    } else {
      resetBall(state);
      state.phase = 'SERVE';
    }
    return;
  }

  if (levelCleared(state.layout)) {
    state.banner = `LEVEL ${state.level} CLEAR!`;
    state.bannerTimer = LEVEL_CLEAR_BANNER_S;
    state.phase = 'LEVEL_CLEAR';
    hooks.onLevelClear();
  }
}
