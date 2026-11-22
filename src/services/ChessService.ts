import { Chess } from 'chess.js';
import type { Square, Move } from 'chess.js';

export interface MoveResult {
  success: boolean;
  san?: string;
  captured?: string;
  isCheck?: boolean;
  isCheckmate?: boolean;
  isDraw?: boolean;
  isStalemate?: boolean;
  isThreefold?: boolean;
  fen: string;
}

export class ChessService {
  private game: Chess;

  constructor(fen?: string) {
    this.game = new Chess(fen);
  }

  public getFen(): string {
    return this.game.fen();
  }

  public getPgn(): string {
    return this.game.pgn();
  }

  public getTurn(): 'w' | 'b' {
    return this.game.turn();
  }

  public inCheck(): boolean {
    return this.game.inCheck();
  }

  public isGameOver(): boolean {
    return this.game.isGameOver();
  }

  public isCheckmate(): boolean {
    return this.game.isCheckmate();
  }

  public isDraw(): boolean {
    return this.game.isDraw();
  }

  public isStalemate(): boolean {
    return this.game.isStalemate();
  }

  public isThreefoldRepetition(): boolean {
    return this.game.isThreefoldRepetition();
  }

  public isInsufficientMaterial(): boolean {
    return this.game.isInsufficientMaterial();
  }

  public load(fen: string): boolean {
    try {
      this.game.load(fen);
      return true;
    } catch {
      return false;
    }
  }

  public loadPgn(pgn: string): boolean {
    try {
      this.game.loadPgn(pgn);
      return true;
    } catch {
      return false;
    }
  }

  public reset(): void {
    this.game.reset();
  }

  public getLegalMoves(square?: Square): Move[] {
    return this.game.moves({ square, verbose: true });
  }

  public getLegalDests(): Map<string, string[]> {
    const dests = new Map<string, string[]>();
    const moves = this.game.moves({ verbose: true });

    for (const move of moves) {
      if (!dests.has(move.from)) {
        dests.set(move.from, []);
      }
      dests.get(move.from)!.push(move.to);
    }
    return dests;
  }

  public makeMove(from: string, to: string, promotion?: 'q' | 'r' | 'b' | 'n'): MoveResult {
    try {
      const move = this.game.move({
        from,
        to,
        promotion: promotion || 'q'
      });

      if (!move) {
        return { success: false, fen: this.game.fen() };
      }

      return {
        success: true,
        san: move.san,
        captured: move.captured,
        isCheck: this.game.inCheck(),
        isCheckmate: this.game.isCheckmate(),
        isDraw: this.game.isDraw(),
        isStalemate: this.game.isStalemate(),
        isThreefold: this.game.isThreefoldRepetition(),
        fen: this.game.fen()
      };
    } catch {
      return { success: false, fen: this.game.fen() };
    }
  }

  public undo(): Move | null {
    return this.game.undo();
  }

  public getHistory(): string[] {
    return this.game.history();
  }
}
