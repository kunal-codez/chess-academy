import { Chess } from 'chess.js';
import type { Square, PieceSymbol } from 'chess.js';

export interface ParsedUciInfo {
  depth: number;
  seldepth?: number;
  multipv: number;
  scoreCp: number | null;
  scoreMate: number | null;
  nodes?: number;
  nps?: number;
  timeMs?: number;
  pvUci: string[];
}

export interface EnginePvLine {
  multipv: number;
  depth: number;
  scoreCp: number | null;
  scoreMate: number | null;
  normalizedCp: number | null;
  normalizedMate: number | null;
  formattedScore: string;
  winPercentage: number;
  pvUci: string[];
  pvSan: string[];
  formattedPgn: string;
  bestMoveUci: string | null;
  bestMoveSan: string | null;
  nodes?: number;
  nps?: number;
  timeMs?: number;
}

export class UciParser {
  /**
   * Parses a UCI 'info' line into structured fields.
   */
  public static parseUciInfo(line: string): ParsedUciInfo | null {
    if (!line.startsWith('info') || !line.includes('depth')) {
      return null;
    }

    const depthMatch = line.match(/\bdepth\s+(\d+)/);
    if (!depthMatch) return null;
    const depth = parseInt(depthMatch[1], 10);

    const seldepthMatch = line.match(/\bseldepth\s+(\d+)/);
    const seldepth = seldepthMatch ? parseInt(seldepthMatch[1], 10) : undefined;

    const multipvMatch = line.match(/\bmultipv\s+(\d+)/);
    const multipv = multipvMatch ? parseInt(multipvMatch[1], 10) : 1;

    const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
    const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);

    const scoreCp = cpMatch ? parseInt(cpMatch[1], 10) : null;
    const scoreMate = mateMatch ? parseInt(mateMatch[1], 10) : null;

    const nodesMatch = line.match(/\bnodes\s+(\d+)/);
    const nodes = nodesMatch ? parseInt(nodesMatch[1], 10) : undefined;

    const npsMatch = line.match(/\bnps\s+(\d+)/);
    const nps = npsMatch ? parseInt(npsMatch[1], 10) : undefined;

    const timeMatch = line.match(/\btime\s+(\d+)/);
    const timeMs = timeMatch ? parseInt(timeMatch[1], 10) : undefined;

    let pvUci: string[] = [];
    const pvIndex = line.indexOf(' pv ');
    if (pvIndex !== -1) {
      pvUci = line.substring(pvIndex + 4).trim().split(/\s+/).filter(Boolean);
    }

