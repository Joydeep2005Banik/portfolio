import { Input } from "./input";

/**
 * Sprite-sheet layout (player.png):
 *   3 columns  (animation frames: walk-left, idle, walk-right)
 *   4 rows     (directions: down, left, right, up)
 *   Each frame is 16 × 16 pixels.
 */
const FRAME_W = 16;
const FRAME_H = 16;

/** Row index for each facing direction in the sprite sheet. */
const Dir = {
  Down:  0,
  Left:  1,
  Right: 2,
  Up:    3,
} as const;
type Dir = (typeof Dir)[keyof typeof Dir];

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private input: Input;

  private lastTime: number = 0;
  private readonly boundLoop: (timestamp: number) => void;

  // Position & size (rendered at 2× scale → 32 × 32 on screen)
  private posX: number = 0;
  private posY: number = 120;
  private readonly drawW: number = 32;
  private readonly drawH: number = 32;
  private readonly speed: number = 0.08; // px / ms  (~80 px/s)

  // Sprite state
  private spriteSheet!: HTMLImageElement;
  private spriteLoaded: boolean = false;
  private facing: Dir = Dir.Down;
  private animFrame: number = 1;           // 0, 1, 2
  private animTimer: number = 0;
  private readonly frameDuration: number = 150; // ms per animation frame

  constructor() {
    this.canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;
    this.canvas.width = 320;
    this.canvas.height = 288;
    this.boundLoop = this.loop.bind(this);
    this.input = new Input();
  }

  // ── asset loading ──────────────────────────────────────────
  private loadSprite(): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = "/assets/sprites/player.png";
      img.onload = () => {
        this.spriteSheet = img;
        this.spriteLoaded = true;
        resolve();
      };
      img.onerror = () => reject(new Error("Failed to load player sprite sheet"));
    });
  }

  // ── update ─────────────────────────────────────────────────
  private update(deltaTime: number): void {
    let moving = false;

    if (this.input.isHeld("ArrowRight")) {
      this.posX += this.speed * deltaTime;
      this.facing = Dir.Right;
      moving = true;
    }
    if (this.input.isHeld("ArrowLeft")) {
      this.posX -= this.speed * deltaTime;
      this.facing = Dir.Left;
      moving = true;
    }
    if (this.input.isHeld("ArrowDown")) {
      this.posY += this.speed * deltaTime;
      this.facing = Dir.Down;
      moving = true;
    }
    if (this.input.isHeld("ArrowUp")) {
      this.posY -= this.speed * deltaTime;
      this.facing = Dir.Up;
      moving = true;
    }

    // Clamp to canvas bounds
    this.posX = Math.max(-this.drawW, Math.min(this.posX, this.canvas.width));
    this.posY = Math.max(-this.drawH, Math.min(this.posY, this.canvas.height));

    // Walk animation cycle: 0 → 1 → 2 → 1 → 0 …
    if (moving) {
      this.animTimer += deltaTime;
      if (this.animTimer >= this.frameDuration) {
        this.animTimer -= this.frameDuration;
        this.animFrame = (this.animFrame + 1) % 4;
      }
    } else {
      this.animFrame = 1; // idle = middle frame
      this.animTimer = 0;
    }
  }

  // ── render ─────────────────────────────────────────────────
  private render(): void {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!this.spriteLoaded) return;

    // Map animFrame (0-3 cycle) to sprite column (0,1,2,1)
    const colMap = [0, 1, 2, 1];
    const col = colMap[this.animFrame];
    const row = this.facing as number;

    // Source rectangle in sprite sheet
    const sx = col * FRAME_W;
    const sy = row * FRAME_H;

    // 9-argument drawImage: (img, sx, sy, sw, sh, dx, dy, dw, dh)
    ctx.drawImage(
      this.spriteSheet,
      sx, sy, FRAME_W, FRAME_H,                       // source rect
      Math.round(this.posX), Math.round(this.posY),    // dest position
      this.drawW, this.drawH,                           // dest size (2× scale)
    );
  }

  // ── loop ───────────────────────────────────────────────────
  private loop(timestamp: number): void {
    if (this.lastTime === 0) {
      this.lastTime = timestamp;
    }
    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();
    this.input.update();

    requestAnimationFrame(this.boundLoop);
  }

  // ── public entry-point ─────────────────────────────────────
  public start(): void {
    this.loadSprite().then(() => {
      requestAnimationFrame(this.boundLoop);
    }).catch((err) => {
      console.error("Failed to start game:", err);
    });
  }
}