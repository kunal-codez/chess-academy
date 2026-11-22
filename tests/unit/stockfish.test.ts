import { describe, it, expect } from 'vitest';
import { StockfishService } from '../../src/services/StockfishService.ts';

describe('Stockfish UCI Protocol & Output Parsing Verification', () => {
  it('should accurately parse UCI centipawn score and PV line', () => {
    const uciLine = 'info depth 18 seldepth 24 multipv 1 score cp 45 nodes 451200 nps 1200000 tbhits 0 time 376 pv e2e4 e7e5 g1f3 b8c6 f1b5 a7a6';
    const parsed = StockfishService.parseUciInfo(uciLine);

    expect(parsed).not.toBeNull();
    expect(parsed?.depth).toBe(18);
    expect(parsed?.scoreCentipawns).toBe(45);
    expect(parsed?.scoreMate).toBeNull();
    expect(parsed?.bestMove).toBe('e2e4');
    expect(parsed?.pv).toEqual(['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1b5', 'a7a6']);
  });

  it('should accurately parse forced checkmate scores', () => {
    const mateIn3Line = 'info depth 20 multipv 1 score mate 3 pv h5f7 e8d8 f7f8';
    const parsed = StockfishService.parseUciInfo(mateIn3Line);

    expect(parsed).not.toBeNull();
    expect(parsed?.depth).toBe(20);
    expect(parsed?.scoreCentipawns).toBeNull();
    expect(parsed?.scoreMate).toBe(3);
    expect(parsed?.bestMove).toBe('h5f7');
  });

  it('should accurately parse negative scores for Black advantages', () => {
    const blackAdvantageLine = 'info depth 15 multipv 1 score cp -120 pv d7d5 e4d5 d8d5';
    const parsed = StockfishService.parseUciInfo(blackAdvantageLine);

    expect(parsed).not.toBeNull();
    expect(parsed?.depth).toBe(15);
    expect(parsed?.scoreCentipawns).toBe(-120);
    expect(parsed?.scoreMate).toBeNull();
  });

  it('should ignore non-evaluation info lines cleanly', () => {
    const nonEvalLine = 'info string NNUE evaluation using nn-0000000000a0.nnue';
    const parsed = StockfishService.parseUciInfo(nonEvalLine);
    expect(parsed).toBeNull();
  });
});
