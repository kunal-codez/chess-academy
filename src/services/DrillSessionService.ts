import { db } from '../db/db.ts';
import { ChessService } from './ChessService.ts';
import { calculateSm2, isLineDue, sortDrillQueue } from './SrsScheduler.ts';
import type { Repertoire, RepertoireLine } from '../types/repertoire.types.ts';
import type { LineTrainingProgress } from '../types/srs.types.ts';
import type { Key } from 'chessground/types';
import type { PieceSymbol } from 'chess.js';

export type DrillMode = 'due' | 'all';
export type DrillStatus = 'idle' | 'drilling' | 'line_completed' | 'session_completed';

export interface DrillLineState {
  line: RepertoireLine;
  progress?: LineTrainingProgress;
  mistakes: number;
  hintsUsed: number;
  hintLevel: number; // 0 = none, 1 = origin square, 2 = full arrow
  skipped: boolean;
  completedResult?: LineTrainingProgress;
}

export interface DrillSessionStats {
  totalLines: number;
  completedLines: number;
  perfectLines: number;
  totalMistakes: number;
  hintsUsed: number;
  accuracy: number;
}

export interface DrillSessionState {
  status: DrillStatus;
  repertoire: Repertoire | null;
  mode: DrillMode;
  queue: RepertoireLine[];
  currentIndex: number;
  currentPly: number;
  currentLineState: DrillLineState | null;
  sessionStats: DrillSessionStats;
  feedback: {
    type: 'success' | 'error' | 'info' | null;
    message: string;
  };
  shapes: any[];
}

export type DrillStateListener = (state: DrillSessionState) => void;

export class DrillSessionService {
  private static instance: DrillSessionService | null = null;
  private chess: ChessService = new ChessService();
  private listeners: Set<DrillStateListener> = new Set();
  private opponentTimer: any = null;
  public autoReplyDelayMs = 300; // Configurable for fast tests

  private state: DrillSessionState = {
    status: 'idle',
    repertoire: null,
    mode: 'due',
    queue: [],
    currentIndex: 0,
    currentPly: 0,
    currentLineState: null,
    sessionStats: {
      totalLines: 0,
      completedLines: 0,
      perfectLines: 0,
      totalMistakes: 0,
      hintsUsed: 0,
      accuracy: 100
    },
    feedback: {
      type: null,
      message: ''
    },
    shapes: []
  };

  public static getInstance(): DrillSessionService {
    if (!DrillSessionService.instance) {
      DrillSessionService.instance = new DrillSessionService();
    }
    return DrillSessionService.instance;
  }

  public subscribe(listener: DrillStateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    const currentState = this.getState();
    for (const listener of this.listeners) {
      listener(currentState);
    }
  }

  public getState(): DrillSessionState {
    return {
      ...this.state,
      queue: [...this.state.queue],
      sessionStats: { ...this.state.sessionStats },
      currentLineState: this.state.currentLineState
        ? { ...this.state.currentLineState }
        : null,
      shapes: [...this.state.shapes]
    };
  }

  public getChessService(): ChessService {
    return this.chess;
  }

  /**
   * Retrieves repertoire stats summary (total lines, due lines, mastered lines).
   */
  public async getRepertoireStats(repertoireId: string, now: Date = new Date()): Promise<{
    totalLines: number;
    dueLines: number;
    masteredLines: number;
  }> {
    const lines = await db.repertoireLines.where('repertoireId').equals(repertoireId).toArray();
    const progressList = await db.lineTrainingProgress.where('repertoireId').equals(repertoireId).toArray();
    const progressMap = new Map<string, LineTrainingProgress>(progressList.map((p) => [p.lineId, p]));

    let dueCount = 0;
    let masteredCount = 0;

    for (const line of lines) {
      const prog = progressMap.get(line.id);
      if (isLineDue(prog, now)) {
        dueCount++;
      }
      if (prog && prog.intervalDays >= 6) {
        masteredCount++;
      }
    }

    return {
      totalLines: lines.length,
      dueLines: dueCount,
      masteredLines: masteredCount
    };
  }

