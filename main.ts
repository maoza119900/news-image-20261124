// THE WORLD TODAY — 24 November 2026.
// A Node 22, standard-library-only program that draws a newspaper front page
// summing up the world's news of Tuesday 24 November 2026 and writes it as a
// deterministic 1024x1024 PNG to $MAKEFUN_OUTPUT_DIR/entry.png (or /output).
// No network, no Date.now, no Math.random: two runs write identical bytes.
// Text is rendered with an embedded 5x7 bitmap font; the picture is drawn
// with simple geometric shapes (rects, lines, circles, triangles).

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- colours
const PAPER: [number, number, number] = [251, 251, 243];
const INK: [number, number, number] = [20, 20, 20];
const GREY: [number, number, number] = [90, 90, 90];
const RULE: [number, number, number] = [150, 150, 140];
const RED: [number, number, number] = [140, 29, 24];
const GREEN: [number, number, number] = [74, 120, 0];
const BLUE: [number, number, number] = [31, 58, 110];
const ORANGE: [number, number, number] = [200, 90, 20];
const LIGHT: [number, number, number] = [235, 235, 225];

// ---------------------------------------------------------------- buffer
const buf = Buffer.alloc(W * H * 3);
for (let i = 0; i < W * H; i++) {
  buf[i * 3] = PAPER[0];
  buf[i * 3 + 1] = PAPER[1];
  buf[i * 3 + 2] = PAPER[2];
}

function px(x: number, y: number, c: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  buf[i] = c[0];
  buf[i + 1] = c[1];
  buf[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: [number, number, number]): void {
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) px(xx, yy, c);
}

function hline(x: number, y: number, w: number, c: [number, number, number]): void {
  for (let xx = x; xx < x + w; xx++) px(xx, y, c);
}

function vline(x: number, y: number, h: number, c: [number, number, number]): void {
  for (let yy = y; yy < y + h; yy++) px(x, yy, c);
}

function line(x0: number, y0: number, x1: number, y1: number, c: [number, number, number]): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    px(x, y, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

function circle(cx: number, cy: number, r: number, c: [number, number, number], fill: boolean): void {
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (fill ? d <= r : Math.abs(d - r) < 0.8) px(cx + x, cy + y, c);
    }
  }
}

function triangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: [number, number, number]): void {
  const minX = Math.min(x0, x1, x2);
  const maxX = Math.max(x0, x1, x2);
  const minY = Math.min(y0, y1, y2);
  const maxY = Math.max(y0, y1, y2);
  const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d;
      const b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d;
      const cc = 1 - a - b;
      if (a >= 0 && b >= 0 && cc >= 0) px(x, y, c);
    }
  }
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows of 5 cells, '#' = ink, '.' = blank.
const FONT: Record<string, string[]> = {
  A: ['.###.', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  B: ['####.', '#...#', '#...#', '####.', '#...#', '#...#', '####.'],
  C: ['.####', '#....', '#....', '#....', '#....', '#....', '.####'],
  D: ['####.', '#...#', '#...#', '#...#', '#...#', '#...#', '####.'],
  E: ['#####', '#....', '#....', '####.', '#....', '#....', '#####'],
  F: ['#####', '#....', '#....', '####.', '#....', '#....', '#....'],
  G: ['.####', '#....', '#....', '#.###', '#...#', '#...#', '.###.'],
  H: ['#...#', '#...#', '#...#', '#####', '#...#', '#...#', '#...#'],
  I: ['.###.', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  J: ['..###', '...#.', '...#.', '...#.', '...#.', '#..#.', '.##..'],
  K: ['#...#', '#..#.', '#.#..', '##...', '#.#..', '#..#.', '#...#'],
  L: ['#....', '#....', '#....', '#....', '#....', '#....', '#####'],
  M: ['#...#', '##.##', '#.#.#', '#.#.#', '#...#', '#...#', '#...#'],
  N: ['#...#', '##..#', '##..#', '#.#.#', '#..##', '#..##', '#...#'],
  O: ['.###.', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  P: ['####.', '#...#', '#...#', '####.', '#....', '#....', '#....'],
  Q: ['.###.', '#...#', '#...#', '#...#', '#.#.#', '#..#.', '.##.#'],
  R: ['####.', '#...#', '#...#', '####.', '#.#..', '#..#.', '#...#'],
  S: ['.####', '#....', '#....', '.###.', '....#', '....#', '####.'],
  T: ['#####', '..#..', '..#..', '..#..', '..#..', '..#..', '..#..'],
  U: ['#...#', '#...#', '#...#', '#...#', '#...#', '#...#', '.###.'],
  V: ['#...#', '#...#', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  W: ['#...#', '#...#', '#...#', '#.#.#', '#.#.#', '##.##', '#...#'],
  X: ['#...#', '#...#', '.#.#.', '..#..', '.#.#.', '#...#', '#...#'],
  Y: ['#...#', '#...#', '.#.#.', '..#..', '..#..', '..#..', '..#..'],
  Z: ['#####', '....#', '...#.', '..#..', '.#...', '#....', '#####'],
  a: ['.....', '.....', '.####.', '....#', '.####', '#...#', '.####'],
  b: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '####.'],
  c: ['.....', '.....', '.####', '#....', '#....', '#....', '.####'],
  d: ['....#', '....#', '.####', '#...#', '#...#', '#...#', '.####'],
  e: ['.....', '.....', '.###.', '#...#', '#####', '#....', '.###.'],
  f: ['..##.', '.#..#', '.#...', '####.', '.#...', '.#...', '.#...'],
  g: ['.....', '.....', '.####', '#...#', '#...#', '.####', '....#', '.###.'],
  h: ['#....', '#....', '####.', '#...#', '#...#', '#...#', '#...#'],
  i: ['..#..', '.....', '.##..', '..#..', '..#..', '..#..', '.###.'],
  j: ['...#.', '.....', '..##.', '...#.', '...#.', '...#.', '...#.', '##...'],
  k: ['#....', '#....', '#..#.', '#.#..', '##...', '#.#..', '#..#.'],
  l: ['.##..', '..#..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  m: ['.....', '.....', '##.#.', '#.#.#', '#.#.#', '#.#.#', '#.#.#'],
  n: ['.....', '.....', '####.', '#...#', '#...#', '#...#', '#...#'],
  o: ['.....', '.....', '.###.', '#...#', '#...#', '#...#', '.###.'],
  p: ['.....', '.....', '####.', '#...#', '#...#', '####.', '#....', '#....'],
  q: ['.....', '.....', '.####', '#...#', '#...#', '.####', '....#', '....#'],
  r: ['.....', '.....', '#.##.', '##..#', '#....', '#....', '#....'],
  s: ['.....', '.....', '.####', '#....', '.###.', '....#', '####.'],
  t: ['.#...', '.#...', '####.', '.#...', '.#...', '.#...', '..##.'],
  u: ['.....', '.....', '#...#', '#...#', '#...#', '#..##', '.##.#'],
  v: ['.....', '.....', '#...#', '#...#', '#...#', '.#.#.', '..#..'],
  w: ['.....', '.....', '#...#', '#.#.#', '#.#.#', '#.#.#', '.#.#.'],
  x: ['.....', '.....', '#...#', '.#.#.', '..#..', '.#.#.', '#...#'],
  y: ['.....', '.....', '#...#', '#...#', '#...#', '.####', '....#', '.###.'],
  z: ['.....', '.....', '#####', '...#.', '..#..', '.#...', '#####'],
  '0': ['.###.', '#..##', '#.#.#', '##..#', '#...#', '#...#', '.###.'],
  '1': ['..#..', '.##..', '..#..', '..#..', '..#..', '..#..', '.###.'],
  '2': ['.###.', '#...#', '....#', '...#.', '..#..', '.#...', '#####'],
  '3': ['####.', '....#', '....#', '.###.', '....#', '....#', '####.'],
  '4': ['...#.', '..##.', '.#.#.', '#..#.', '#####', '...#.', '...#.'],
  '5': ['#####', '#....', '####.', '....#', '....#', '#...#', '.###.'],
  '6': ['.###.', '#....', '#....', '####.', '#...#', '#...#', '.###.'],
  '7': ['#####', '....#', '...#.', '...#.', '..#..', '..#..', '..#..'],
  '8': ['.###.', '#...#', '#...#', '.###.', '#...#', '#...#', '.###.'],
  '9': ['.###.', '#...#', '#...#', '.####', '....#', '....#', '.###.'],
  ' ': ['.....', '.....', '.....', '.....', '.....', '.....', '.....'],
  '.': ['.....', '.....', '.....', '.....', '.....', '.##..', '.##..'],
  ',': ['.....', '.....', '.....', '.....', '.##..', '.##..', '.#...'],
  ':': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.....'],
  ';': ['.....', '.##..', '.##..', '.....', '.##..', '.##..', '.#...'],
  "'": ['..#..', '..#..', '.#...', '.....', '.....', '.....', '.....'],
  '"': ['.#.#.', '.#.#.', '.....', '.....', '.....', '.....', '.....'],
  '!': ['..#..', '..#..', '..#..', '..#..', '..#..', '.....', '..#..'],
  '?': ['.###.', '#...#', '....#', '...#.', '..#..', '.....', '..#..'],
  '-': ['.....', '.....', '.....', '.###.', '.....', '.....', '.....'],
  '(': ['...#.', '..#..', '.#...', '.#...', '.#...', '..#..', '...#.'],
  ')': ['.#...', '..#..', '...#.', '...#.', '...#.', '..#..', '.#...'],
  '/': ['....#', '....#', '...#.', '..#..', '.#...', '#....', '#....'],
  '%': ['##..#', '##.#.', '...#.', '..#..', '.#...', '#.##.', '#..##'],
  $: ['..#..', '.####', '#.#..', '.###.', '..#.#', '####.', '..#..'],
  '&': ['.##..', '#..#.', '#.#..', '.#...', '#.#.#', '#..#.', '.##.#'],
  '+': ['.....', '..#..', '..#..', '#####', '..#..', '..#..', '.....'],
  '=': ['.....', '.....', '#####', '.....', '#####', '.....', '.....'],
  '*': ['.....', '.#.#.', '.###.', '#####', '.###.', '.#.#.', '.....'],
  '#': ['.#.#.', '.#.#.', '#####', '.#.#.', '#####', '.#.#.', '.#.#.'],
  _: ['.....', '.....', '.....', '.....', '.....', '.....', '#####'],
};

// glyph heights vary for descenders (g, j, p, q, y are 8 rows); normalise to 7.
function glyphRows(ch: string): string[] {
  const g = FONT[ch] ?? FONT['?'];
  return g.slice(0, 7);
}

function charWidth(scale: number): number {
  return 6 * scale;
}

function textWidth(s: string, scale: number): number {
  return s.length * charWidth(scale) - scale;
}

function drawGlyph(ch: string, x: number, y: number, scale: number, c: [number, number, number]): void {
  const rows = glyphRows(ch);
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (rows[r][col] === '#') {
        rect(x + col * scale, y + r * scale, scale, scale, c);
      }
    }
  }
}

function drawText(x: number, y: number, s: string, scale: number, c: [number, number, number]): void {
  for (let i = 0; i < s.length; i++) {
    drawGlyph(s[i], x + i * charWidth(scale), y, scale, c);
  }
}

function drawTextCentred(cx: number, y: number, s: string, scale: number, c: [number, number, number]): void {
  drawText(cx - Math.floor(textWidth(s, scale) / 2), y, s, scale, c);
}

function wrapText(s: string, scale: number, maxWidth: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const trial = cur === '' ? w : cur + ' ' + w;
    if (textWidth(trial, scale) <= maxWidth) {
      cur = trial;
    } else {
      if (cur !== '') lines.push(cur);
      cur = w;
    }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}

// Draws wrapped lines starting at (x, y); returns the y just below the block.
function drawPara(x: number, y: number, s: string, scale: number, maxWidth: number, c: [number, number, number]): number {
  const lines = wrapText(s, scale, maxWidth);
  const leading = 7 * scale + (scale >= 2 ? 6 : 3);
  for (let i = 0; i < lines.length; i++) {
    drawText(x, y + i * leading, lines[i], scale, c);
  }
  return y + lines.length * leading;
}

// ---------------------------------------------------------------- PNG encoder
const CRC_TABLE: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}

function crc32(data: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function encodePng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    buf.copy(raw, y * (1 + W * 3) + 1, y * W * 3, (y + 1) * W * 3);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- illustrations
function drawChip(x: number, y: number, s: number): void {
  // A green computer chip with pins, a rising share-price line and an arrow.
  const w = 150 * s;
  const h = 110 * s;
  rect(x, y, w, h, LIGHT);
  for (let i = 0; i < 5; i++) {
    rect(x + 8 * s + i * 28 * s, y - 8 * s, 12 * s, 8 * s, INK);
    rect(x + 8 * s + i * 28 * s, y + h, 12 * s, 8 * s, INK);
    rect(x - 8 * s, y + 8 * s + i * 20 * s, 8 * s, 12 * s, INK);
    rect(x + w, y + 8 * s + i * 20 * s, 8 * s, 12 * s, INK);
  }
  rect(x + 28 * s, y + 22 * s, 94 * s, 66 * s, GREEN);
  rect(x + 40 * s, y + 34 * s, 70 * s, 42 * s, PAPER);
  drawText(x + 52 * s, y + 44 * s, 'NVDA', 2, GREEN);
  // rising line chart across the lower part
  line(x + 10 * s, y + h - 14 * s, x + 50 * s, y + h - 30 * s, RED);
  line(x + 50 * s, y + h - 30 * s, x + 90 * s, y + h - 24 * s, RED);
  line(x + 90 * s, y + h - 24 * s, x + 138 * s, y + h - 52 * s, RED);
  triangle(x + 138 * s, y + h - 58 * s, x + 128 * s, y + h - 44 * s, x + 144 * s, y + h - 46 * s, RED);
}

function drawShip(x: number, y: number, s: number): void {
  // A warship on waves under a burst of smoke.
  const w = 210 * s;
  const h = 80 * s;
  // smoke burst
  circle(x + 150 * s, y + 8 * s, 10 * s, GREY, true);
  circle(x + 168 * s, y + 16 * s, 8 * s, GREY, true);
  circle(x + 136 * s, y + 18 * s, 7 * s, GREY, true);
  // hull
  triangle(x + 10 * s, y + 46 * s, x + 190 * s, y + 46 * s, x + 168 * s, y + 66 * s, BLUE);
  rect(x + 10 * s, y + 46 * s, 158 * s, 6 * s, BLUE);
  // superstructure + mast
  rect(x + 78 * s, y + 28 * s, 46 * s, 18 * s, BLUE);
  vline(x + 100 * s, y + 10 * s, 20 * s, INK);
  line(x + 100 * s, y + 10 * s, x + 118 * s, y + 18 * s, RED);
  // waves
  for (let i = 0; i < 6; i++) {
    const wx = x + i * 36 * s;
    line(wx, y + h - 4 * s, wx + 12 * s, y + h - 10 * s, BLUE);
    line(wx + 12 * s, y + h - 10 * s, wx + 24 * s, y + h - 4 * s, BLUE);
  }
  void w;
}

function drawGlobe(x: number, y: number, s: number): void {
  // A cracked globe: the climate talks failed.
  const r = 42 * s;
  circle(x + r, y + r, r, BLUE, false);
  for (let i = 0; i < 3; i++) {
    const yy = y + 14 * s + i * 28 * s;
    line(x + 8 * s, yy, x + 2 * r - 8 * s, yy, BLUE);
  }
  line(x + r, y + 4 * s, x + r, y + 2 * r - 4 * s, BLUE);
  // crack
  line(x + r - 6 * s, y + 6 * s, x + r + 8 * s, y + 30 * s, RED);
  line(x + r + 8 * s, y + 30 * s, x + r - 4 * s, y + 52 * s, RED);
  line(x + r - 4 * s, y + 52 * s, x + r + 10 * s, y + 2 * r - 8 * s, RED);
  // sun
  circle(x + 2 * r + 22 * s, y + 12 * s, 9 * s, ORANGE, true);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    line(
      x + 2 * r + 22 * s + Math.round(Math.cos(a) * 13 * s),
      y + 12 * s + Math.round(Math.sin(a) * 13 * s),
      x + 2 * r + 22 * s + Math.round(Math.cos(a) * 18 * s),
      y + 12 * s + Math.round(Math.sin(a) * 18 * s),
      ORANGE,
    );
  }
}

function drawDome(x: number, y: number, s: number): void {
  // A capitol dome for the Congress story.
  const w = 90 * s;
  rect(x, y + 40 * s, w, 8 * s, BLUE);
  for (let i = 0; i < 5; i++) rect(x + 6 * s + i * 17 * s, y + 48 * s, 6 * s, 26 * s, BLUE);
  rect(x, y + 74 * s, w, 6 * s, BLUE);
  triangle(x + 10 * s, y + 40 * s, x + w - 10 * s, y + 40 * s, x + w / 2, y + 8 * s, BLUE);
  vline(x + w / 2, y, 10 * s, BLUE);
}

function drawFlame(x: number, y: number, s: number): void {
  triangle(x + 20 * s, y + 70 * s, x + 45 * s, y, x + 70 * s, y + 70 * s, ORANGE);
  triangle(x + 32 * s, y + 70 * s, x + 45 * s, y + 28 * s, x + 58 * s, y + 70 * s, RED);
  rect(x + 10 * s, y + 70 * s, 70 * s, 6 * s, INK);
}

function drawOilDrop(x: number, y: number, s: number): void {
  triangle(x + 45 * s, y, x + 15 * s, y + 44 * s, x + 75 * s, y + 44 * s, INK);
  circle(x + 45 * s, y + 48 * s, 28 * s, INK, true);
  line(x + 18 * s, y + 16 * s, x + 72 * s, y + 70 * s, RED);
  line(x + 72 * s, y + 16 * s, x + 18 * s, y + 70 * s, RED);
}

function drawBall(x: number, y: number, s: number): void {
  circle(x + 40 * s, y + 40 * s, 36 * s, INK, false);
  circle(x + 40 * s, y + 40 * s, 10 * s, INK, true);
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    line(x + 40 * s, y + 40 * s, x + 40 * s + Math.round(Math.cos(a) * 34 * s), y + 40 * s + Math.round(Math.sin(a) * 34 * s), INK);
  }
}

