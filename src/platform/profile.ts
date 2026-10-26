// Snapchat Web Lens integration, trimmed down from ECHOES' version: a best
// score (Snap leaderboard inside the Lens, localStorage everywhere else) and
// the player's own Bitmoji face for the title/game-over screens. Every call
// is guarded — a record or an avatar is never worth breaking the game over.

const KEY = 'brickmoji.best.v1';
const INIT_TIMEOUT_MS = 2000;

interface SnapApi {
  isStub?: boolean;
  init(): Promise<unknown>;
  isSupported(name: string): boolean;
  leaderboards: { submitScore(o: { score: number }): Promise<{ bestScore?: number } | undefined>; show(): Promise<unknown> };
  bitmoji: { getAvatarInfo(): Promise<{ hasAvatar: boolean }>; get2DAvatar(o: { size: string }): Promise<{ url: string }> };
  storage: { get(key: string): Promise<{ found: boolean; value?: unknown }>; set(key: string, value: unknown): Promise<unknown> };
}

export class Profile {
  best = 0;
  leaderboards = false;
  avatar: HTMLImageElement | null = null;

  private snap: SnapApi | null = null;
  private snapStorage = false;

  async load(): Promise<void> {
    const snap = (globalThis as unknown as { snapchat?: SnapApi }).snapchat;
    if (snap) {
      try {
        await Promise.race([snap.init(), new Promise((r) => setTimeout(r, INIT_TIMEOUT_MS))]);
        this.snap = snap;
        this.leaderboards = snap.isSupported('leaderboards');
        this.snapStorage = snap.isSupported('storage');
        if (snap.isSupported('bitmoji') && !snap.isStub) void this.loadAvatar(snap);
        if (this.snapStorage) {
          const got = await snap.storage.get(KEY);
          this.best = typeof got.value === 'number' ? got.value : 0;
          return;
        }
      } catch {
        this.snapStorage = false;
      }
    }
    try {
      this.best = Number(globalThis.localStorage?.getItem(KEY) ?? 0) || 0;
    } catch {
      this.best = 0;
    }
  }

  /** A run ended with `score`. Returns true if it's a new best. */
  reportScore(score: number): boolean {
    const isBest = score > this.best;
    if (isBest) this.best = score;
    this.save();
    if (this.leaderboards && this.snap) {
      const snap = this.snap;
      void snap.leaderboards
        .submitScore({ score: Math.max(0, Math.round(score)) })
        .then((r) => {
          if (typeof r?.bestScore === 'number' && r.bestScore > this.best) {
            this.best = Math.floor(r.bestScore);
            this.save();
          }
        })
        .catch(() => {});
    }
    return isBest;
  }

  showLeaderboard(): void {
    if (this.leaderboards && this.snap) void this.snap.leaderboards.show().catch(() => {});
  }

  private async loadAvatar(snap: SnapApi): Promise<void> {
    try {
      if (!(await snap.bitmoji.getAvatarInfo()).hasAvatar) return;
      const { url } = await snap.bitmoji.get2DAvatar({ size: 'medium' });
      const img = new Image();
      img.onload = () => (this.avatar = img);
      img.src = url;
    } catch {
      /* no Bitmoji — the screens draw a cartoon face instead */
    }
  }

  private save(): void {
    const value = this.best;
    if (this.snapStorage && this.snap) {
      void this.snap.storage.set(KEY, value).catch(() => {});
      return;
    }
    try {
      globalThis.localStorage?.setItem(KEY, String(value));
    } catch {
      /* private window — the best score holds for the session only */
    }
  }
}