  /**
   * Starts a new drill session for the specified repertoire and mode.
   */
  public async startSession(
    repertoire: Repertoire,
    mode: DrillMode = 'due',
    now: Date = new Date()
  ): Promise<boolean> {
    this.clearOpponentTimer();

    const lines = await db.repertoireLines.where('repertoireId').equals(repertoire.id).toArray();
    if (lines.length === 0) {
      this.state = {
        ...this.state,
        status: 'idle',
        feedback: {
          type: 'error',
          message: 'No lines saved in this repertoire. Save lines before drilling.'
        }
      };
      this.notify();
      return false;
    }

    const progressList = await db.lineTrainingProgress.where('repertoireId').equals(repertoire.id).toArray();
    const progressMap = new Map<string, LineTrainingProgress>(progressList.map((p) => [p.lineId, p]));

    let queueLines: RepertoireLine[];
    if (mode === 'due') {
      const dueOnly = lines.filter((line) => isLineDue(progressMap.get(line.id), now));
      queueLines = sortDrillQueue(dueOnly, progressMap, now);
      if (queueLines.length === 0) {
        // No lines are due; fall back to practice all
        queueLines = sortDrillQueue(lines, progressMap, now);
      }
    } else {
      queueLines = sortDrillQueue(lines, progressMap, now);
    }

    this.state = {
      status: 'drilling',
      repertoire,
      mode,
      queue: queueLines,
      currentIndex: 0,
      currentPly: 0,
      currentLineState: null,
      sessionStats: {
        totalLines: queueLines.length,
        completedLines: 0,
        perfectLines: 0,
        totalMistakes: 0,
        hintsUsed: 0,
        accuracy: 100
      },
      feedback: {
        type: 'info',
        message: `Drilling ${repertoire.name} (${queueLines.length} ${queueLines.length === 1 ? 'line' : 'lines'})`
      },
      shapes: []
    };

    await this.loadLineAtCurrentIndex();
    return true;
  }

  /**
   * Loads the line at currentIndex, resets the board, and triggers opponent's first move if Black repertoire.
   */
  private async loadLineAtCurrentIndex(): Promise<void> {
    this.clearOpponentTimer();

    if (this.state.currentIndex >= this.state.queue.length) {
      this.finishSession();
      return;
    }

    const line = this.state.queue[this.state.currentIndex];
    const progress = await db.lineTrainingProgress.get(line.id);

    this.chess.newGame();

    this.state.currentLineState = {
      line,
      progress,
      mistakes: 0,
      hintsUsed: 0,
      hintLevel: 0,
      skipped: false
    };
    this.state.currentPly = 0;
    this.state.shapes = [];
    this.state.status = 'drilling';
    this.state.feedback = {
      type: 'info',
      message: `Your turn! Play the opening move as ${this.state.repertoire?.color === 'white' ? 'White' : 'Black'}.`
    };

    this.notify();

    // If repertoire is for Black, opponent (White) plays move 1
    if (this.state.repertoire?.color === 'black' && line.movesSan.length > 0) {
      this.scheduleOpponentMove(line.movesSan[0]);
    }
  }

  /**
   * Determines if the current ply belongs to the user or opponent.
   */
  public isUserTurn(): boolean {
    if (this.state.status !== 'drilling' || !this.state.repertoire || !this.state.currentLineState) {
      return false;
    }
    const isRepWhite = this.state.repertoire.color === 'white';
    const isEvenPly = this.state.currentPly % 2 === 0;
    return isRepWhite ? isEvenPly : !isEvenPly;
  }