function drawAidBox(x: number, y: number, s: number): void {
  rect(x, y + 18 * s, 80 * s, 52 * s, LIGHT);
  rect(x, y + 18 * s, 80 * s, 52 * s, INK);
  // redraw as outline only: fill light then draw border lines
  rect(x + 2 * s, y + 20 * s, 76 * s, 48 * s, LIGHT);
  drawText(x + 28 * s, y + 36 * s, '+', 3, RED);
  line(x, y + 18 * s, x + 80 * s, y + 18 * s, INK);
  line(x, y + 70 * s, x + 80 * s, y + 70 * s, INK);
  line(x, y + 18 * s, x, y + 70 * s, INK);
  line(x + 80 * s, y + 18 * s, x + 80 * s, y + 70 * s, INK);
}

// ---------------------------------------------------------------- layout
const M = 30; // margin
const CW = W - 2 * M; // 964

function rule(y: number): void {
  hline(M, y, CW, INK);
  hline(M, y + 3, CW, INK);
}

function kicker(x: number, y: number, s: string): void {
  drawText(x, y, s, 1, RED);
}

// ---- masthead ----
drawTextCentred(W / 2, 24, 'THE WORLD TODAY', 5, INK);
drawTextCentred(W / 2, 68, 'TUESDAY, 24 NOVEMBER 2026', 2, INK);
drawTextCentred(W / 2, 100, 'THE DAY IN FULL - SIX STORIES FROM FIVE CONTINENTS', 1, GREY);
rule(116);

