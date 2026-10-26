import { BOARD_W, BOARD_H, createGame } from './game/state';
import { Input } from './game/input';
import { step } from './game/loop';
import { drawBackground, drawBall, drawBricks, drawGameOver, drawHud, drawLevelClear, drawPaddle, drawServeHint, drawTitle } from './render/draw';
import { Profile } from './platform/profile';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const state = createGame();
const input = new Input();
const profile = new Profile();
let newBest = false;

function fitCanvas(): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = BOARD_W * dpr;
  canvas.height = BOARD_H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const scale = Math.min(window.innerWidth / BOARD_W, window.innerHeight / BOARD_H);
  canvas.style.width = `${BOARD_W * scale}px`;
  canvas.style.height = `${BOARD_H * scale}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

function toBoard(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scale = rect.width / BOARD_W;
  return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale };
}

canvas.addEventListener('pointerdown', (e) => {
  const { x, y } = toBoard(e.clientX, e.clientY);
  if (state.phase === 'GAME_OVER' && y > 505 && y < 575) {
    profile.showLeaderboard();
    return;
  }
  input.down(x);
});
window.addEventListener('pointermove', (e) => {
  if (input.pointerX !== null) input.move(toBoard(e.clientX, e.clientY).x);
});
window.addEventListener('pointerup', () => input.up());

const hooks = {
  onGameOver(score: number): void {
    newBest = profile.reportScore(score);
  },
};

function render(): void {
  drawBackground(ctx);
  if (state.phase === 'TITLE') {
    drawTitle(ctx, profile);
    return;
  }
  drawBricks(ctx, state.layout.bricks);
  drawPaddle(ctx, state.paddleX);
  drawBall(ctx, state.ball.x, state.ball.y);
  drawHud(ctx, state);
  if (state.phase === 'SERVE') drawServeHint(ctx);
  if (state.phase === 'LEVEL_CLEAR') drawLevelClear(ctx, state.banner);
  if (state.phase === 'GAME_OVER') drawGameOver(ctx, state.score, profile.best, newBest);
}

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  step(state, input, dt, hooks);
  render();
  requestAnimationFrame(frame);
}

void profile.load().finally(() => requestAnimationFrame(frame));
