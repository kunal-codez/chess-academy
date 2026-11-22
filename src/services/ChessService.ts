import { Chess, validateFen } from 'chess.js';
import type { Square, Move, PieceSymbol } from 'chess.js';

export interface MoveResult {
  success: boolean;
  san?: string;
  from?: string;
  to?: string;
  captured?: string;
  promotion?: string;
  isCheck?: boolean;
  isCheckmate?: boolean;
  isDraw?: boolean;
  isStalemate?: boolean;
  isThreefold?: boolean;
  fen: string;
}

export interface HistorySnapshot {
  ply: number;
  moveNumber: number;
  color: 'w' | 'b';
  san: string;
  from: string;
  to: string;
  fen: string;
}

export interface GameStatus {
  status:
    | 'in_progress'
    | 'check'
    | 'checkmate'
    | 'stalemate'
    | 'threefold_repetition'
    | 'fifty_move_rule'
    | 'insufficient_material';
  isGameOver: boolean;
  inCheck: boolean;
  winner: 'white' | 'black' | 'draw' | null;
  description: string;
  turn: 'white' | 'black';
  fullmoveNumber: number;
  halfmoveClock: number;
  plyCount: number;
}

export class ChessService {
  private game: Chess;
  private snapshots: HistorySnapshot[] = [];
  private initialFen: string;
  private redoStack: { from: string; to: string; promotion?: PieceSymbol }[] = [];

  constructor(fen?: string) {
    this.game = new Chess(fen);
    this.initialFen = this.game.fen();
    this.rebuildSnapshots();
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

  public static validateFenString(fen: string): { ok: boolean; error?: string } {
    const res = validateFen(fen.trim());
    return { ok: res.ok, error: res.error };
  }

  public load(fen: string): { success: boolean; error?: string } {
    try {
      const trimmed = fen.trim();
      const val = validateFen(trimmed);
      if (!val.ok) {
        return { success: false, error: val.error || 'Invalid FEN format' };
      }
      this.game.load(trimmed);
      this.initialFen = this.game.fen();
      this.snapshots = [];
      this.redoStack = [];
      this.rebuildSnapshots();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Failed to load FEN' };
    }
  }

  public loadPgn(pgn: string): { success: boolean; error?: string } {
    try {
      const newGame = new Chess();
      newGame.loadPgn(pgn.trim());
      this.game = newGame;
      this.initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      this.redoStack = [];
      this.rebuildSnapshots();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e?.message || 'Invalid PGN content' };
    }
  }

  public reset(): void {
    if (this.initialFen) {
      this.game.load(this.initialFen);
    } else {
      this.game.reset();
    }
    this.snapshots = [];
    this.redoStack = [];
  }