// ---- lead story: Nvidia / Huang ----
let y = 132;
kicker(M, y, 'TECHNOLOGY - BUSINESS - MARKETS');
drawText(M, 150, 'NVIDIA BRINGS BACK', 4, INK);
drawText(M, 184, 'HUANG AS CHIEF', 4, INK);
// art box, right of the lead
const artX = 640;
const artY = 132;
rect(artX, artY, 354, 222, INK);
rect(artX + 2, artY + 2, 350, 218, PAPER);
drawChip(artX + 102, artY + 22, 1);
drawTextCentred(artX + 177, artY + 168, 'SHARES SOAR ON THE NEWS', 2, GREEN);
drawTextCentred(artX + 177, artY + 196, 'SK hynix ADRs jumped 20%.', 1, GREY);
// subhead + body, left column
y = drawPara(M, 232, 'The board unanimously reinstates Jensen Huang as chief executive days after his shock departure. Trump claims credit for the return.', 2, 590, INK);
y = drawPara(M, y + 12, "Nvidia said the vote was unanimous. Short sellers faced about $12.2bn in paper losses on Monday as the shares soared. Trump said: 'I made the deal.'", 2, 590, INK);
drawText(M, 388, 'Short sellers: -$12.2bn in a day. Nvidia: up. SK hynix ADRs: +20%.', 1, GREY);
rule(408);

