import { BOARD_W, BOARD_H, createGame, paddleWidth } from './game/state';
import { Input } from './game/input';
import { step, type LoopHooks } from './game/loop';
import { drawBackground, drawBall, drawBricks, drawGameOver, drawHud, drawLevelClear, drawPaddle, drawPowerups, drawServeHint, drawTitle } from './render/draw';
import { Profile } from './platform/profile';
import { Sound } from './audio/sound';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const state = createGame();
const input = new Input();
const profile = new Profile();
const sound = new Sound();
let newBest = false;
let audioStarted = false;

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
  if (!audioStarted) {
    audioStarted = true;
    sound.unlock();
    sound.startPad();
  }
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

const hooks: LoopHooks = {
  onGameOver(score): void {
    newBest = profile.reportScore(score);
    sound.gameOver();
  },
  onPaddleHit: () => sound.paddleHit(),
  onWallHit: () => sound.wallHit(),
  onBrickHit: (stillAlive) => sound.brickHit(stillAlive),
  onLifeLost: () => sound.lifeLost(),
  onLevelClear: () => sound.levelClear(),
  onPowerup: () => sound.levelClear(),
};

function render(): void {
  drawBackground(ctx);
  if (state.phase === 'TITLE') {
    drawTitle(ctx, profile);
    return;
  }
  drawBricks(ctx, state.layout.bricks);
  drawPowerups(ctx, state.powerups);
  drawPaddle(ctx, state.paddleX, paddleWidth(state), state.paddleWidthMul > 1);
  for (const ball of state.balls) drawBall(ctx, ball.x, ball.y);
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
