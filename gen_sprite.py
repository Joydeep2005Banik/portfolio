#!/usr/bin/env python3
"""Generate a GBA-style 16×16 walking character sprite sheet.

Layout: 3 columns (animation frames) × 4 rows (down, left, right, up)
Each frame is 16×16 pixels  →  output is 48×64 PNG.
"""

import struct, zlib, os

W, H = 16, 16       # frame size
COLS, ROWS = 3, 4   # frames per direction, directions
IMG_W = W * COLS     # 48
IMG_H = H * ROWS     # 64

# ── colour palette (RGBA) ────────────────────────────────────
TRANSPARENT = (0, 0, 0, 0)
SKIN        = (255, 206, 158, 255)
HAIR        = (56,  40,  24, 255)
HAT         = (224,  56,  56, 255)     # red cap
SHIRT       = (56,  120, 216, 255)    # blue shirt
PANTS       = (72,   72, 112, 255)
SHOES       = (96,   56,  40, 255)
EYE         = (24,   24,  24, 255)
WHITE_EYE   = (255, 255, 255, 255)
OUTLINE     = (32,   32,  48, 255)

def blank():
    return [[TRANSPARENT]*W for _ in range(H)]

def draw_pixel(frame, x, y, c):
    if 0 <= x < W and 0 <= y < H:
        frame[y][x] = c

def draw_rect(frame, x, y, w, h, c):
    for dy in range(h):
        for dx in range(w):
            draw_pixel(frame, x+dx, y+dy, c)

# ── build a single frame ────────────────────────────────────
def make_frame(direction, anim):
    """direction: 0=down,1=left,2=right,3=up   anim: 0,1,2 (1=idle, 0/2=walk)"""
    f = blank()

    # leg offsets for walk animation
    l_off = 0
    r_off = 0
    if anim == 0:
        l_off = -1; r_off = 1
    elif anim == 2:
        l_off = 1; r_off = -1

    # --- Hat (rows 0-3) ---
    draw_rect(f, 4, 0, 8, 1, OUTLINE)
    draw_rect(f, 3, 1, 10, 1, HAT)
    draw_rect(f, 3, 2, 10, 1, HAT)
    draw_rect(f, 4, 3, 8, 1, HAT)

    # --- Head (rows 3-7) ---
    draw_rect(f, 5, 3, 6, 1, HAIR)
    draw_rect(f, 4, 4, 8, 1, SKIN)
    draw_rect(f, 4, 5, 8, 1, SKIN)
    draw_rect(f, 5, 6, 6, 1, SKIN)
    draw_rect(f, 5, 7, 6, 1, OUTLINE)

    # --- Eyes based on direction ---
    if direction == 0:  # facing down
        draw_pixel(f, 6, 5, WHITE_EYE)
        draw_pixel(f, 6, 6, EYE)
        draw_pixel(f, 9, 5, WHITE_EYE)
        draw_pixel(f, 9, 6, EYE)
    elif direction == 1:  # facing left
        draw_pixel(f, 5, 5, WHITE_EYE)
        draw_pixel(f, 5, 6, EYE)
    elif direction == 2:  # facing right
        draw_pixel(f, 10, 5, WHITE_EYE)
        draw_pixel(f, 10, 6, EYE)
    # direction 3 (up): no eyes visible

    # --- Body / Shirt (rows 7-10) ---
    draw_rect(f, 5, 7, 6, 1, SHIRT)
    draw_rect(f, 4, 8, 8, 1, SHIRT)
    draw_rect(f, 4, 9, 8, 1, SHIRT)
    draw_rect(f, 5, 10, 6, 1, SHIRT)

    # --- Arms ---
    if direction in (0, 3):
        arm_l = 3 if anim != 0 else 3
        arm_r = 12 if anim != 2 else 12
        draw_rect(f, 3, 8, 1, 2, SKIN)
        draw_rect(f, 12, 8, 1, 2, SKIN)
    elif direction == 1:
        draw_rect(f, 3, 8, 1, 2, SKIN)
    elif direction == 2:
        draw_rect(f, 12, 8, 1, 2, SKIN)

    # --- Pants (rows 10-12) ---
    draw_rect(f, 5, 10, 6, 1, PANTS)
    draw_rect(f, 5, 11, 6, 1, PANTS)
    draw_rect(f, 5, 12, 6, 1, PANTS)

    # --- Legs + Shoes (rows 13-15) ---
    # left leg
    lx = 5 + l_off
    draw_rect(f, lx, 13, 2, 1, PANTS)
    draw_rect(f, lx, 14, 2, 1, SHOES)
    draw_rect(f, lx, 15, 2, 1, OUTLINE)

    # right leg
    rx = 9 + r_off
    draw_rect(f, rx, 13, 2, 1, PANTS)
    draw_rect(f, rx, 14, 2, 1, SHOES)
    draw_rect(f, rx, 15, 2, 1, OUTLINE)

    return f

# ── assemble the full sheet ──────────────────────────────────
pixels = [[TRANSPARENT]*(IMG_W) for _ in range(IMG_H)]

for row in range(ROWS):          # direction
    for col in range(COLS):      # anim frame
        frame = make_frame(row, col)
        ox = col * W
        oy = row * H
        for y in range(H):
            for x in range(W):
                pixels[oy+y][ox+x] = frame[y][x]

# ── write PNG (pure Python, no dependencies) ─────────────────
def make_png(width, height, pixels):
    """pixels: list[list[tuple(r,g,b,a)]]"""
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)

    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)  # 8-bit RGBA
    raw = b''
    for row in pixels:
        raw += b'\x00'  # filter byte
        for r, g, b, a in row:
            raw += struct.pack('BBBB', r, g, b, a)
    idat = zlib.compress(raw)

    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', idat) + chunk(b'IEND', b'')

out = os.path.join(os.path.dirname(__file__), 'public', 'assets', 'sprites', 'player.png')
with open(out, 'wb') as fp:
    fp.write(make_png(IMG_W, IMG_H, pixels))

print(f"Wrote {out}  ({IMG_W}×{IMG_H}, {COLS}×{ROWS} frames of {W}×{H})")