  /**
   * Handles user move attempt from the chessboard.
   */
  public handleUserMove(orig: Key, dest: Key, promo?: PieceSymbol, now: Date = new Date()): {
    isCorrect: boolean;
    isLineComplete: boolean;
    expectedSan: string;
    playedSan?: string;
  } {
    if (this.state.status !== 'drilling' || !this.state.currentLineState || !this.isUserTurn()) {
      return { isCorrect: false, isLineComplete: false, expectedSan: '' };
    }

    const { line } = this.state.currentLineState;
    const expectedSan = line.movesSan[this.state.currentPly];
    const expectedUci = line.movesUci[this.state.currentPly];

    // Check if the move is legal in chess.js
    const legalMoves = this.chess.getLegalMoves();
    const match = legalMoves.find(
      (m) => m.from === orig && m.to === dest && (!promo || m.promotion === promo)
    );

    if (!match) {
      // Illegal chess move
      this.state.feedback = {
        type: 'error',
        message: 'Illegal chess move.'
      };
      this.notify();
      return { isCorrect: false, isLineComplete: false, expectedSan };
    }

    const playedSan = match.san;
    const playedUci = orig + dest + (promo || '');

    const isCorrect = playedSan === expectedSan || playedUci === expectedUci;

    if (!isCorrect) {
      // Incorrect move against repertoire line
      this.state.currentLineState.mistakes++;
      this.state.sessionStats.totalMistakes++;
      this.updateAccuracy();

      this.state.feedback = {
        type: 'error',
        message: `Incorrect move (${playedSan}). Expected a different line. Try again or use a Hint!`
      };
      this.notify();
      return { isCorrect: false, isLineComplete: false, expectedSan, playedSan };
    }

    // Correct Move! Execute on internal chess engine
    this.chess.makeMove(orig, dest, promo);
    this.state.currentPly++;
    this.state.shapes = []; // Clear hints
    this.state.currentLineState.hintLevel = 0;

    const isLineComplete = this.state.currentPly >= line.movesSan.length;

    if (isLineComplete) {
      this.completeCurrentLine(now);
      return { isCorrect: true, isLineComplete: true, expectedSan, playedSan };
    }

    // Line continues: Opponent replies
    this.state.feedback = {
      type: 'success',
      message: 'Good move!'
    };
    this.notify();

    const opponentMoveSan = line.movesSan[this.state.currentPly];
    this.scheduleOpponentMove(opponentMoveSan);

    return { isCorrect: true, isLineComplete: false, expectedSan, playedSan };
  }

  /**
   * Schedules or immediately executes the opponent's reply move.
   */
  private scheduleOpponentMove(san: string): void {
    this.clearOpponentTimer();

    const executeMove = () => {
      this.chess.makeSanMove(san);
      this.state.currentPly++;

      const isLineComplete =
        this.state.currentLineState &&
        this.state.currentPly >= this.state.currentLineState.line.movesSan.length;

      if (isLineComplete) {
        this.completeCurrentLine();
      } else {
        this.state.feedback = {
          type: 'info',
          message: 'Your turn!'
        };
        this.notify();
      }
    };

    if (this.autoReplyDelayMs <= 0) {
      executeMove();
    } else {
      this.opponentTimer = setTimeout(executeMove, this.autoReplyDelayMs);
    }
  }

  /**
   * Completes the current line, persists SM-2 progress to Dexie, and prompts for next line.
   */
  public async completeCurrentLine(now: Date = new Date()): Promise<void> {
    this.clearOpponentTimer();
    if (!this.state.currentLineState || !this.state.repertoire) return;

    const { line, progress, mistakes, hintsUsed, skipped } = this.state.currentLineState;

    const updatedProgress = calculateSm2(
      progress,
      line.id,
      this.state.repertoire.id,
      mistakes,
      hintsUsed,
      skipped,
      now
    );

    this.state.currentLineState.completedResult = updatedProgress;
    this.state.status = 'line_completed';
    this.state.sessionStats.completedLines++;
    if (mistakes === 0 && !skipped && hintsUsed === 0) {
      this.state.sessionStats.perfectLines++;
    }
    this.updateAccuracy();

    this.state.feedback = {
      type: 'success',
      message: `Line completed! Next review in ${updatedProgress.intervalDays} ${updatedProgress.intervalDays === 1 ? 'day' : 'days'}.`
    };

    this.notify();

    await db.lineTrainingProgress.put(updatedProgress);
  }

  /**
   * Increments and applies hints:
   * Level 1: Highlights source square.
   * Level 2: Draws destination arrow.
   */
  public provideHint(): { from: string; to: string; level: number } | null {
    if (this.state.status !== 'drilling' || !this.state.currentLineState || !this.isUserTurn()) {
      return null;
    }

    const { line } = this.state.currentLineState;
    const uci = line.movesUci[this.state.currentPly];
    if (!uci || uci.length < 4) return null;

    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);

