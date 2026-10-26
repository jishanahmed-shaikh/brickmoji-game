import { buildLevel, type BrickLayout } from './bricks';

// Logical board size — always 9:16, scaled to fit the real canvas in main.ts.
export const BOARD_W = 720;
export const BOARD_H = 1280;

export const BRICK_COLS = 6;
export const BRICK_TOP = 190;
export const BRICK_SIDE_MARGIN = 24;
export const BRICK_GAP = 10;
export const BRICK_H = 64;

export const PADDLE_W = 160;
export const PADDLE_H = 26;
export const PADDLE_Y = BOARD_H - 140;

export const BALL_R = 14;
export const BASE_SPEED = 460;
export const SPEED_PER_LEVEL = 26;
export const MAX_SPEED = 760;
export const LIVES_START = 3;

export type Phase = 'TITLE' | 'SERVE' | 'PLAYING' | 'LEVEL_CLEAR' | 'GAME_OVER';

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface GameState {
  phase: Phase;
  score: number;
  level: number;
  lives: number;
  paddleX: number;
  ball: Ball;
  layout: BrickLayout;
  banner: string;
  bannerTimer: number;
}

export function brickWidth(): number {
  return (BOARD_W - BRICK_SIDE_MARGIN * 2 - BRICK_GAP * (BRICK_COLS - 1)) / BRICK_COLS;
}

export function brickRect(col: number, row: number): { x: number; y: number; w: number; h: number } {
  const w = brickWidth();
  return {
    x: BRICK_SIDE_MARGIN + col * (w + BRICK_GAP),
    y: BRICK_TOP + row * (BRICK_H + BRICK_GAP),
    w,
    h: BRICK_H,
  };
}

function serveBall(): Ball {
  return { x: BOARD_W / 2, y: PADDLE_Y - BALL_R - 2, vx: 0, vy: 0 };
}

export function createGame(): GameState {
  return {
    phase: 'TITLE',
    score: 0,
    level: 1,
    lives: LIVES_START,
    paddleX: BOARD_W / 2 - PADDLE_W / 2,
    ball: serveBall(),
    layout: buildLevel(1, BRICK_COLS),
    banner: '',
    bannerTimer: 0,
  };
}

export function resetBall(state: GameState): void {
  state.ball = serveBall();
}

export function startLevel(state: GameState, level: number): void {
  state.level = level;
  state.layout = buildLevel(level, BRICK_COLS);
  resetBall(state);
}
