// Board-space pointer tracking. main.ts converts raw client coords to board
// coordinates (accounting for the canvas's letterboxed scale) before calling
// these — this module never touches the DOM.

export class Input {
  /** Latest pointer x in board space; null when nothing is held. */
  pointerX: number | null = null;
  private tapQueued = false;

  down(boardX: number): void {
    this.pointerX = boardX;
    this.tapQueued = true;
  }

  move(boardX: number): void {
    this.pointerX = boardX;
  }

  up(): void {
    this.pointerX = null;
  }

  /** Consumes and returns whether a tap/click happened since the last check. */
  consumeTap(): boolean {
    const had = this.tapQueued;
    this.tapQueued = false;
    return had;
  }
}
