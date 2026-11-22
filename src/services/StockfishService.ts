import { UciParser } from './UciParser.ts';
import type { EnginePvLine } from './UciParser.ts';

export type EngineStatus =
  | 'uninitialized'
  | 'initializing'
  | 'ready'
  | 'analyzing'
  | 'idle'
  | 'error';

export interface EngineOptions {
  depth: number;
  multiPv: number;
}

export interface StockfishEvaluation {
  depth: number;
  scoreCentipawns: number | null;
  scoreMate: number | null;
  bestMove: string | null;
  pv: string[];
}

export interface BestMoveInfo {
  uci: string;
  from: string;
  to: string;
  san?: string;
}

export interface EngineEvaluationState {
  fen: string;
  isEvaluating: boolean;
  status: EngineStatus;
  depth: number;
  targetDepth: number;
  multiPv: number;
  lines: EnginePvLine[];
  topLine?: EnginePvLine;
  bestMove?: BestMoveInfo;
  evaluationBar: {
    whitePercentage: number;
    displayScore: string;
    isWhiteAhead: boolean;
    isDraw: boolean;
  };
  error?: string;
}

export type EvaluationUpdateListener = (state: EngineEvaluationState) => void;

export class StockfishService {
  private static instance: StockfishService | null = null;

  private worker: Worker | null = null;
  private status: EngineStatus = 'uninitialized';
  private currentFen = '';
  private currentSearchId = 0;
  private debounceTimer: any = null;

  private options: EngineOptions = {
    depth: 16,
    multiPv: 2
  };

  private currentLines = new Map<number, EnginePvLine>();
  private listeners: Set<EvaluationUpdateListener> = new Set();
  private readyResolvers: (() => void)[] = [];
  private workerPath: string;

  private static getBaseUrl(): string {
    try {
      return import.meta.env?.BASE_URL ?? '/';
    } catch {
      return '/';
    }
  }

  constructor(workerPath?: string) {
    this.workerPath = workerPath || `${StockfishService.getBaseUrl()}engine/stockfish.wasm.js`;
  }

  public static getInstance(workerPath?: string): StockfishService {
    if (!StockfishService.instance) {
      StockfishService.instance = new StockfishService(workerPath);
    }
    return StockfishService.instance;
  }

  /**
   * Initializes the Stockfish Web Worker and configures UCI protocol.
   */
  public async init(path?: string): Promise<boolean> {
    if (this.status === 'ready' || this.status === 'analyzing' || this.status === 'idle') {
      return true;
    }

    if (path) this.workerPath = path;

    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      this.status = 'error';
      return false;
    }

    this.status = 'initializing';
    this.notifyListeners();

