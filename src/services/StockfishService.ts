export interface StockfishEvaluation {
  depth: number;
  scoreCentipawns: number | null;
  scoreMate: number | null;
  bestMove: string | null;
  pv: string[];
}

export type StockfishCallback = (evalResult: StockfishEvaluation) => void;

export class StockfishService {
  private worker: Worker | null = null;
  private isReady = false;
  private onEvaluation: StockfishCallback | null = null;
  private readyResolvers: (() => void)[] = [];

  constructor(workerPath?: string) {
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        const path = workerPath || '/engine/stockfish.js';
        this.worker = new Worker(path);
        this.worker.onmessage = this.handleMessage.bind(this);
        this.sendCommand('uci');
      } catch (err) {
        console.warn('Web Worker initialization error:', err);
      }
    }
  }

  public setEvaluationCallback(callback: StockfishCallback) {
    this.onEvaluation = callback;
  }

  public sendCommand(cmd: string) {
    if (this.worker) {
      this.worker.postMessage(cmd);
    }
  }

  public async waitUntilReady(): Promise<void> {
    if (this.isReady) return;
    return new Promise((resolve) => {
      this.readyResolvers.push(resolve);
      this.sendCommand('isready');
    });
  }

  public evaluate(fen: string, depth = 15): void {
    this.sendCommand('stop');
    this.sendCommand(`position fen ${fen}`);
    this.sendCommand(`go depth ${depth}`);
  }

  public stop(): void {
    this.sendCommand('stop');
  }

  public terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  public handleMessage(event: MessageEvent<string>) {
    const line = typeof event.data === 'string' ? event.data : '';

    if (line === 'uciok' || line === 'readyok') {
      this.isReady = true;
      while (this.readyResolvers.length > 0) {
        const resolve = this.readyResolvers.shift();
        if (resolve) resolve();
      }
    }

    if (line.startsWith('info') && line.includes('score')) {
      const parsed = StockfishService.parseUciInfo(line);
      if (parsed && this.onEvaluation) {
        this.onEvaluation(parsed);
      }
    }
  }

  public static parseUciInfo(line: string): StockfishEvaluation | null {
    const depthMatch = line.match(/\bdepth\s+(\d+)/);
    const cpMatch = line.match(/\bscore\s+cp\s+(-?\d+)/);
    const mateMatch = line.match(/\bscore\s+mate\s+(-?\d+)/);
    const pvIndex = line.indexOf(' pv ');

    if (!depthMatch) return null;

    const depth = parseInt(depthMatch[1], 10);
    const scoreCentipawns = cpMatch ? parseInt(cpMatch[1], 10) : null;
    const scoreMate = mateMatch ? parseInt(mateMatch[1], 10) : null;

    let pv: string[] = [];
    if (pvIndex !== -1) {
      pv = line.substring(pvIndex + 4).trim().split(/\s+/);
    }

    return {
      depth,
      scoreCentipawns,
      scoreMate,
      bestMove: pv.length > 0 ? pv[0] : null,
      pv
    };
  }
}
