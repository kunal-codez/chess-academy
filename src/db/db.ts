import Dexie from 'dexie';
import type { Table } from 'dexie';

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

export class ChessAcademyDatabase extends Dexie {
  savedPositions!: Table<SavedPosition, number>;
  repertoires!: Table<RepertoireItem, number>;
  lichessCache!: Table<LichessCacheEntry, string>;

  constructor() {
    super('ChessAcademyDB');
    this.version(1).stores({
      savedPositions: '++id, fen, normalizedFen, createdAt',
      repertoires: '++id, side, fen, name, createdAt',
      lichessCache: 'fenKey, cachedAt'
    });
  }
}

export const db = new ChessAcademyDatabase();