  public newGame(): void {
    this.game.reset();
    this.initialFen = this.game.fen();
    this.snapshots = [];
    this.redoStack = [];
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

  public isPromotionMove(from: string, to: string): boolean {
    const moves = this.game.moves({ square: from as Square, verbose: true });
    return moves.some(m => m.to === to && m.promotion);
  }

  public makeMove(from: string, to: string, promotion?: PieceSymbol): MoveResult {
    try {
      const move = this.game.move({
        from: from as Square,
        to: to as Square,
        promotion: promotion || 'q'
      });

      if (!move) {
        return { success: false, fen: this.game.fen() };
      }

      // Record snapshot
      const ply = this.snapshots.length + 1;
      const moveNumber = Math.ceil(ply / 2);
      this.snapshots.push({
        ply,
        moveNumber,
        color: move.color,
        san: move.san,
        from: move.from,
        to: move.to,
        fen: this.game.fen()
      });

      // Clear redo stack upon making a new forward move
      this.redoStack = [];

      return {
        success: true,
        san: move.san,
        from: move.from,
        to: move.to,
        captured: move.captured,
        promotion: move.promotion,
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
    const move = this.game.undo();
    if (move) {
      this.redoStack.push({
        from: move.from,
        to: move.to,
        promotion: move.promotion as PieceSymbol | undefined
      });
      this.snapshots.pop();
    }
    return move;
  }

  public redo(): MoveResult | null {
    if (this.redoStack.length === 0) return null;
    const nextMove = this.redoStack.pop()!;
    return this.makeMove(nextMove.from, nextMove.to, nextMove.promotion);
  }

  public canUndo(): boolean {
    return this.snapshots.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getSnapshots(): HistorySnapshot[] {
    return [...this.snapshots];
  }

  public getHistory(): string[] {
    return this.snapshots.map(s => s.san);
  }

  public getInitialFen(): string {
    return this.initialFen;
  }

  public getFenAtPly(ply: number): string {
    if (ply <= 0) return this.initialFen;
    const snap = this.snapshots.find(s => s.ply === ply);
    return snap ? snap.fen : this.game.fen();
  }

  public getGameStatus(): GameStatus {
    const turn = this.game.turn() === 'w' ? 'white' : 'black';
    const parts = this.game.fen().split(' ');
    const halfmoveClock = parseInt(parts[4] || '0', 10);
    const fullmoveNumber = parseInt(parts[5] || '1', 10);
    const plyCount = this.snapshots.length;

    if (this.game.isCheckmate()) {
      const winner = turn === 'white' ? 'black' : 'white';
      return {
        status: 'checkmate',
        isGameOver: true,
        inCheck: true,
        winner,
        description: `Checkmate — ${winner === 'white' ? 'White' : 'Black'} wins!`,
        turn,
        fullmoveNumber,
        halfmoveClock,
        plyCount
      };
    }

    if (this.game.isStalemate()) {
      return {
        status: 'stalemate',
        isGameOver: true,
        inCheck: false,
        winner: 'draw',
        description: 'Draw by Stalemate',
        turn,
        fullmoveNumber,
        halfmoveClock,
        plyCount
      };
    }

    if (this.game.isThreefoldRepetition()) {
      return {
        status: 'threefold_repetition',
        isGameOver: true,
        inCheck: false,
        winner: 'draw',
        description: 'Draw by Threefold Repetition',
        turn,
        fullmoveNumber,
        halfmoveClock,
        plyCount
      };
    }

    if (this.game.isInsufficientMaterial()) {
      return {
        status: 'insufficient_material',
        isGameOver: true,
        inCheck: false,
        winner: 'draw',
        description: 'Draw by Insufficient Material',
        turn,
        fullmoveNumber,
        halfmoveClock,
        plyCount
      };
    }

    if (halfmoveClock >= 100) {
      return {
        status: 'fifty_move_rule',
        isGameOver: true,
        inCheck: false,
        winner: 'draw',
        description: 'Draw by Fifty-Move Rule',
        turn,
        fullmoveNumber,
        halfmoveClock,
        plyCount
      };
    }

    if (this.game.inCheck()) {
      return {
        status: 'check',
        isGameOver: false,
        inCheck: true,
        winner: null,
        description: `${turn === 'white' ? 'White' : 'Black'} is in check!`,
        turn,
        fullmoveNumber,
        halfmoveClock,
        plyCount
      };
    }

    return {
      status: 'in_progress',
      isGameOver: false,
      inCheck: false,
      winner: null,
      description: `${turn === 'white' ? 'White' : 'Black'} to move`,
      turn,
      fullmoveNumber,
      halfmoveClock,
      plyCount
    };
  }

  private rebuildSnapshots(): void {
    this.snapshots = [];
    const moves = this.game.history({ verbose: true });
    // Replay to capture FENs
    const temp = new Chess(this.initialFen);
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      temp.move(m);
      const ply = i + 1;
      this.snapshots.push({
        ply,
        moveNumber: Math.ceil(ply / 2),
        color: m.color,
        san: m.san,
        from: m.from,
        to: m.to,
        fen: temp.fen()
      });
    }
  }
}
