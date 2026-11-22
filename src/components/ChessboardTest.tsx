import React, { useEffect, useRef, useState } from 'react';
import { Chessground } from 'chessground';
import { Api } from 'chessground/api';
import { Config } from 'chessground/config';
import { Key } from 'chessground/types';
import { ChessService } from '../services/ChessService.ts';
import { StockfishService } from '../services/StockfishService.ts';
import type { StockfishEvaluation } from '../services/StockfishService.ts';
import { LichessService } from '../services/LichessService.ts';
import type { LichessExplorerResult } from '../services/LichessService.ts';
import { db } from '../db/db.ts';
import { RotateCw, Undo, Save, Zap, Database, Globe } from 'lucide-react';

export const ChessboardTest: React.FC = () => {
  const boardEl = useRef<HTMLDivElement>(null);
  const groundRef = useRef<Api | null>(null);
  const chessRef = useRef<ChessService>(new ChessService());
  const stockfishRef = useRef<StockfishService | null>(null);

  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [fen, setFen] = useState<string>(chessRef.current.getFen());
  const [history, setHistory] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<StockfishEvaluation | null>(null);
  const [engineReady, setEngineReady] = useState(false);
  const [stats, setStats] = useState<LichessExplorerResult | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [turn, setTurn] = useState<'white' | 'black'>('white');

  // Convert chess.js legal dests to Chessground Key map
  const getGroundDests = (): Map<Key, Key[]> => {
    const dests = new Map<Key, Key[]>();
    const legalDests = chessRef.current.getLegalDests();
    legalDests.forEach((toSquares, from) => {
      dests.set(from as Key, toSquares as Key[]);
    });
    return dests;
  };

  // Sync board state
  const syncBoard = (newEvaluation?: StockfishEvaluation | null) => {
    if (!groundRef.current) return;
    const currentFen = chessRef.current.getFen();
    const currentTurn = chessRef.current.getTurn() === 'w' ? 'white' : 'black';

    setFen(currentFen);
    setTurn(currentTurn);
    setHistory(chessRef.current.getHistory());

    const arrows: any[] = [];
    if (newEvaluation?.bestMove && newEvaluation.bestMove.length >= 4) {
      const orig = newEvaluation.bestMove.substring(0, 2) as Key;
      const dest = newEvaluation.bestMove.substring(2, 4) as Key;
      arrows.push({ orig, dest, brush: 'green' });
    }

    groundRef.current.set({
      fen: currentFen,
      turnColor: currentTurn,
      check: chessRef.current.inCheck(),
      movable: {
        color: currentTurn,
        dests: getGroundDests()
      },
      drawable: {
        shapes: arrows
      }
    });
  };

  // Trigger evaluation & Lichess statistics
  const evaluateAndFetch = async (positionFen: string) => {
    // 1. Stockfish evaluation
    if (stockfishRef.current) {
      stockfishRef.current.evaluate(positionFen, 14);
    }

    // 2. Lichess Stats
    setLoadingStats(true);
    try {
      const res = await LichessService.getOpeningStats(positionFen);
      setStats(res);
    } catch (err) {
      console.error('Error querying Lichess stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Handle user move from Chessground
  const handleUserMove = (orig: Key, dest: Key) => {
    const result = chessRef.current.makeMove(orig, dest, 'q');
    if (!result.success) {
      syncBoard(); // Force snapback on illegal move
      return;
    }

    syncBoard();
    evaluateAndFetch(chessRef.current.getFen());
  };

  // Initialize board and services
  useEffect(() => {
    // 1. Stockfish Web Worker initialization
    const sf = new StockfishService('/engine/stockfish.js');
    stockfishRef.current = sf;

    sf.setEvaluationCallback((evalRes) => {
      setEvaluation(evalRes);
      // Update arrows when engine finds best move
      if (groundRef.current && evalRes.bestMove && evalRes.bestMove.length >= 4) {
        const orig = evalRes.bestMove.substring(0, 2) as Key;
        const dest = evalRes.bestMove.substring(2, 4) as Key;
        groundRef.current.set({
          drawable: {
            shapes: [{ orig, dest, brush: 'green' }]
          }
        });
      }
    });

    sf.waitUntilReady().then(() => {
      setEngineReady(true);
      evaluateAndFetch(chessRef.current.getFen());
    });

    // 2. Initialize Chessground
    if (boardEl.current && !groundRef.current) {
      const config: Config = {
        fen: chessRef.current.getFen(),
        orientation: 'white',
        turnColor: 'white',
        check: false,
        coordinates: true,
        animation: { enabled: true, duration: 200 },
        movable: {
          free: false,
          color: 'white',
          dests: getGroundDests(),
          events: {
            after: handleUserMove
          }
        },
        draggable: {
          enabled: true,
          showGhost: true
        },
        selectable: {
          enabled: true
        }
      };

      groundRef.current = Chessground(boardEl.current, config);
    }

    // 3. Count saved positions in Dexie
    db.savedPositions.count().then(setSavedCount);

    return () => {
      if (stockfishRef.current) {
        stockfishRef.current.terminate();
      }
    };
  }, []);

  const handleFlip = () => {
    const next = orientation === 'white' ? 'black' : 'white';
    setOrientation(next);
    if (groundRef.current) {
      groundRef.current.set({ orientation: next });
    }
  };

  const handleUndo = () => {
    chessRef.current.undo();
    syncBoard();
    evaluateAndFetch(chessRef.current.getFen());
  };

  const handleReset = () => {
    chessRef.current.reset();
    syncBoard();
    evaluateAndFetch(chessRef.current.getFen());
  };

  const handleSavePosition = async () => {
    try {
      const currentFen = chessRef.current.getFen();
      const norm = LichessService.normalizeFen(currentFen);
      await db.savedPositions.add({
        fen: currentFen,
        normalizedFen: norm,
        title: `Position after ${history.length} moves (${history.slice(-2).join(' ') || 'Start'})`,
        notes: `Engine Eval: ${evaluation ? (evaluation.scoreCentipawns !== null ? (evaluation.scoreCentipawns / 100).toFixed(2) : `M${evaluation.scoreMate}`) : 'N/A'}`,
        createdAt: Date.now()
      });
      const count = await db.savedPositions.count();
      setSavedCount(count);
      setSaveStatus('Position saved to IndexedDB!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e) {
      console.error(e);
      setSaveStatus('Failed to save position');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto">
      {/* Board & Controls */}
      <div className="lg:col-span-7 flex flex-col items-center">
        <div className="w-full flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className={`w-3 h-3 rounded-full ${turn === 'white' ? 'bg-white border border-slate-600' : 'bg-slate-900 border border-slate-400'}`}></span>
            <span className="font-semibold capitalize text-slate-200">{turn} to move</span>
            {chessRef.current.inCheck() && (
              <span className="text-xs bg-red-600/80 text-white px-2 py-0.5 rounded font-bold">CHECK</span>
            )}
            {chessRef.current.isCheckmate() && (
              <span className="text-xs bg-red-700 text-white px-2 py-0.5 rounded font-bold">CHECKMATE</span>
            )}
          </div>
          <div className="text-xs text-slate-400 font-mono">
            {history.length > 0 ? history.join(' ') : 'Initial Position'}
          </div>
        </div>

        {/* Board viewport with official Chessground wrapper */}
        <div className="chessground-wrapper brown">
          <div ref={boardEl} className="w-full h-full" />
        </div>

        {/* Controls toolbar */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4 w-full">
          <button
            onClick={handleFlip}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm transition"
          >
            <RotateCw size={15} /> Flip
          </button>
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded text-sm transition"
          >
            <Undo size={15} /> Undo
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-sm transition"
          >
            Reset
          </button>
          <button
            onClick={handleSavePosition}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-sm font-medium transition"
          >
            <Save size={15} /> Save Position
          </button>
        </div>

        {saveStatus && (
          <div className="mt-2 text-xs text-emerald-400 font-medium">
            {saveStatus}
          </div>
        )}

        <div className="w-full mt-4 bg-slate-800/60 p-3 rounded text-xs font-mono text-slate-300 break-all select-all">
          <span className="text-slate-500 font-semibold">FEN: </span>{fen}
        </div>
      </div>

      {/* Integration Status & Verification Panels */}
      <div className="lg:col-span-5 space-y-4">
        {/* Stockfish Engine Panel */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-lg p-4 shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap size={18} className="text-amber-400" />
              <h3 className="font-semibold text-slate-200 text-sm">Stockfish WASM Engine</h3>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded font-mono ${engineReady ? 'bg-emerald-900/60 text-emerald-300' : 'bg-amber-900/60 text-amber-300'}`}>
              {engineReady ? 'Active (Web Worker)' : 'Initializing...'}
            </span>
          </div>

          <div className="bg-slate-900/80 p-3 rounded border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Evaluation</div>
              <div className="text-xl font-bold font-mono text-slate-100">
                {evaluation ? (
                  evaluation.scoreMate !== null ? (
                    `#${evaluation.scoreMate}`
                  ) : evaluation.scoreCentipawns !== null ? (
                    `${(evaluation.scoreCentipawns > 0 ? '+' : '')}${(evaluation.scoreCentipawns / 100).toFixed(2)}`
                  ) : '0.00'
                ) : 'Calculating...'}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400">Best Move</div>
              <div className="text-base font-bold font-mono text-emerald-400">
                {evaluation?.bestMove || '...'}
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400">Depth</div>
              <div className="text-sm font-semibold font-mono text-slate-300">
                {evaluation?.depth ? `${evaluation.depth}` : '-'}
              </div>
            </div>
          </div>

          {evaluation?.pv && evaluation.pv.length > 0 && (
            <div className="mt-2 text-xs text-slate-400 font-mono truncate">
              <span className="text-slate-500">PV: </span>{evaluation.pv.slice(0, 6).join(' ')}
            </div>
          )}
        </div>

        {/* Lichess Masters Explorer Panel */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-lg p-4 shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-sky-400" />
              <h3 className="font-semibold text-slate-200 text-sm">Lichess Masters Explorer</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-sky-950 text-sky-300 font-mono">
              {stats?.source ? `Source: ${stats.source.toUpperCase()}` : 'Ready'}
            </span>
          </div>

          {loadingStats ? (
            <div className="py-4 text-center text-xs text-slate-400">Querying master database...</div>
          ) : stats && stats.total > 0 ? (
            <div>
              <div className="text-xs text-slate-400 mb-1">
                Total Master Games: <span className="text-slate-200 font-semibold">{stats.total.toLocaleString()}</span>
              </div>

              {/* Win/Draw percentage bar */}
              <div className="h-4 w-full rounded flex overflow-hidden text-[10px] font-bold text-center leading-4 mb-3">
                <div style={{ width: `${(stats.white / stats.total) * 100}%` }} className="bg-slate-200 text-slate-900">
                  {Math.round((stats.white / stats.total) * 100)}%
                </div>
                <div style={{ width: `${(stats.draws / stats.total) * 100}%` }} className="bg-slate-400 text-slate-900">
                  {Math.round((stats.draws / stats.total) * 100)}%
                </div>
                <div style={{ width: `${(stats.black / stats.total) * 100}%` }} className="bg-slate-700 text-slate-100">
                  {Math.round((stats.black / stats.total) * 100)}%
                </div>
              </div>

              {/* Top candidate moves */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {stats.moves.slice(0, 4).map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-slate-900/60 px-2 py-1 rounded">
                    <span className="font-mono font-bold text-slate-200">{m.san}</span>
                    <span className="text-slate-400 text-[11px]">{m.total.toLocaleString()} games</span>
                    <div className="flex gap-1 text-[11px] font-mono">
                      <span className="text-slate-300">{Math.round((m.white / m.total) * 100)}%</span>
                      <span className="text-slate-400">/</span>
                      <span className="text-slate-400">{Math.round((m.draws / m.total) * 100)}%</span>
                      <span className="text-slate-400">/</span>
                      <span className="text-slate-500">{Math.round((m.black / m.total) * 100)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="py-3 text-center text-xs text-slate-400">
              No master games recorded for this position or offline cache empty.
            </div>
          )}
        </div>

        {/* Dexie.js Local Database Panel */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-lg p-4 shadow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Database size={18} className="text-emerald-400" />
              <h3 className="font-semibold text-slate-200 text-sm">Dexie.js Offline Storage</h3>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono">
              IndexedDB Active
            </span>
          </div>

          <div className="text-xs text-slate-300 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Saved Positions in DB:</span>
              <span className="font-bold text-slate-200">{savedCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Cost:</span>
              <span className="font-bold text-emerald-400">₹0.00 (100% Client-Side)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Offline Availability:</span>
              <span className="font-bold text-slate-200">Repertoires, Lessons & Engine</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
