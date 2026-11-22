import { describe, it, expect } from 'vitest';
import { ChessService } from '../services/ChessService';

describe('Chess.js Rules & Legal Move Engine Verification', () => {
  it('should validate opening legal moves from standard initial position', () => {
    const chess = new ChessService();
    expect(chess.getFen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

    // 1.e4 is legal
    const res1 = chess.makeMove('e2', 'e4');
    expect(res1.success).toBe(true);
    expect(res1.san).toBe('e4');
    expect(chess.getTurn()).toBe('b');

    // Illegal move for Black: e7 to e4 (occupied)
    const resIllegal = chess.makeMove('e7', 'e4');
    expect(resIllegal.success).toBe(false);

    // 1...e5 is legal
    const res2 = chess.makeMove('e7', 'e5');
    expect(res2.success).toBe(true);
    expect(res2.san).toBe('e5');
  });

  it('should correctly execute and validate En Passant', () => {
    const chess = new ChessService();
    // 1.e4 Nf6 2.e5 d5 3.exd6 (en passant)
    chess.makeMove('e2', 'e4');
    chess.makeMove('g8', 'f6');
    chess.makeMove('e4', 'e5');
    chess.makeMove('d7', 'd5');

    // White captures en passant on d6
    const epMove = chess.makeMove('e5', 'd6');
    expect(epMove.success).toBe(true);
    expect(epMove.san).toBe('exd6');
    expect(epMove.captured).toBe('p');
  });

  it('should validate Kingside and Queenside Castling rights and execution', () => {
    // Position with clear paths for White to castle kingside and Black to castle queenside
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    const chess = new ChessService(fen);

    // White castles Kingside (e1 -> g1)
    const whiteCastle = chess.makeMove('e1', 'g1');
    expect(whiteCastle.success).toBe(true);
    expect(whiteCastle.san).toBe('O-O');

    // Black castles Queenside (e8 -> c8)
    const blackCastle = chess.makeMove('e8', 'c8');
    expect(blackCastle.success).toBe(true);
    expect(blackCastle.san).toBe('O-O-O');
  });

  it('should disallow Castling through or out of check', () => {
    // White king on e1 is in check from black rook on e8
    const checkFen = '4r3/8/8/8/8/8/8/R3K2R w KQ - 0 1';
    const chess = new ChessService(checkFen);
    expect(chess.inCheck()).toBe(true);

    // Cannot castle out of check
    const castleTry = chess.makeMove('e1', 'g1');
    expect(castleTry.success).toBe(false);
  });

  it('should correctly handle Pawn Promotion', () => {
    // White pawn on a7 ready to promote to a8
    const promoFen = '8/P7/8/8/8/8/8/4K2k w - - 0 1';
    const chess = new ChessService(promoFen);

    const promoMove = chess.makeMove('a7', 'a8', 'q');
    expect(promoMove.success).toBe(true);
    expect(promoMove.san).toBe('a8=Q');
    expect(chess.getFen()).toContain('Q');
  });

  it('should detect Checkmate accurately', () => {
    // Scholar's Mate
    const chess = new ChessService();
    chess.makeMove('e2', 'e4');
    chess.makeMove('e7', 'e5');
    chess.makeMove('d1', 'h5');
    chess.makeMove('b8', 'c6');
    chess.makeMove('f1', 'c4');
    chess.makeMove('g8', 'f6');
    const mateMove = chess.makeMove('h5', 'f7');

    expect(mateMove.success).toBe(true);
    expect(mateMove.isCheckmate).toBe(true);
    expect(chess.isCheckmate()).toBe(true);
    expect(chess.isGameOver()).toBe(true);
  });

  it('should detect Stalemate', () => {
    // Classic stalemate position: Black king on a8, White queen on c7, White king on c6
    const stalemateFen = 'k7/2Q5/2K5/8/8/8/8/8 b - - 0 1';
    const chess = new ChessService(stalemateFen);

    expect(chess.inCheck()).toBe(false);
    expect(chess.isStalemate()).toBe(true);
    expect(chess.isDraw()).toBe(true);
    expect(chess.isGameOver()).toBe(true);
  });

  it('should produce destination maps formatted for Chessground', () => {
    const chess = new ChessService();
    const dests = chess.getLegalDests();

    // From initial position, 20 legal moves (16 pawn pushes + 4 knight moves)
    // 8 pawns + 2 knights = 10 origin squares
    expect(dests.size).toBe(10);
    expect(dests.get('e2')).toEqual(expect.arrayContaining(['e3', 'e4']));
    expect(dests.get('g1')).toEqual(expect.arrayContaining(['f3', 'h3']));
    expect(dests.has('e1')).toBe(false); // King has no legal moves yet
  });
});