// ---- row 1: Ukraine + COP31 ----
const colW = 467;
const col2X = M + colW + 30;
y = 424;
kicker(M, y, 'WAR IN UKRAINE');
kicker(col2X, y, 'CLIMATE - COP31');
drawText(M, 442, 'RUSSIAN WAR DEAD', 3, INK);
drawText(M, 470, 'PUT NEAR 700,000', 3, INK);
drawText(col2X, 442, 'CLIMATE TALKS END', 3, INK);
drawText(col2X, 470, 'WITH NO DEAL', 3, INK);
// art strips
drawShip(M + 8, 504, 1);
drawText(M + 236, 520, 'NEAR', 3, RED);
drawText(M + 236, 548, '700,000', 3, RED);
drawText(M, 588, 'Also: a refinery at Novoshakhtinsk burned after a drone attack.', 1, GREY);
drawGlobe(col2X + 8, 500, 1);
drawText(col2X + 150, 520, "UN chief: 'no ambiguity", 2, INK);
drawText(col2X + 150, 544, "in the science.'", 2, INK);
// bodies
let yL = drawPara(M, 606, 'A media study of leaked Russian government data puts the war toll near 700,000. Ukraine said its drones sank a Russian warship in a Libyan port.', 2, colW, INK);
let yR = drawPara(col2X, 606, 'The COP31 talks in Antalya, Turkiye, ended on Sunday without a pact. Pacific island leaders said they got no relief.', 2, colW, INK);
const row1End = Math.max(yL, yR);
rule(row1End + 8);

