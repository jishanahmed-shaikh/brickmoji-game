import type { Brick, Expression } from '../game/bricks';
import { BOARD_W, BOARD_H, PADDLE_Y, BALL_R, LIVES_START, POWERUP_R, brickRect, type GameState, type Powerup, type PowerupType } from '../game/state';
import type { Profile } from '../platform/profile';

const INK = '#1a1033';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function heart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s, y, x - s, y + s * 0.35);
  ctx.bezierCurveTo(x - s, y + s * 0.75, x, y + s, x, y + s * 1.1);
  ctx.bezierCurveTo(x, y + s, x + s, y + s * 0.75, x + s, y + s * 0.35);
  ctx.bezierCurveTo(x + s, y, x, y, x, y + s * 0.3);
  ctx.fill();
}

function face(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, expr: Expression): void {
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, w * 0.045);
  const eyeDX = w * 0.17;
  const eyeY = cy - w * 0.04;
  const eyeR = w * 0.055;

  if (expr === 'cool') {
    roundRect(ctx, cx - w * 0.3, eyeY - w * 0.07, w * 0.6, w * 0.14, w * 0.05);
    ctx.fill();
  } else if (expr === 'heart') {
    heart(ctx, cx - eyeDX, eyeY - w * 0.04, eyeR * 1.3);
    heart(ctx, cx + eyeDX, eyeY - w * 0.04, eyeR * 1.3);
  } else if (expr === 'wink') {
    ctx.beginPath();
    ctx.arc(cx - eyeDX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + eyeDX - eyeR, eyeY);
    ctx.lineTo(cx + eyeDX + eyeR, eyeY);
    ctx.stroke();
  } else if (expr === 'wow') {
    ctx.beginPath();
    ctx.arc(cx - eyeDX, eyeY, eyeR * 1.2, 0, Math.PI * 2);
    ctx.arc(cx + eyeDX, eyeY, eyeR * 1.2, 0, Math.PI * 2);
    ctx.fill();
  } else if (expr === 'angry') {
    ctx.lineWidth = w * 0.05;
    ctx.beginPath();
    ctx.moveTo(cx - eyeDX - eyeR, eyeY - eyeR * 0.6);
    ctx.lineTo(cx - eyeDX + eyeR, eyeY + eyeR * 0.3);
    ctx.moveTo(cx + eyeDX + eyeR, eyeY - eyeR * 0.6);
    ctx.lineTo(cx + eyeDX - eyeR, eyeY + eyeR * 0.3);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - eyeDX, eyeY + eyeR * 0.4, eyeR * 0.7, 0, Math.PI * 2);
    ctx.arc(cx + eyeDX, eyeY + eyeR * 0.4, eyeR * 0.7, 0, Math.PI * 2);
    ctx.fill();
  } else if (expr === 'sad') {
    ctx.beginPath();
    ctx.arc(cx - eyeDX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.arc(cx + eyeDX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(cx - eyeDX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.arc(cx + eyeDX, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fill();
  }

  const mouthY = cy + w * 0.16;
  ctx.beginPath();
  if (expr === 'wow') {
    ctx.ellipse(cx, mouthY, w * 0.08, w * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (expr === 'cool') {
    ctx.moveTo(cx - w * 0.14, mouthY);
    ctx.lineTo(cx + w * 0.14, mouthY);
    ctx.stroke();
  } else if (expr === 'angry') {
    ctx.arc(cx, mouthY + w * 0.1, w * 0.14, 1.15 * Math.PI, 1.85 * Math.PI);
    ctx.stroke();
  } else if (expr === 'sad') {
    ctx.arc(cx, mouthY + w * 0.14, w * 0.16, 1.2 * Math.PI, 1.8 * Math.PI);
    ctx.stroke();
  } else {
    ctx.arc(cx, mouthY - w * 0.06, w * 0.18, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }
}

export function drawBackground(ctx: CanvasRenderingContext2D): void {
  const g = ctx.createLinearGradient(0, 0, 0, BOARD_H);
  g.addColorStop(0, '#2b1750');
  g.addColorStop(1, '#4a2a7a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);
}

export function drawBricks(ctx: CanvasRenderingContext2D, bricks: readonly Brick[]): void {
  for (const b of bricks) {
    if (!b.alive) continue;
    const r = brickRect(b.col, b.row);
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;

    // Reacting to a hit: a quick squash and an angry/sad flash, settling back
    // over ~0.2s — the faces the user asked to feel "lively", not static.
    const reacting = b.hitTimer / 0.22;
    const squash = 1 - reacting * 0.12;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1 / squash, squash);
    ctx.translate(-cx, -cy);
    ctx.fillStyle = b.color;
    roundRect(ctx, r.x, r.y, r.w, r.h, 14);
    ctx.fill();
    if (b.hp > 1) {
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(26,16,51,0.35)';
      roundRect(ctx, r.x + 3, r.y + 3, r.w - 6, r.h - 6, 11);
      ctx.stroke();
    }
    if (reacting > 0) {
      ctx.fillStyle = `rgba(255,255,255,${reacting * 0.5})`;
      roundRect(ctx, r.x, r.y, r.w, r.h, 14);
      ctx.fill();
    }
    face(ctx, cx, cy, Math.min(r.w, r.h), reacting > 0.35 ? (b.hp > 1 ? 'angry' : 'sad') : b.face);
    ctx.restore();
  }
}

export function drawPaddle(ctx: CanvasRenderingContext2D, x: number, w: number, boosted: boolean): void {
  const g = ctx.createLinearGradient(x, PADDLE_Y, x, PADDLE_Y + 26);
  g.addColorStop(0, boosted ? '#8fe3a0' : '#ffd36b');
  g.addColorStop(1, boosted ? '#5fd1a6' : '#ff9f4a');
  ctx.fillStyle = g;
  roundRect(ctx, x, PADDLE_Y, w, 26, 13);
  ctx.fill();
}

const POWERUP_STYLE: Record<PowerupType, { color: string; glyph: string }> = {
  MULTI: { color: '#ff8fb3', glyph: '●●●' },
  WIDE: { color: '#8fe3a0', glyph: '↔' },
  SLOW: { color: '#6bc9ff', glyph: '❄' },
};

export function drawPowerups(ctx: CanvasRenderingContext2D, powerups: readonly Powerup[]): void {
  for (const p of powerups) {
    const style = POWERUP_STYLE[p.type];
    ctx.beginPath();
    ctx.arc(p.x, p.y, POWERUP_R, 0, Math.PI * 2);
    ctx.fillStyle = style.color;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.stroke();
    ctx.fillStyle = '#1a1033';
    ctx.font = '700 16px system-ui, -apple-system, Segoe UI, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(style.glyph, p.x, p.y + 1);
    ctx.textBaseline = 'alphabetic';
  }
}

export function drawBall(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + BALL_R * 0.7, BALL_R * 0.9, BALL_R * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, BALL_R, 0, Math.PI * 2);
  ctx.fill();
}

export function drawHud(ctx: CanvasRenderingContext2D, state: GameState): void {
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 44px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(String(state.score), 24, 72);
  ctx.textAlign = 'right';
  ctx.font = '600 28px system-ui, -apple-system, Segoe UI, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(`LVL ${state.level}`, BOARD_W - 24, 72);

  for (let i = 0; i < LIVES_START; i++) {
    const x = BOARD_W - 30 - i * 36;
    ctx.beginPath();
    ctx.arc(x, 112, 10, 0, Math.PI * 2);
    ctx.fillStyle = i < state.lives ? '#ff8fb3' : 'rgba(255,255,255,0.2)';
    ctx.fill();
  }
}

function centerText(ctx: CanvasRenderingContext2D, text: string, y: number, size: number, color = '#ffffff', weight = 800): void {
  ctx.textAlign = 'center';
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px system-ui, -apple-system, Segoe UI, sans-serif`;
  ctx.fillText(text, BOARD_W / 2, y);
}

function drawAvatar(ctx: CanvasRenderingContext2D, avatar: HTMLImageElement, cy: number): void {
  const r = 70;
  ctx.save();
  ctx.beginPath();
  ctx.arc(BOARD_W / 2, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatar, BOARD_W / 2 - r, cy - r, r * 2, r * 2);
  ctx.restore();
}

// The game's actual mark — same artwork as assets/icon.png — drawn in code so
// the title screen never depends on loading an external image file.
function drawLogoMark(ctx: CanvasRenderingContext2D, cy: number): void {
  const w = 148;
  const cx = BOARD_W / 2;

  const glow = ctx.createRadialGradient(cx, cy, 10, cx, cy, w * 1.1);
  glow.addColorStop(0, 'rgba(255, 211, 107, 0.28)');
  glow.addColorStop(1, 'rgba(255, 211, 107, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - w * 1.2, cy - w * 1.2, w * 2.4, w * 2.4);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#ffd36b';
  roundRect(ctx, cx - w / 2, cy - (w * 0.82) / 2, w, w * 0.82, 24);
  ctx.fill();
  ctx.restore();
  face(ctx, cx, cy, w, 'happy');

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, cy + w * 0.62, 10, 0, Math.PI * 2);
  ctx.fill();
  const pg = ctx.createLinearGradient(0, cy + 0.76 * w, 0, cy + 0.9 * w);
  pg.addColorStop(0, '#8fe3a0');
  pg.addColorStop(1, '#6bc9ff');
  ctx.fillStyle = pg;
  roundRect(ctx, cx - w * 0.3, cy + 0.76 * w, w * 0.6, 12, 6);
  ctx.fill();
}

export function drawTitle(ctx: CanvasRenderingContext2D, profile: Profile): void {
  if (profile.avatar) drawAvatar(ctx, profile.avatar, 300);
  else drawLogoMark(ctx, 300);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 2;
  ctx.shadowOffsetY = 3;
  centerText(ctx, 'BRICKMOJI', 500, 78);
  ctx.restore();
  centerText(ctx, 'smash the smiley bricks', 548, 28, 'rgba(255,255,255,0.78)', 500);

  const pillY = 660;
  const pillW = 320;
  const pillH = 76;
  const pg = ctx.createLinearGradient(0, pillY - pillH / 2, 0, pillY + pillH / 2);
  pg.addColorStop(0, '#9af0ad');
  pg.addColorStop(1, '#5fd1a6');
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = pg;
  roundRect(ctx, BOARD_W / 2 - pillW / 2, pillY - pillH / 2, pillW, pillH, pillH / 2);
  ctx.fill();
  ctx.restore();
  centerText(ctx, '▶ TAP TO START', pillY + 12, 38, '#1a1033', 800);

  if (profile.best > 0) {
    centerText(ctx, `BEST ${profile.best}`, 790, 28, 'rgba(255,255,255,0.65)', 600);
  }
  centerText(ctx, 'drag to move · tap to launch', BOARD_H - 60, 22, 'rgba(255,255,255,0.45)', 500);
}

export function drawServeHint(ctx: CanvasRenderingContext2D): void {
  centerText(ctx, 'TAP TO LAUNCH', PADDLE_Y - 70, 30, 'rgba(255,255,255,0.85)', 700);
}

export function drawLevelClear(ctx: CanvasRenderingContext2D, text: string): void {
  ctx.fillStyle = 'rgba(26,16,51,0.55)';
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  centerText(ctx, text, BOARD_H / 2, 54, '#ffd36b');
}

export function drawGameOver(ctx: CanvasRenderingContext2D, score: number, best: number, isNewBest: boolean): void {
  ctx.fillStyle = 'rgba(26,16,51,0.78)';
  ctx.fillRect(0, 0, BOARD_W, BOARD_H);
  centerText(ctx, 'GAME OVER', 460, 64, '#ff8fb3');
  centerText(ctx, `SCORE ${score}`, 540, 42);
  if (isNewBest) {
    centerText(ctx, 'NEW BEST!', 600, 32, '#8fe3a0', 700);
  } else {
    centerText(ctx, `BEST ${best}`, 600, 30, 'rgba(255,255,255,0.7)', 600);
  }
  centerText(ctx, '▶ TAP TO RETRY', 740, 36, '#ffd36b');
  centerText(ctx, 'tap the score to see the leaderboard', 800, 22, 'rgba(255,255,255,0.55)', 500);
}
