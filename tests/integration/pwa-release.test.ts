import fs from 'node:fs';
import path from 'node:path';
import { evaluateKeyboardShortcut } from '../../src/utils/keyboardShortcuts.ts';
import openingsDataset from '../../src/data/openings/openings.json' with { type: 'json' };

async function runPwaReleaseTests() {
  console.log('================================================================');
  console.log(' PROMPT 13: PWA OFFLINE INSTALLABILITY & v1.0 RELEASE TESTS    ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // -------------------------------------------------------------------------
  // 1. MANIFEST & PWA METADATA INTEGRITY
  // -------------------------------------------------------------------------
  console.log('1. MANIFEST & PWA METADATA INTEGRITY');

  const indexHtmlPath = path.resolve('index.html');
  assert(fs.existsSync(indexHtmlPath), 'index.html exists at project root');
  const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

  assert(indexHtml.includes('rel="manifest" href="/manifest.webmanifest"'), 'index.html links to /manifest.webmanifest');
  assert(indexHtml.includes('name="theme-color" content="#020617"'), 'index.html declares theme-color #020617');
  assert(indexHtml.includes('name="apple-mobile-web-app-capable" content="yes"'), 'index.html enables apple-mobile-web-app-capable');
  assert(indexHtml.includes('rel="apple-touch-icon"'), 'index.html specifies apple-touch-icon');
  assert(indexHtml.includes('name="description"'), 'index.html specifies meta description');

  // Verify Web App Manifest
  const manifestPath = path.resolve('public/manifest.webmanifest');
  assert(fs.existsSync(manifestPath), 'public/manifest.webmanifest exists');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert(manifest.name === 'Chess Opening Academy', 'Manifest name is "Chess Opening Academy"');
  assert(manifest.short_name === 'Chess Academy', 'Manifest short_name is "Chess Academy"');
  assert(manifest.display === 'standalone', 'Manifest display mode is standalone');
  assert(manifest.start_url === '/', 'Manifest start_url is "/"');
  assert(manifest.theme_color === '#020617', 'Manifest theme_color is #020617');
  assert(manifest.background_color === '#020617', 'Manifest background_color is #020617');
  assert(Array.isArray(manifest.icons) && manifest.icons.length >= 3, 'Manifest defines at least 3 icons');

  const icon192Entry = manifest.icons.find((i: any) => i.sizes === '192x192');
  const icon512Entry = manifest.icons.find((i: any) => i.sizes === '512x512' && i.purpose !== 'maskable');
  const maskableEntry = manifest.icons.find((i: any) => i.purpose === 'maskable');

  assert(icon192Entry !== undefined, 'Manifest defines 192x192 icon entry');
  assert(icon512Entry !== undefined, 'Manifest defines 512x512 icon entry');
  assert(maskableEntry !== undefined, 'Manifest defines maskable icon entry');

  // -------------------------------------------------------------------------
  // 2. APP ICONS VERIFICATION & PNG SIGNATURE CHECK
  // -------------------------------------------------------------------------
  console.log('\n2. APP ICONS VERIFICATION & PNG SIGNATURE CHECK');

  const iconsDir = path.resolve('public/icons');
  assert(fs.existsSync(iconsDir), 'public/icons directory exists');

  const icon192Path = path.join(iconsDir, 'icon-192.png');
  const icon512Path = path.join(iconsDir, 'icon-512.png');
  const maskablePath = path.join(iconsDir, 'maskable-512.png');
  const faviconSvgPath = path.join(iconsDir, 'favicon.svg');

  assert(fs.existsSync(icon192Path), 'icon-192.png exists in public/icons/');
  assert(fs.existsSync(icon512Path), 'icon-512.png exists in public/icons/');
  assert(fs.existsSync(maskablePath), 'maskable-512.png exists in public/icons/');
  assert(fs.existsSync(faviconSvgPath), 'favicon.svg exists in public/icons/');

  // Verify PNG header magic bytes (89 50 4E 47 0D 0A 1A 0A)
  const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const icon192Bytes = fs.readFileSync(icon192Path);
  assert(icon192Bytes.subarray(0, 8).equals(pngMagic), 'icon-192.png has valid binary PNG signature');
  assert(icon192Bytes.readUInt32BE(16) === 192 && icon192Bytes.readUInt32BE(20) === 192, 'icon-192.png IHDR dimensions are 192x192');

  const icon512Bytes = fs.readFileSync(icon512Path);
  assert(icon512Bytes.subarray(0, 8).equals(pngMagic), 'icon-512.png has valid binary PNG signature');
  assert(icon512Bytes.readUInt32BE(16) === 512 && icon512Bytes.readUInt32BE(20) === 512, 'icon-512.png IHDR dimensions are 512x512');

  const maskableBytes = fs.readFileSync(maskablePath);
  assert(maskableBytes.subarray(0, 8).equals(pngMagic), 'maskable-512.png has valid binary PNG signature');

  // -------------------------------------------------------------------------
  // 3. KEYBOARD SHORTCUTS & INPUT GUARD LOGIC
  // -------------------------------------------------------------------------
  console.log('\n3. KEYBOARD SHORTCUTS & INPUT GUARD LOGIC');

  // Free play / explorer mode shortcuts
  assert(evaluateKeyboardShortcut('ArrowLeft', false, false, false) === 'prev', 'ArrowLeft triggers "prev"');
  assert(evaluateKeyboardShortcut('ArrowRight', false, false, false) === 'next', 'ArrowRight triggers "next"');
  assert(evaluateKeyboardShortcut('Home', false, false, false) === 'first', 'Home triggers "first"');
  assert(evaluateKeyboardShortcut('End', false, false, false) === 'last', 'End triggers "last"');
  assert(evaluateKeyboardShortcut('f', false, false, false) === 'flip', 'f triggers "flip"');
  assert(evaluateKeyboardShortcut('F', false, false, false) === 'flip', 'F (uppercase) triggers "flip"');

  // Input guard: all shortcuts suppressed when typing in input
  assert(evaluateKeyboardShortcut('ArrowLeft', true, false, false) === null, 'ArrowLeft ignored when input focused');
  assert(evaluateKeyboardShortcut('ArrowRight', true, false, false) === null, 'ArrowRight ignored when input focused');
  assert(evaluateKeyboardShortcut('f', true, false, false) === null, 'f ignored when input focused');

  // Modal guard: all shortcuts suppressed when a modal is open
  assert(evaluateKeyboardShortcut('ArrowLeft', false, true, false) === null, 'ArrowLeft ignored when modal open');
  assert(evaluateKeyboardShortcut('f', false, true, false) === null, 'f ignored when modal open');

  // Drill Mode protection: Arrow navigation and Home/End strictly blocked during drills
  assert(evaluateKeyboardShortcut('ArrowLeft', false, false, true) === null, 'ArrowLeft blocked during active Drill Mode');
  assert(evaluateKeyboardShortcut('ArrowRight', false, false, true) === null, 'ArrowRight blocked during active Drill Mode');
  assert(evaluateKeyboardShortcut('Home', false, false, true) === null, 'Home blocked during active Drill Mode');
  assert(evaluateKeyboardShortcut('End', false, false, true) === null, 'End blocked during active Drill Mode');
  assert(evaluateKeyboardShortcut('f', false, false, true) === 'flip', 'f allowed to flip perspective during Drill Mode');

  // -------------------------------------------------------------------------
  // 4. OFFLINE ASSETS & PRECACHE COMPLETENESS
  // -------------------------------------------------------------------------
  console.log('\n4. OFFLINE ASSETS & PRECACHE COMPLETENESS');

  const stockfishWasm = path.resolve('public/engine/stockfish.wasm');
  const stockfishJs = path.resolve('public/engine/stockfish.js');
  const stockfishLoader = path.resolve('public/engine/stockfish.wasm.js');

  assert(fs.existsSync(stockfishWasm), 'public/engine/stockfish.wasm present');
  const wasmHeader = fs.readFileSync(stockfishWasm).subarray(0, 4);
  assert(wasmHeader.equals(Buffer.from([0x00, 0x61, 0x73, 0x6d])), 'stockfish.wasm contains valid \\0asm binary header');

  assert(fs.existsSync(stockfishJs), 'public/engine/stockfish.js present');
  const jsSize = fs.statSync(stockfishJs).size;
  assert(jsSize > 1_000_000, `stockfish.js is genuine standalone engine (${Math.round(jsSize / 1024)} kB)`);

  assert(fs.existsSync(stockfishLoader), 'public/engine/stockfish.wasm.js present');

  // Verify full openings dataset
  assert(Array.isArray(openingsDataset), 'openings.json is valid array');
  assert(openingsDataset.length === 3865, 'openings.json contains all 3,865 catalogued openings');

  // Verify Workbox 5MB cache ceiling in vite.config.ts
  const viteConfig = fs.readFileSync(path.resolve('vite.config.ts'), 'utf8');
  assert(viteConfig.includes('maximumFileSizeToCacheInBytes: 5 * 1024 * 1024'), 'vite.config.ts configures 5 MB maximumFileSizeToCacheInBytes');
  assert(viteConfig.includes("registerType: 'autoUpdate'"), 'vite.config.ts configures autoUpdate SW registerType');

  console.log('\n================================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(' PROMPT 13 PWA RELEASE & INTEGRITY SUITE: 100% VERIFIED         ');
  console.log('================================================================\n');
}

runPwaReleaseTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
