'use strict';
/**
 * Converte mario-logo-universal.svg in icone PNG per PWA.
 * Source: Desktop/mario-logo-universal.svg
 */

const sharp = require('sharp');
const fs    = require('fs');
const path  = require('path');

const SVG_SRC = path.join(
  'C:\\Users\\Utente\\Desktop',
  'mario-logo-universal.svg'
);

const PUBLIC = path.join(__dirname, '..', 'public');

const icons = [
  { name: 'icon-512.png',         size: 512 },
  { name: 'icon-192.png',         size: 192 },
  { name: 'apple-touch-icon.png', size: 180 },
];

async function main() {
  const svg = fs.readFileSync(SVG_SRC);

  for (const { name, size } of icons) {
    const out = path.join(PUBLIC, name);
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(out);
    console.log(`✓ ${name} (${size}×${size})`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
