// Every sound here is a synthesized tone (Web Audio oscillators) — no audio
// files, so the game stays a few KB of pure code. unlock() must run inside a
// real user gesture (browsers block audio otherwise); main.ts calls it on the
// first tap, which also starts the soft background pad.

export class Sound {
  private ctx: AudioContext | null = null;

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    this.ctx = new Ctx();
    return this.ctx;
  }

  unlock(): void {
    const ctx = this.ensure();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  private tone(freq: number, duration: number, opts: { type?: OscillatorType; gain?: number; glideTo?: number } = {}): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (opts.glideTo) osc.frequency.linearRampToValueAtTime(opts.glideTo, ctx.currentTime + duration);
    const peak = opts.gain ?? 0.12;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(peak, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  paddleHit(): void {
    this.tone(220, 0.09, { type: 'triangle', gain: 0.14 });
  }

  wallHit(): void {
    this.tone(520, 0.05, { type: 'sine', gain: 0.06 });
  }

  /** Pitch rises slightly with the brick's remaining hp so a tough brick "cracking" reads differently from one popping. */
  brickHit(stillAlive: boolean): void {
    this.tone(stillAlive ? 660 : 880, 0.11, { type: 'square', gain: 0.1, glideTo: stillAlive ? 740 : 1100 });
  }

  lifeLost(): void {
    this.tone(300, 0.35, { type: 'sawtooth', gain: 0.12, glideTo: 120 });
  }

  levelClear(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const t = i * 0.09;
      setTimeout(() => this.tone(freq, 0.18, { type: 'triangle', gain: 0.1 }), t * 1000);
    });
    void ctx;
  }

  gameOver(): void {
    [392, 330, 262].forEach((freq, i) => setTimeout(() => this.tone(freq, 0.3, { type: 'sine', gain: 0.1 }), i * 140));
  }

  // A soft two-note pad with a slow volume breathe — background ambience,
  // never loud enough to compete with the SFX above.
  startPad(): void {
    const ctx = this.ensure();
    if (!ctx) return;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 2);
    master.connect(ctx.destination);

    for (const freq of [130.81, 196.0]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.connect(master);
      osc.start();
    }

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.012;
    lfo.connect(lfoGain).connect(master.gain);
    lfo.start();
  }
}
