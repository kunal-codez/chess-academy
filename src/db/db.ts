import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { OpeningRecord } from '../types/opening.types.ts';
import type { Repertoire, RepertoireLine } from '../types/repertoire.types.ts';

export interface SavedPosition {
  id?: number;
  fen: string;
  normalizedFen: string;
  title: string;
  notes?: string;
  createdAt: number;
}

export interface RepertoireItem {
  id?: number;
  side: 'white' | 'black';
  name: string;
  fen: string;
  san: string;
  comment?: string;
  createdAt: number;
}

export interface LichessCacheEntry {
  fenKey: string;
  whiteWins: number;
  blackWins: number;
  draws: number;
  totalGames: number;
  cachedAt: number;
  topMoves: {
    san: string;
    uci: string;
    white: number;
    black: number;
    draws: number;
  }[];
}

export interface DatasetMetadata {
  key: string;
  version: string;
  source: string;
  recordCount: number;
  importedAt: number;
}

export class ChessAcademyDatabase extends Dexie {
  savedPositions!: Table<SavedPosition, number>;
  repertoires!: Table<RepertoireItem, number>;
  lichessCache!: Table<LichessCacheEntry, string>;
  openings!: Table<OpeningRecord, string>;
  metadata!: Table<DatasetMetadata, string>;
  personalRepertoires!: Table<Repertoire, string>;
  repertoireLines!: Table<RepertoireLine, string>;

  constructor() {
    super('ChessAcademyDB');
    this.version(2).stores({
      savedPositions: '++id, fen, normalizedFen, createdAt',
      repertoires: '++id, side, fen, name, createdAt',
      lichessCache: 'fenKey, cachedAt',
      openings: 'id, eco, family, name, epd, plyCount',
      metadata: 'key, version'
    });

    this.version(3).stores({
      savedPositions: '++id, fen, normalizedFen, createdAt',
      repertoires: '++id, side, fen, name, createdAt',
      lichessCache: 'fenKey, cachedAt',
      openings: 'id, eco, family, name, epd, plyCount',
      metadata: 'key, version',
      personalRepertoires: 'id, color, name, createdAt, updatedAt',
      repertoireLines: 'id, repertoireId, eco, finalEpd, finalFen, createdAt, updatedAt'
    });
  }
}

export const db = new ChessAcademyDatabase();

/**
 * Seeds the Dexie database with opening records if not already populated.
 * Prevents duplicate insertions by checking count and using bulkPut with unique IDs.
 */
export async function seedOpenings(openingsData: OpeningRecord[]): Promise<{ count: number; newlyInserted: boolean }> {
  const currentCount = await db.openings.count();
  if (currentCount > 0) {
    return { count: currentCount, newlyInserted: false };
  }

  // Bulk put ensures atomic insertion without duplicates
  await db.openings.bulkPut(openingsData);
  await db.metadata.put({
    key: 'openings_dataset',
    version: '1.0.0',
    source: 'https://github.com/lichess-org/chess-openings',
    recordCount: openingsData.length,
    importedAt: Date.now()
  });

  const finalCount = await db.openings.count();
  return { count: finalCount, newlyInserted: true };
}