    this.state.currentLineState.hintsUsed++;
    this.state.sessionStats.hintsUsed++;

    if (this.state.currentLineState.hintLevel === 0) {
      // Level 1: Highlight origin square
      this.state.currentLineState.hintLevel = 1;
      this.state.shapes = [
        {
          orig: from as Key,
          brush: 'yellow'
        }
      ];
      this.state.feedback = {
        type: 'info',
        message: `Hint: Move a piece from square ${from.toUpperCase()}`
      };
    } else {
      // Level 2: Full move arrow
      this.state.currentLineState.hintLevel = 2;
      this.state.shapes = [
        {
          orig: from as Key,
          dest: to as Key,
          brush: 'blue'
        }
      ];
      this.state.feedback = {
        type: 'info',
        message: `Hint: Play ${line.movesSan[this.state.currentPly]} (${from} → ${to})`
      };
    }

    this.notify();
    return { from, to, level: this.state.currentLineState.hintLevel };
  }

  /**
   * Skips the current line or reveals solution (counts as hard fail Quality 1).
   */
  public async skipLine(now: Date = new Date()): Promise<void> {
    if (this.state.status !== 'drilling' || !this.state.currentLineState) return;
    this.state.currentLineState.skipped = true;
    this.state.currentLineState.mistakes += 3;
    this.state.sessionStats.totalMistakes += 3;
    this.updateAccuracy();

    // Replay full line on board
    this.chess.loadMoveSequence(this.state.currentLineState.line.movesSan);
    this.state.currentPly = this.state.currentLineState.line.movesSan.length;

    await this.completeCurrentLine(now);
  }

  /**
   * Restarts the current line from move 0.
   */
  public restartCurrentLine(): void {
    this.clearOpponentTimer();
    if (!this.state.currentLineState) return;
    this.state.currentLineState.mistakes = 0;
    this.state.currentLineState.hintsUsed = 0;
    this.state.currentLineState.hintLevel = 0;
    this.state.currentLineState.skipped = false;
    this.loadLineAtCurrentIndex();
  }

  /**
   * Advances to the next line in the drill queue.
   */
  public async nextLine(): Promise<void> {
    this.clearOpponentTimer();
    this.state.currentIndex++;
    if (this.state.currentIndex >= this.state.queue.length) {
      this.finishSession();
    } else {
      await this.loadLineAtCurrentIndex();
    }
  }

  /**
   * Finalizes the session and presents summary stats.
   */
  private finishSession(): void {
    this.clearOpponentTimer();
    this.state.status = 'session_completed';
    this.state.feedback = {
      type: 'success',
      message: `Drill session complete! You completed ${this.state.sessionStats.completedLines} lines with ${this.state.sessionStats.accuracy}% accuracy.`
    };
    this.notify();
  }

  /**
   * Exits drill mode and returns to normal board play.
   */
  public exitDrill(): void {
    this.clearOpponentTimer();
    this.state = {
      status: 'idle',
      repertoire: null,
      mode: 'due',
      queue: [],
      currentIndex: 0,
      currentPly: 0,
      currentLineState: null,
      sessionStats: {
        totalLines: 0,
        completedLines: 0,
        perfectLines: 0,
        totalMistakes: 0,
        hintsUsed: 0,
        accuracy: 100
      },
      feedback: {
        type: null,
        message: ''
      },
      shapes: []
    };
    this.notify();
  }

  private updateAccuracy(): void {
    const totalMovesAttempted =
      this.state.sessionStats.completedLines + this.state.sessionStats.totalMistakes;
    if (totalMovesAttempted === 0) {
      this.state.sessionStats.accuracy = 100;
    } else {
      const correctMoves = Math.max(0, totalMovesAttempted - this.state.sessionStats.totalMistakes);
      this.state.sessionStats.accuracy = Math.round((correctMoves / totalMovesAttempted) * 100);
    }
  }

  private clearOpponentTimer(): void {
    if (this.opponentTimer) {
      clearTimeout(this.opponentTimer);
      this.opponentTimer = null;
    }
  }
}

export const drillSession = DrillSessionService.getInstance();
