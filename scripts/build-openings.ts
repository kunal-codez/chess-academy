import fs from 'fs';
import path from 'path';
import { Chess } from 'chess.js';

interface RawOpeningRecord {
  id: string;
  eco: string;
  name: string;
  family: string;
  variation?: string;
  subvariation?: string;
  pgn: string;
  movesSan: string[];
  movesUci: string[];
  epd: string;
  fen: string;
  plyCount: number;
  source: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function getEpd(fen: string): string {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) return fen;
  return `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;
}

async function buildOpeningData() {
  console.log('--- FETCHING & BUILDING LICHESS OPENINGS DATASET ---');
  const letters = ['a', 'b', 'c', 'd', 'e'];
  const allRecords: RawOpeningRecord[] = [];
  const idSet = new Set<string>();
  const ecoMap = new Map<string, number>();

  const outputDir = path.resolve('src/data/openings');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const letter of letters) {
    const url = `https://raw.githubusercontent.com/lichess-org/chess-openings/master/${letter}.tsv`;
    console.log(`Fetching ${url}...`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: status ${res.status}`);
    }

    const text = await res.text();
    const lines = text.trim().split('\n');
    console.log(`Processing ${letter}.tsv (${lines.length - 1} entries)...`);

    const letterRecords: RawOpeningRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split('\t');
      if (parts.length < 3) continue;

      const eco = parts[0].trim();
      const name = parts[1].trim();
      const pgn = parts[2].trim();

      // Split family, variation, subvariation
      let family = name;
      let variation: string | undefined;
      let subvariation: string | undefined;

      const colonIdx = name.indexOf(':');
      if (colonIdx !== -1) {
        family = name.substring(0, colonIdx).trim();
        const rest = name.substring(colonIdx + 1).trim();
        const commaIdx = rest.indexOf(',');
        if (commaIdx !== -1) {
          variation = rest.substring(0, commaIdx).trim();
          subvariation = rest.substring(commaIdx + 1).trim();
        } else {
          variation = rest;
        }
      }

      // Simulate moves in chess.js
      const game = new Chess();
      game.loadPgn(pgn);
      const history = game.history({ verbose: true });
      const movesSan = history.map((m) => m.san);
      const movesUci = history.map((m) => `${m.from}${m.to}${m.promotion || ''}`);
      const fen = game.fen();
      const epd = getEpd(fen);

      // Generate unique ID
      let baseId = `${eco.toLowerCase()}-${slugify(name)}`;
      let finalId = baseId;
      let counter = 2;
      while (idSet.has(finalId)) {
        finalId = `${baseId}-${counter}`;
        counter++;
      }
      idSet.add(finalId);

      const record: RawOpeningRecord = {
        id: finalId,
        eco,
        name,
        family,
        variation,
        subvariation,
        pgn,
        movesSan,
        movesUci,
        epd,
        fen,
        plyCount: movesSan.length,
        source: 'lichess-org/chess-openings'
      };

      letterRecords.push(record);
      allRecords.push(record);

      ecoMap.set(eco, (ecoMap.get(eco) || 0) + 1);
    }

    // Save eco-${letter}.json
    const filePath = path.join(outputDir, `eco-${letter}.json`);
    fs.writeFileSync(filePath, JSON.stringify(letterRecords, null, 2), 'utf-8');
    console.log(`Saved ${letterRecords.length} records to ${filePath}`);
  }

  // Also write all-openings.json for direct full search
  const allFilePath = path.join(outputDir, 'openings.json');
  fs.writeFileSync(allFilePath, JSON.stringify(allRecords), 'utf-8');
  console.log(`Saved complete dataset (${allRecords.length} records) to ${allFilePath}`);

  console.log('\n--- DATASET STATS & ECO VERIFICATION ---');
  console.log(`Total opening records: ${allRecords.length}`);
  console.log(`Distinct ECO codes: ${ecoMap.size} (Expected: 500)`);

  const missingEcos: string[] = [];
  for (const vol of ['A', 'B', 'C', 'D', 'E']) {
    for (let i = 0; i < 100; i++) {
      const code = `${vol}${i.toString().padStart(2, '0')}`;
      if (!ecoMap.has(code)) {
        missingEcos.push(code);
      }
    }
  }

  if (missingEcos.length === 0) {
    console.log('✓ PERFECT 100% COVERAGE: All 500 ECO codes from A00 to E99 are present!');
  } else {
    console.log(`Missing ECO codes (${missingEcos.length}):`, missingEcos.join(', '));
  }
}

buildOpeningData().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});
