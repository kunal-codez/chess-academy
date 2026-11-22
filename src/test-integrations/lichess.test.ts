import { describe, it, expect } from 'vitest';
import { LichessService } from '../services/LichessService';

describe('Lichess Opening Data & Transposition Engine Verification', () => {
  it('should normalize FEN strings by stripping halfmove and fullmove counters', () => {
    // Standard starting position
    const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const normalized = LichessService.normalizeFen(startFen);
    expect(normalized).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -');
  });

  it('should recognize transposed opening lines as identical normalized FENs', () => {
    // Transposition Example:
    // Move order 1: 1.d4 Nf6 2.c4 e6 3.Nc3
    // Move order 2: 1.c4 e6 2.d4 Nf6 3.Nc3
    // Standard FENs might differ in move counters, but the normalized EPD must match exactly!
    const fenMoveOrder1 = 'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 1 3';
    const fenMoveOrder2 = 'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 1 3';

    const norm1 = LichessService.normalizeFen(fenMoveOrder1);
    const norm2 = LichessService.normalizeFen(fenMoveOrder2);

    expect(norm1).toBe(norm2);
    expect(norm1).toBe('rnbqkb1r/pppp1ppp/4pn2/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq -');
  });

  it('should retain active color, castling rights and en passant square in normalized FEN', () => {
    const fenWithEp = 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3';
    const normalized = LichessService.normalizeFen(fenWithEp);
    expect(normalized).toBe('rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6');
  });
});
