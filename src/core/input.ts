/** Layout-independent key codes we care about. */
const TRACKED_KEYS: ReadonlySet<string> = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "KeyZ",
  "KeyX",
  "Enter",
  "Escape",
]);

/**
 * Keyboard input manager.
 *
 * Tracks held and just-pressed state for a fixed set of keys using
 * `event.code` (layout-independent).
 *
 * Usage:
 *   – `isHeld(code)`        → true while the key is physically down (movement)
 *   – `isJustPressed(code)` → true only on the first frame after a key-down (interaction)
 *   – call `update()` at the **end** of every frame to clear just-pressed state
 */
export class Input {
  /** Keys currently held down. */
  private held: Record<string, boolean> = {};

  /** Keys that went from up → down since the last `update()` call. */
  private justPressed: Record<string, boolean> = {};

  constructor() {
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      if (!TRACKED_KEYS.has(e.code)) return;

      // Ignore OS key-repeat; we only care about the initial press.
      if (!e.repeat && !this.held[e.code]) {
        this.justPressed[e.code] = true;
      }

      this.held[e.code] = true;
    });

    window.addEventListener("keyup", (e: KeyboardEvent) => {
      if (!TRACKED_KEYS.has(e.code)) return;
      this.held[e.code] = false;
    });
  }

  /** True while the key is physically held down. Use for continuous actions (movement). */
  public isHeld(code: string): boolean {
    return this.held[code] === true;
  }

  /** True only on the frame the key first went down. Use for discrete actions (dialogue advance). */
  public isJustPressed(code: string): boolean {
    return this.justPressed[code] === true;
  }

  /** Call at the END of each game-loop frame to reset just-pressed flags. */
  public update(): void {
    this.justPressed = {};
  }
}