    try {
      this.worker = new Worker(this.workerPath);
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = (e) => {
        console.warn('Primary Stockfish worker failed, attempting fallback to stockfish.js', e);
        this.fallbackToJs();
      };

      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          if (this.status === 'initializing') {
            console.warn('Stockfish init timed out on primary path, trying stockfish.js fallback');
            this.fallbackToJs().then(resolve);
          }
        }, 3000);

        this.readyResolvers.push(() => {
          clearTimeout(timeout);
          this.status = 'ready';
          this.sendCommand(`setoption name MultiPV value ${this.options.multiPv}`);
          this.notifyListeners();
          resolve(true);
        });

        this.sendCommand('uci');
      });
    } catch (err: any) {
      console.warn('Error starting worker, falling back to stockfish.js:', err);
      return this.fallbackToJs();
    }
  }

  private async fallbackToJs(): Promise<boolean> {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }

    this.workerPath = `${StockfishService.getBaseUrl()}engine/stockfish.js`;
    try {
      this.worker = new Worker(this.workerPath);
      this.worker.onmessage = this.handleMessage.bind(this);
      this.worker.onerror = (err) => {
        console.error('Stockfish fallback worker failed:', err);
        this.status = 'error';
        this.notifyListeners();
      };

      return new Promise<boolean>((resolve) => {
        this.readyResolvers.push(() => {
          this.status = 'ready';
          this.sendCommand(`setoption name MultiPV value ${this.options.multiPv}`);
          this.notifyListeners();
          resolve(true);
        });
        this.sendCommand('uci');
      });
    } catch (e: any) {
      this.status = 'error';
      this.notifyListeners();
      return false;
    }
  }

  public subscribe(listener: EvaluationUpdateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getStatus(): EngineStatus {
    return this.status;
  }

  public getOptions(): EngineOptions {
    return { ...this.options };
  }

  // --- Backwards Compatibility Methods for Existing Tests & Legacy Calls ---
  private legacyCallback: ((evalResult: StockfishEvaluation) => void) | null = null;

  public setEvaluationCallback(callback: (evalResult: StockfishEvaluation) => void): void {
    this.legacyCallback = callback;
  }

  public async waitUntilReady(): Promise<void> {
    if (this.status === 'ready' || this.status === 'idle') return;
    await this.init();
  }

  public evaluate(fen: string, depth = 15): void {
    this.evaluatePosition(fen, { depth, forceImmediate: true });
  }

  public static parseUciInfo(line: string): StockfishEvaluation | null {
    const parsed = UciParser.parseUciInfo(line);
    if (!parsed) return null;
    return {
      depth: parsed.depth,
      scoreCentipawns: parsed.scoreCp,
      scoreMate: parsed.scoreMate,
      bestMove: parsed.pvUci[0] || null,
      pv: parsed.pvUci
    };
  }

  public setDepth(depth: number): void {
    this.options.depth = Math.max(8, Math.min(30, depth));
    if (this.currentFen && (this.status === 'analyzing' || this.status === 'ready' || this.status === 'idle')) {
      this.evaluatePosition(this.currentFen, { forceImmediate: true });
    }
  }

  public setMultiPv(multiPv: number): void {
    const validPv = Math.max(1, Math.min(5, multiPv));
    if (this.options.multiPv !== validPv) {
      this.options.multiPv = validPv;
      this.sendCommand(`setoption name MultiPV value ${validPv}`);
      if (this.currentFen && (this.status === 'analyzing' || this.status === 'ready' || this.status === 'idle')) {
        this.evaluatePosition(this.currentFen, { forceImmediate: true });
      }
    }
  }

  /**
   * Evaluates a FEN position with debounce and race-condition protection.
   */
  public evaluatePosition(
    fen: string,
    options?: { depth?: number; multiPv?: number; forceImmediate?: boolean }
  ): void {
    if (!fen) return;

    if (options?.depth) this.options.depth = options.depth;
    if (options?.multiPv && options.multiPv !== this.options.multiPv) {
      this.setMultiPv(options.multiPv);
    }

    // Cancel pending search debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    // Stop current engine computation
    this.sendCommand('stop');

    this.currentSearchId++;
    const searchId = this.currentSearchId;
    this.currentFen = fen;
    this.currentLines.clear();

    // Notify listeners of state reset for new position
    this.status = 'analyzing';
    this.notifyListeners();

    const startSearch = () => {
      if (searchId !== this.currentSearchId) return;

      this.sendCommand(`position fen ${fen}`);
      this.sendCommand(`go depth ${this.options.depth}`);
    };

    if (options?.forceImmediate) {
      startSearch();
    } else {
      // Debounce rapid move stepping by 120ms
      this.debounceTimer = setTimeout(startSearch, 120);
    }
  }

  public stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.sendCommand('stop');
    if (this.status === 'analyzing') {
      this.status = 'idle';
      this.notifyListeners();
    }
  }

  public terminate(): void {
    this.stop();
    if (this.worker) {
      this.sendCommand('quit');
      this.worker.terminate();
      this.worker = null;
    }
    this.status = 'uninitialized';
    this.currentLines.clear();
    this.notifyListeners();
  }

  private sendCommand(cmd: string): void {
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  private handleMessage(event: MessageEvent<string>): void {
    const line = typeof event.data === 'string' ? event.data.trim() : '';
    if (!line) return;

    if (line === 'uciok') {
      this.sendCommand('isready');
      return;
    }

    if (line === 'readyok') {
      while (this.readyResolvers.length > 0) {
        const resolve = this.readyResolvers.shift();
        if (resolve) resolve();
      }
      return;
    }

    if (line.startsWith('info') && line.includes('score')) {
      if (this.legacyCallback) {
        const legacyParsed = StockfishService.parseUciInfo(line);
        if (legacyParsed) this.legacyCallback(legacyParsed);
      }
      const parsedLine = UciParser.processInfoLine(line, this.currentFen);
      if (parsedLine) {
        this.currentLines.set(parsedLine.multipv, parsedLine);
        this.notifyListeners();
      }
      return;
    }

    if (line.startsWith('bestmove')) {
      const best = UciParser.parseBestMove(line);
      if (best) {
        this.status = 'idle';
        this.notifyListeners();
      }
      return;
    }
  }

  public getState(): EngineEvaluationState {
    const lines = Array.from(this.currentLines.values()).sort(
      (a, b) => a.multipv - b.multipv
    );
    const topLine = lines[0];

    const whitePercentage = topLine ? topLine.winPercentage : 50;
    const displayScore = topLine ? topLine.formattedScore : '0.0';
    const isWhiteAhead = topLine
      ? (topLine.normalizedCp || 0) > 20 || (topLine.normalizedMate || 0) > 0
      : false;
    const isDraw = topLine
      ? Math.abs(topLine.normalizedCp || 0) <= 20 && topLine.normalizedMate === null
      : true;

    let bestMove: BestMoveInfo | undefined = undefined;
    if (topLine?.bestMoveUci && topLine.bestMoveUci.length >= 4) {
      bestMove = {
        uci: topLine.bestMoveUci,
        from: topLine.bestMoveUci.slice(0, 2),
        to: topLine.bestMoveUci.slice(2, 4),
        san: topLine.bestMoveSan || undefined
      };
    }

    return {
      fen: this.currentFen,
      isEvaluating: this.status === 'analyzing',
      status: this.status,
      depth: topLine ? topLine.depth : 0,
      targetDepth: this.options.depth,
      multiPv: this.options.multiPv,
      lines,
      topLine,
      bestMove,
      evaluationBar: {
        whitePercentage,
        displayScore,
        isWhiteAhead,
        isDraw
      }
    };
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (e) {
        console.error('Error notifying engine listener:', e);
      }
    });
  }
}

export const stockfishEngine = StockfishService.getInstance();
