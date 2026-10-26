import type { Input } from './input';
import {
  BOARD_W,
  BOARD_H,
  PADDLE_W,
  PADDLE_Y,
  BALL_R,
  BASE_SPEED,
  SPEED_PER_LEVEL,
  MAX_SPEED,
  LIVES_START,
  brickRect,
  resetBall,
  startLevel,
  type GameState,
} from './state';
import { levelCleared } from './bricks';
import { circleRectOverlap, clamp, paddleBounceVelocity, reflectOffRect, speedForLevel } from './physics';

export const LEVEL_CLEAR_BANNER_S = 1.4;

export interface LoopHooks {
  onGameOver(score: number): void;
}

function ballSpeed(state: GameState): number {
  return speedForLevel(state.level, BASE_SPEED, SPEED_PER_LEVEL, MAX_SPEED);
}

function followPaddle(state: GameState, input: Input): void {
  if (input.pointerX !== null) {
    state.paddleX = clamp(input.pointerX - PADDLE_W / 2, 0, BOARD_W - PADDLE_W);
  }
}

function paddleRect(state: GameState) {
  return { x: state.paddleX, y: PADDLE_Y, w: PADDLE_W, h: 26 };
}

function launch(state: GameState): void {
  const v = paddleBounceVelocity(0, ballSpeed(state));
  state.ball.vx = v.x;
  state.ball.vy = v.y;
}

function restart(state: GameState): void {
  state.score = 0;
  state.lives = LIVES_START;
  startLevel(state, 1);
  state.phase = 'SERVE';
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
    state.ball.x = state.paddleX + PADDLE_W / 2;
    state.ball.y = PADDLE_Y - BALL_R - 2;
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
  const ball = state.ball;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.x - BALL_R < 0) {
    ball.x = BALL_R;
    ball.vx = Math.abs(ball.vx);
  } else if (ball.x + BALL_R > BOARD_W) {
    ball.x = BOARD_W - BALL_R;
    ball.vx = -Math.abs(ball.vx);
  }
  if (ball.y - BALL_R < 0) {
    ball.y = BALL_R;
    ball.vy = Math.abs(ball.vy);
  }

  const paddle = paddleRect(state);
  if (ball.vy > 0 && circleRectOverlap(ball.x, ball.y, BALL_R, paddle)) {
    const offset = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    const v = paddleBounceVelocity(offset, ballSpeed(state));
    ball.vx = v.x;
    ball.vy = v.y;
    ball.y = paddle.y - BALL_R - 1;
  }

  for (const brick of state.layout.bricks) {
    if (!brick.alive) continue;
    const rect = brickRect(brick.col, brick.row);
    if (!circleRectOverlap(ball.x, ball.y, BALL_R, rect)) continue;
    brick.hp -= 1;
    state.score += 10;
    if (brick.hp <= 0) brick.alive = false;
    const v = reflectOffRect(ball, rect);
    ball.vx = v.vx;
    ball.vy = v.vy;
    break; // one brick per frame keeps the bounce readable
  }

  if (ball.y - BALL_R > BOARD_H) {
    state.lives -= 1;
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
  }
}
