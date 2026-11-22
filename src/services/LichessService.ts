import { db } from '../db/db';
import type { LichessCacheEntry } from '../db/db';

export interface LichessMoveStats {
  san: string;
  uci: string;
  white: number;
  black: number;
  draws: number;
  total: number;
}

export interface LichessExplorerResult {
  source: 'cache' | 'network' | 'offline';
  white: number;
  black: number;
  draws: number;
  total: number;
  moves: LichessMoveStats[];
  opening?: {
    eco: string;
    name: string;
  };
}

export class LichessService {
  private static lastRequestTimestamp = 0;
  private static readonly MIN_INTERVAL_MS = 1100; // 1.1s safety margin for free tier rate limits

  public static normalizeFen(fen: string): string {
    const parts = fen.trim().split(/\s+/);
    if (parts.length < 4) return fen;
    return `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;
  }

  public static async getOpeningStats(fen: string, playMoves?: string): Promise<LichessExplorerResult> {
    const fenKey = this.normalizeFen(fen);

    // 1. Check Dexie local cache first
    try {
      const cached = await db.lichessCache.get(fenKey);
      if (cached) {
        return {
          source: 'cache',
          white: cached.whiteWins,
          black: cached.blackWins,
          draws: cached.draws,
          total: cached.totalGames,
          moves: cached.topMoves.map(m => ({
            ...m,
            total: m.white + m.black + m.draws
          }))
        };
      }
    } catch (e) {
      console.warn('IndexedDB cache read error, continuing to network:', e);
    }

    // 2. Check offline status
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      return {
        source: 'offline',
        white: 0,
        black: 0,
        draws: 0,
        total: 0,
        moves: []
      };
    }

    // 3. Rate limiter delay
    const now = Date.now();
    const elapsed = now - this.lastRequestTimestamp;
    if (elapsed < this.MIN_INTERVAL_MS) {
      await new Promise(resolve => setTimeout(resolve, this.MIN_INTERVAL_MS - elapsed));
    }
    this.lastRequestTimestamp = Date.now();

    // 4. Fetch from Lichess Masters Explorer API
    const url = new URL('https://explorer.lichess.ovh/masters');
    url.searchParams.set('fen', fen);
    if (playMoves) {
      url.searchParams.set('play', playMoves);
    }

    try {
      const response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Lichess API returned status ${response.status}`);
      }

      const data = await response.json();

      const moves: LichessMoveStats[] = (data.moves || []).map((m: any) => ({
        san: m.san,
        uci: m.uci,
        white: m.white,
        black: m.black,
        draws: m.draws,
        total: m.white + m.black + m.draws
      }));

      const result: LichessExplorerResult = {
        source: 'network',
        white: data.white || 0,
        black: data.black || 0,
        draws: data.draws || 0,
        total: (data.white || 0) + (data.black || 0) + (data.draws || 0),
        moves,
        opening: data.opening ? { eco: data.opening.eco, name: data.opening.name } : undefined
      };

      // 5. Persist to Dexie Cache for ₹0 cost repeat queries
      try {
        const cacheEntry: LichessCacheEntry = {
          fenKey,
          whiteWins: result.white,
          blackWins: result.black,
          draws: result.draws,
          totalGames: result.total,
          cachedAt: Date.now(),
          topMoves: moves.map(m => ({
            san: m.san,
            uci: m.uci,
            white: m.white,
            black: m.black,
            draws: m.draws
          }))
        };
        await db.lichessCache.put(cacheEntry);
      } catch (cacheErr) {
        console.warn('Failed to write to Dexie cache:', cacheErr);
      }

      return result;
    } catch (err) {
      console.error('Lichess fetch failed:', err);
      return {
        source: 'offline',
        white: 0,
        black: 0,
        draws: 0,
        total: 0,
        moves: []
      };
    }
  }
}