// ---- row 2: Gulf + Congress ----
y = row1End + 22;
kicker(M, y, 'MIDDLE EAST - GULF');
kicker(col2X, y, 'UNITED STATES - CONGRESS');
drawText(M, y + 18, 'US SANCTIONS IRAN', 3, INK);
drawText(M, y + 46, 'AS GULF TENSIONS RISE', 3, INK);
drawText(col2X, y + 18, 'FIRST GEN Z WOMAN', 3, INK);
drawText(col2X, y + 46, 'WINS HOUSE SEAT', 3, INK);
yL = drawPara(M, y + 84, 'The US Treasury sanctioned more than two dozen Iranian exchange houses. Iran said it shot down a US drone over the Gulf.', 2, colW, INK);
yR = drawPara(col2X, y + 84, 'Melat Kiros, 29, a Democrat and socialist, is the first Gen Z woman elected to the US Congress.', 2, colW, INK);
const row2End = Math.max(yL, yR);
drawText(M, row2End + 4, 'Its Guard said three tankers hit mines in the Strait of Hormuz.', 1, GREY);
drawText(col2X, row2End + 4, 'Le Monde: first Gen Z woman to enter Congress.', 1, GREY);
rule(row2End + 16);

// ---- briefs row ----
const briefY = row2End + 28;
const briefW = 226;
const briefGap = 20;
const briefs: Array<[string, string]> = [
  ['FACTORY FIRE IN INDONESIA', 'A fire at an Indonesian plant caused casualties and left workers missing.'],
  ['NORWAY VOIDS OIL LICENCES', 'The supreme court ruled climate-disputed oil licences invalid.'],
  ["WOMEN'S WORLD CUP 2031", 'FIFA confirms the 2031 Women\'s World Cup for the US, Mexico, Costa Rica and Jamaica.'],
  ['AID CALL FOR FLOODED GAZA', 'Australia, Canada, Italy and the UK urge Israel to let aid reach flooded Gaza.'],
];
let briefEnd = briefY;
for (let i = 0; i < briefs.length; i++) {
  const bx = M + i * (briefW + briefGap);
  const [head, body] = briefs[i];
  const lines = wrapText(head, 2, briefW);
  for (let j = 0; j < lines.length; j++) drawText(bx, briefY + j * 20, lines[j], 2, INK);
  const by = drawPara(bx, briefY + lines.length * 20 + 6, body, 1, briefW, INK);
  if (by > briefEnd) briefEnd = by;
}

// ---- footer ----
hline(M, briefEnd + 12, CW, RULE);
drawTextCentred(W / 2, briefEnd + 22, 'All stories reported on Tuesday 24 November 2026. Sources: AP, Reuters, BBC, Kyiv Independent, Al Jazeera, Le Monde.', 1, GREY);

// ---------------------------------------------------------------- main
function main(): void {
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'entry.png'), encodePng());
}

main();
