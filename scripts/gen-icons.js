'use strict';
/**
 * Genera icone PWA PNG statiche senza dipendenze esterne.
 * Usa SVG → canvas (se disponibile) oppure scrive PNG minimi validi via zlib.
 *
 * Colori MARIO: bg=#0f1117 accent=#3b82f6
 */

const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const PUBLIC = path.join(__dirname, '..', 'public');
if (!fs.existsSync(PUBLIC)) fs.mkdirSync(PUBLIC, { recursive: true });

// ── Genera PNG via raw bytes ──────────────────────────────────────────────────

function uint32BE(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n >>> 0, 0);
  return b;
}

function crc32(buf) {
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : (c >>> 1);
      t[i] = c;
    }
    return t;
  })());
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const crcBuf    = Buffer.concat([typeBytes, data]);
  return Buffer.concat([uint32BE(data.length), typeBytes, data, uint32BE(crc32(crcBuf))]);
}

/**
 * Genera un PNG RGBA di dimensione size×size.
 * bgColor: [R,G,B]   fgColor: [R,G,B]
 * Disegna una "M" stilizzata centrata (raster semplice).
 */
function generatePNG(size, bgColor, fgColor) {
  const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8]  = 8;  // bit depth
  ihdr[9]  = 2;  // color type: RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Pixel data: size rows, each row: filter-byte(0) + size*3 bytes RGB
  const rowBytes = 1 + size * 3;
  const raw = Buffer.alloc(rowBytes * size);

  const [br, bg, bb] = bgColor;
  const [fr, fg, fb] = fgColor;

  // Fill background
  for (let y = 0; y < size; y++) {
    const base = y * rowBytes;
    raw[base] = 0; // filter none
    for (let x = 0; x < size; x++) {
      raw[base + 1 + x * 3]     = br;
      raw[base + 1 + x * 3 + 1] = bg;
      raw[base + 1 + x * 3 + 2] = bb;
    }
  }

  // Draw "M" — simple pixel font scaled to size
  // M in a 5×7 grid, scaled to ~60% of icon size
  const letter = [
    [1,0,0,0,1],
    [1,1,0,1,1],
    [1,0,1,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
  ];
  const cols = 5, rows = 7;
  const scale = Math.floor(size * 0.58 / Math.max(cols, rows));
  const offX  = Math.floor((size - cols * scale) / 2);
  const offY  = Math.floor((size - rows * scale) / 2);

  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      if (!letter[gy][gx]) continue;
      for (let py = 0; py < scale; py++) {
        for (let px = 0; px < scale; px++) {
          const x = offX + gx * scale + px;
          const y = offY + gy * scale + py;
          if (x < 0 || x >= size || y < 0 || y >= size) continue;
          const base = y * rowBytes;
          raw[base + 1 + x * 3]     = fr;
          raw[base + 1 + x * 3 + 1] = fg;
          raw[base + 1 + x * 3 + 2] = fb;
        }
      }
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const BG = [0x0f, 0x11, 0x17];
const FG = [0x3b, 0x82, 0xf6];

const icons = [
  { name: 'icon-192.png',          size: 192 },
  { name: 'icon-512.png',          size: 512 },
  { name: 'apple-touch-icon.png',  size: 180 },
];

for (const { name, size } of icons) {
  const buf = generatePNG(size, BG, FG);
  fs.writeFileSync(path.join(PUBLIC, name), buf);
  console.log(`✓ ${name} (${size}×${size}) — ${buf.length} bytes`);
}