    return {
      depth,
      seldepth,
      multipv,
      scoreCp,
      scoreMate,
      nodes,
      nps,
      timeMs,
      pvUci
    };
  }

  /**
   * Parses a UCI 'bestmove' line.
   */
  public static parseBestMove(line: string): { bestMove: string; ponder?: string } | null {
    if (!line.startsWith('bestmove')) return null;
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) return null;

    const bestMove = parts[1];
    let ponder: string | undefined = undefined;
    if (parts[2] === 'ponder' && parts[3]) {
      ponder = parts[3];
    }

    return { bestMove, ponder };
  }

  /**
   * Normalizes evaluation scores from side-to-move perspective into White perspective.
   * Positive = White advantage, Negative = Black advantage.
   */
  public static normalizeScoreForWhite(
    scoreCp: number | null,
    scoreMate: number | null,
    turn: 'w' | 'b'
  ): { normalizedCp: number | null; normalizedMate: number | null } {
    const multiplier = turn === 'b' ? -1 : 1;
    return {
      normalizedCp: scoreCp !== null ? scoreCp * multiplier : null,
      normalizedMate: scoreMate !== null ? scoreMate * multiplier : null
    };
  }

  /**
   * Formats normalized score for display (e.g. "+0.4", "-1.8", "0.0", "M3", "-M2").
   */
  public static formatScore(
    normalizedCp: number | null,
    normalizedMate: number | null
  ): string {
    if (normalizedMate !== null) {
      if (normalizedMate === 0) return '0.0';
      return normalizedMate > 0 ? `M${normalizedMate}` : `-M${Math.abs(normalizedMate)}`;
    }

    if (normalizedCp !== null) {
      const pawns = normalizedCp / 100;
      if (pawns === 0) return '0.0';
      return pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
    }

    return '0.0';
  }

  /**
   * Calculates evaluation bar fill percentage (0% to 100% White advantage).
   * Uses standard sigmoid curve with clamping to keep extremes readable.
   */
  public static computeWinPercentage(
    normalizedCp: number | null,
    normalizedMate: number | null
  ): number {
    if (normalizedMate !== null) {
      if (normalizedMate > 0) return 100;
      if (normalizedMate < 0) return 0;
      return 50;
    }

    if (normalizedCp === null) return 50;

    // Standard Lichess winning model logistic curve:
    // P = 50 + 50 * (2 / (1 + exp(-0.00368208 * cp)) - 1)
    const win = 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * normalizedCp)) - 1);
    // Clamp between 3% and 97% so a sliver of bar is visible unless forced mate
    return Math.max(3, Math.min(97, Math.round(win * 10) / 10));
  }

  /**
   * Converts a sequence of UCI moves (e.g. ['e2e4', 'e7e5', 'g1f3']) into SAN notation
   * and formatted PGN string using chess.js against the provided position FEN.
   */
  public static convertUciPvToSan(
    fen: string,
    uciMoves: string[]
  ): { sanMoves: string[]; formattedPgn: string } {
    const sanMoves: string[] = [];
    let formattedPgn = '';

    try {
      const game = new Chess(fen);
      const parts = fen.trim().split(/\s+/);
      const isWhite = (parts[1] || 'w') === 'w';
      let moveNumber = parseInt(parts[5] || '1', 10);

      const pgnTokens: string[] = [];
      let isFirstMove = true;

      for (const uci of uciMoves) {
        if (!uci || uci.length < 4) break;

        const from = uci.slice(0, 2) as Square;
        const to = uci.slice(2, 4) as Square;
        const promotion = (uci[4] || undefined) as PieceSymbol | undefined;

        const move = game.move({ from, to, promotion });
        if (!move) break;

        sanMoves.push(move.san);

        const currentTurn = game.turn() === 'b' ? 'w' : 'b'; // turn that made this move
        if (currentTurn === 'w') {
          pgnTokens.push(`${moveNumber}. ${move.san}`);
        } else {
          if (isFirstMove && !isWhite) {
            pgnTokens.push(`${moveNumber}... ${move.san}`);
          } else {
            pgnTokens.push(move.san);
          }
          moveNumber++;
        }

        isFirstMove = false;
      }

      formattedPgn = pgnTokens.join(' ');
    } catch {
      // Fallback on error: return raw UCI
      return { sanMoves: uciMoves, formattedPgn: uciMoves.join(' ') };
    }

    return { sanMoves, formattedPgn };
  }

  /**
   * Fully parses an 'info' line and computes normalized score, win percentage,
   * SAN notation, and PGN formatting for a given FEN.
   */
  public static processInfoLine(line: string, fen: string): EnginePvLine | null {
    const parsed = UciParser.parseUciInfo(line);
    if (!parsed) return null;

    const fenTurn = (fen.trim().split(/\s+/)[1] || 'w') as 'w' | 'b';
    const { normalizedCp, normalizedMate } = UciParser.normalizeScoreForWhite(
      parsed.scoreCp,
      parsed.scoreMate,
      fenTurn
    );

    const formattedScore = UciParser.formatScore(normalizedCp, normalizedMate);
    const winPercentage = UciParser.computeWinPercentage(normalizedCp, normalizedMate);

    const { sanMoves, formattedPgn } = UciParser.convertUciPvToSan(fen, parsed.pvUci);

    return {
      multipv: parsed.multipv,
      depth: parsed.depth,
      scoreCp: parsed.scoreCp,
      scoreMate: parsed.scoreMate,
      normalizedCp,
      normalizedMate,
      formattedScore,
      winPercentage,
      pvUci: parsed.pvUci,
      pvSan: sanMoves,
      formattedPgn,
      bestMoveUci: parsed.pvUci[0] || null,
      bestMoveSan: sanMoves[0] || null,
      nodes: parsed.nodes,
      nps: parsed.nps,
      timeMs: parsed.timeMs
    };
  }
}
