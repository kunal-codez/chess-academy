import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

// Ensure public/icons directory exists
const iconsDir = path.resolve('public/icons');
fs.mkdirSync(iconsDir, { recursive: true });

// CRC32 table calculation
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(toCrc), 0);

  return Buffer.concat([lenBuf, toCrc, crcBuf]);
}

function generatePng(size, isMaskable = false) {
  // RGBA buffer: (1 + size * 4) bytes per scanline
  const scanlineLength = 1 + size * 4;
  const rawData = Buffer.alloc(scanlineLength * size);

  const center = size / 2;
  const radius = isMaskable ? size * 0.4 : size * 0.46;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < size; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const dx = x - center;
      const dy = y - center;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background: Slate-950 (#020617) to Slate-900 (#0f172a)
      let r = 15;
      let g = 23;
      let b = 42;
      let a = 255;

      if (!isMaskable && dist > radius) {
        // Transparent outside circle for standard icons
        a = 0;
        r = 0;
        g = 0;
        b = 0;
      } else {
        // Inner Emblem: Emerald gradient and stylized Chess Knight shape
        const nx = dx / radius;
        const ny = dy / radius;

        // Inner shield/circle: Emerald-600 (#059669)
        if (dist < radius * 0.88) {
          r = 5;
          g = 150;
          b = 105;
        }

        // Inner disc: Slate-900 (#0f172a)
        if (dist < radius * 0.78) {
          r = 15;
          g = 23;
          b = 42;
        }

        // Stylized Knight Silhouette
        // Body base:
        const isBase = (ny > 0.3 && ny < 0.6 && Math.abs(nx) < 0.45);
        // Neck/Head:
        const isHead = (ny >= -0.55 && ny <= 0.35 && nx > -0.35 && nx < 0.38 - (ny * 0.2));
        // Snout:
        const isSnout = (ny >= -0.35 && ny <= -0.05 && nx < -0.15 && nx > -0.5);
        // Mane/Ears:
        const isEar = (ny >= -0.65 && ny <= -0.45 && nx > -0.15 && nx < 0.15);

        if (isBase || isHead || isSnout || isEar) {
          // Emerald-400 (#34d399) / White (#f8fafc)
          r = 52;
          g = 211;
          b = 153;
        }

        // Knight eye
        const isEye = (Math.abs(nx - (-0.18)) < 0.04 && Math.abs(ny - (-0.3)) < 0.04);
        if (isEye) {
          r = 15;
          g = 23;
          b = 42;
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR: width, height, 8 bit, RGBA (6), deflated (0), filter (0), no interlace (0)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);
  ihdrData.writeUInt32BE(size, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const ihdrChunk = makePngChunk('IHDR', ihdrData);
  const idatChunk = makePngChunk('IDAT', deflated);
  const iendChunk = makePngChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Write PNG files
fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), generatePng(192, false));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), generatePng(512, false));
fs.writeFileSync(path.join(iconsDir, 'maskable-512.png'), generatePng(512, true));

// Write SVG favicon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="100%" stop-color="#020617" />
    </radialGradient>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="url(#bg)" />
  <circle cx="256" cy="256" r="210" fill="none" stroke="url(#emeraldGrad)" stroke-width="16" stroke-dasharray="16 12" />
  <g fill="url(#emeraldGrad)">
    <!-- Base -->
    <path d="M 160 410 L 352 410 C 352 385 330 370 300 370 L 212 370 C 182 370 160 385 160 410 Z" />
    <!-- Pedestal -->
    <rect x="180" y="345" width="152" height="20" rx="8" />
    <!-- Knight Body & Head -->
    <path d="M 185 340 C 180 280 140 230 190 145 C 210 110 240 100 255 125 C 265 140 275 140 290 135 C 310 130 330 150 325 185 C 320 220 330 250 335 285 C 340 315 315 340 295 340 Z" />
    <!-- Muzzle / Nose -->
    <path d="M 190 165 C 150 185 140 220 180 240 C 210 255 220 220 220 195 Z" />
    <!-- Mane details -->
    <path d="M 280 150 C 300 170 305 200 295 220 C 310 230 320 250 315 280" fill="none" stroke="#020617" stroke-width="8" stroke-linecap="round" />
  </g>
  <!-- Eye -->
  <circle cx="210" cy="180" r="10" fill="#020617" />
</svg>`;

fs.writeFileSync(path.join(iconsDir, 'favicon.svg'), svgContent);
fs.writeFileSync(path.resolve('public/favicon.svg'), svgContent);

console.log('Successfully generated public/icons/ assets:');
console.log(' - icon-192.png');
console.log(' - icon-512.png');
console.log(' - maskable-512.png');
console.log(' - favicon.svg');
