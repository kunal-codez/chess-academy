import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { Key } from 'chessground/types';
import type { PieceSymbol } from 'chess.js';
import { ChessService } from '../../services/ChessService.ts';
import type { HistorySnapshot, GameStatus } from '../../services/ChessService.ts';
import { ChessgroundBoard } from './ChessgroundBoard.tsx';
import { BoardControls } from './BoardControls.tsx';
import { MoveHistory } from './MoveHistory.tsx';
import { GameStatusBadge } from './GameStatusBadge.tsx';
import { PromotionModal } from './PromotionModal.tsx';
import { LoadPositionModal } from './LoadPositionModal.tsx';
import { OpeningExplorerPanel } from '../explorer/OpeningExplorerPanel.tsx';
import { EvaluationBar } from '../engine/EvaluationBar.tsx';
import { EngineAnalysisPanel } from '../engine/EngineAnalysisPanel.tsx';
import { openingDatabase } from '../../services/OpeningDatabaseService.ts';
import { stockfishEngine } from '../../services/StockfishService.ts';
import type { EngineEvaluationState } from '../../services/StockfishService.ts';
import type { OpeningRecognitionResult, OpeningRecord } from '../../types/opening.types.ts';
import { Sun, Moon, BookOpen, History as HistoryIcon } from 'lucide-react';

export const InteractiveChessArena: React.FC = () => {
  const chessRef = useRef<ChessService>(new ChessService());

  // Board View State
  const [fen, setFen] = useState<string>(chessRef.current.getFen());
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [turnColor, setTurnColor] = useState<'white' | 'black'>('white');
  const [dests, setDests] = useState<Map<Key, Key[]>>(new Map());
  const [check, setCheck] = useState<boolean>(false);
  const [lastMove, setLastMove] = useState<Key[] | undefined>(undefined);
  const [historySnapshots, setHistorySnapshots] = useState<HistorySnapshot[]>([]);
  const [currentPly, setCurrentPly] = useState<number>(0);
  const [gameStatus, setGameStatus] = useState<GameStatus>(chessRef.current.getGameStatus());
  const [recognizedOpening, setRecognizedOpening] = useState<OpeningRecognitionResult | undefined>(undefined);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [sidebarTab, setSidebarTab] = useState<'explorer' | 'history'>('explorer');

  // Stockfish Engine State
  const [isEngineEnabled, setIsEngineEnabled] = useState<boolean>(false);
  const [showBestMoveArrow, setShowBestMoveArrow] = useState<boolean>(true);
  const [engineState, setEngineState] = useState<EngineEvaluationState>(stockfishEngine.getState());

  // Promotion Dialog State
  const [pendingPromotion, setPendingPromotion] = useState<{
    orig: Key;
    dest: Key;
  } | null>(null);

  // Load FEN / PGN Modal State
  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [loadModalTab, setLoadModalTab] = useState<'fen' | 'pgn'>('fen');

  // Convert chess.js legal dests to Chessground Key map
  const updateLegalDests = useCallback(() => {
    const legalMap = new Map<Key, Key[]>();
    const rawDests = chessRef.current.getLegalDests();
    rawDests.forEach((toSquares, from) => {
      legalMap.set(from as Key, toSquares as Key[]);
    });
    setDests(legalMap);
  }, []);

  // Synchronize board UI state from the authoritative ChessService
  const syncState = useCallback((moveHighlight?: [Key, Key]) => {
    const currentFen = chessRef.current.getFen();
    const turn = chessRef.current.getTurn() === 'w' ? 'white' : 'black';
    const isCheck = chessRef.current.inCheck();
    const snaps = chessRef.current.getSnapshots();

    setFen(currentFen);
    setTurnColor(turn);
    setCheck(isCheck);
    setHistorySnapshots(snaps);
    setCurrentPly(snaps.length);
    setGameStatus(chessRef.current.getGameStatus());

    const moves = snaps.map((s) => s.san);
    const epd = chessRef.current.getEpd();
    const recognized = openingDatabase.recognize(moves, epd);
    setRecognizedOpening(recognized);

    if (moveHighlight) {
      setLastMove(moveHighlight);
    } else if (snaps.length > 0) {
      const lastSnap = snaps[snaps.length - 1];
      setLastMove([lastSnap.from as Key, lastSnap.to as Key]);
    } else {
      setLastMove(undefined);
    }

    updateLegalDests();
  }, [updateLegalDests]);

  // Initial mount synchronization
  useEffect(() => {
    syncState();
  }, [syncState]);

  // Subscribe to Stockfish engine state updates
  useEffect(() => {
    const unsubscribe = stockfishEngine.subscribe((state) => {
      setEngineState(state);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Trigger evaluation when FEN changes (if engine is enabled)
  useEffect(() => {
    if (isEngineEnabled && fen) {
      stockfishEngine.evaluatePosition(fen);
    }
  }, [isEngineEnabled, fen]);

  // Clean up worker evaluation on unmount
  useEffect(() => {
    return () => {
      stockfishEngine.stop();
    };
  }, []);

  // Compute best move arrow for Chessground
  const boardShapes = useMemo(() => {
    if (!isEngineEnabled || !showBestMoveArrow || !engineState.bestMove) {
      return [];
    }
    const { from, to } = engineState.bestMove;
    return [
      {
        orig: from as Key,
        dest: to as Key,
        brush: 'green'
      }
    ];
  }, [isEngineEnabled, showBestMoveArrow, engineState.bestMove]);

  // Handle move from user interaction
  const handleMove = (orig: Key, dest: Key) => {
    // If user is currently inspecting past history, first fast-forward to latest position
    if (currentPly < historySnapshots.length) {
      const latestFen = chessRef.current.getFen();
      setFen(latestFen);
      setCurrentPly(historySnapshots.length);
      syncState();
      return;
    }

    // Check if the move is a pawn promotion move
    if (chessRef.current.isPromotionMove(orig, dest)) {
      setPendingPromotion({ orig, dest });
      return;
    }

    // Standard legal move execution
    const res = chessRef.current.makeMove(orig, dest);
    if (!res.success) {
      // Force board snapback on illegal move attempt
      syncState();
      return;
    }

    syncState([orig, dest]);
  };

  // Handle promotion piece selection from modal
  const handleSelectPromotion = (piece: PieceSymbol) => {
    if (!pendingPromotion) return;
    const { orig, dest } = pendingPromotion;
    setPendingPromotion(null);

    const res = chessRef.current.makeMove(orig, dest, piece);
    if (res.success) {
      syncState([orig, dest]);
    } else {
      syncState();
    }
  };

  // History navigation handlers
  const handleSelectPly = (ply: number) => {
    setCurrentPly(ply);
    const targetFen = chessRef.current.getFenAtPly(ply);
    setFen(targetFen);

    if (ply === 0) {
      setLastMove(undefined);
      setRecognizedOpening(undefined);
    } else {
      const snap = historySnapshots.find((s) => s.ply === ply);
      if (snap) {
        setLastMove([snap.from as Key, snap.to as Key]);
      }
      const activeMoves = historySnapshots.slice(0, ply).map((s) => s.san);
      setRecognizedOpening(openingDatabase.recognize(activeMoves));
    }
  };

  const handleFirstMove = () => handleSelectPly(0);
  const handlePrevMove = () => {
    if (currentPly > 0) handleSelectPly(currentPly - 1);
  };
  const handleNextMove = () => {
    if (currentPly < historySnapshots.length) handleSelectPly(currentPly + 1);
  };
  const handleLastMove = () => handleSelectPly(historySnapshots.length);

  // Control handlers
  const handleNewGame = () => {
    chessRef.current.newGame();
    syncState();
  };

  const handleReset = () => {
    chessRef.current.reset();
    syncState();
  };

  const handleUndo = () => {
    chessRef.current.undo();
    syncState();
  };

  const handleRedo = () => {
    chessRef.current.redo();
    syncState();
  };

  const handleFlip = () => {
    setOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  };

  const handleLoadFen = (newFen: string) => {
    const res = chessRef.current.load(newFen);
    if (res.success) {
      syncState();
    }
    return res;
  };

  const handleLoadPgn = (newPgn: string) => {
    const res = chessRef.current.loadPgn(newPgn);
    if (res.success) {
      syncState();
    }
    return res;
  };

  const openLoadModal = (tab: 'fen' | 'pgn') => {
    setLoadModalTab(tab);
    setLoadModalOpen(true);
  };

  const handlePlayCandidate = (san: string) => {
    if (currentPly < historySnapshots.length) {
      chessRef.current.truncateToPly(currentPly);
    }
    const res = chessRef.current.makeSanMove(san);
    if (res.success) {
      syncState();
    }
  };

  const handleLoadOpening = (record: OpeningRecord) => {
    const res = chessRef.current.loadMoveSequence(record.movesSan);
    if (res.success) {
      syncState();
    }
  };

  const handleReturnToBook = (ply: number) => {
    const res = chessRef.current.truncateToPly(ply);
    if (res.success) {
      syncState();
    }
  };

  const handleToggleEngine = () => {
    setIsEngineEnabled((prev) => {
      const next = !prev;
      if (next) {
        stockfishEngine.init().then(() => {
          stockfishEngine.evaluatePosition(fen, { forceImmediate: true });
        });
      } else {
        stockfishEngine.stop();
      }
      return next;
    });
  };

  const handleToggleBestMoveArrow = () => {
    setShowBestMoveArrow((prev) => !prev);
  };

  const handleChangeDepth = (depth: number) => {
    stockfishEngine.setDepth(depth);
  };

  const handleChangeMultiPv = (multiPv: number) => {
    stockfishEngine.setMultiPv(multiPv);
  };

  const handlePlayEngineMove = (san: string) => {
    handlePlayCandidate(san);
  };

  const isViewingHistory = currentPly < historySnapshots.length;

  return (
    <div
      className={`min-h-[calc(100vh-64px)] transition-colors duration-200 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight">Interactive Board</h2>
            <p className="text-xs text-slate-400">
              Legal move validation • FEN/PGN • Castling • En Passant • History Navigation
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className={`p-2 rounded-lg border text-xs flex items-center gap-1.5 transition ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-white border-slate-300 text-slate-700 hover:text-slate-950'
              }`}
              title="Toggle Light/Dark Theme"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span className="hidden sm:inline capitalize">{theme}</span>
            </button>
          </div>
        </div>

        {/* Main Grid: Board + Information & Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Chessboard & Status (7 cols on Desktop) */}
          <div className="lg:col-span-7 flex flex-col items-center space-y-3">
            {/* Game Status Badge */}
            <GameStatusBadge
              status={gameStatus}
              isViewingHistory={isViewingHistory}
              historyPly={currentPly}
              recognizedOpening={recognizedOpening}
            />

            {/* Chessboard Area with Vertical Evaluation Bar */}
            <div className="w-full flex items-stretch justify-center gap-2 sm:gap-3">
              {/* Evaluation Bar alongside the board */}
              <div className="flex items-stretch shrink-0 py-1">
                <EvaluationBar
                  whitePercentage={engineState.evaluationBar.whitePercentage}
                  displayScore={engineState.evaluationBar.displayScore}
                  orientation={orientation}
                  isEnabled={isEngineEnabled}
                  theme={theme}
                />
              </div>

              {/* Chessground Board */}
              <div className="flex-1 max-w-[500px]">
                <ChessgroundBoard
                  fen={fen}
                  orientation={orientation}
                  turnColor={turnColor}
                  dests={dests}
                  check={check}
                  lastMove={lastMove}
                  interactive={!isViewingHistory && !gameStatus.isGameOver}
                  onMove={handleMove}
                  shapes={boardShapes}
                />
              </div>
            </div>

            {/* Active FEN Display Bar */}
            <div
              className={`w-full p-2.5 rounded-lg border text-[11px] font-mono break-all select-all flex items-center justify-between gap-2 ${
                theme === 'dark'
                  ? 'bg-slate-900/90 border-slate-800 text-slate-300'
                  : 'bg-white border-slate-200 text-slate-700'
              }`}
            >
              <div className="truncate">
                <span className="font-bold text-slate-400 mr-1.5">FEN:</span>
                {fen}
              </div>
            </div>

            {/* Engine Analysis Panel */}
            <div className="w-full">
              <EngineAnalysisPanel
                engineState={engineState}
                isEngineEnabled={isEngineEnabled}
                showBestMoveArrow={showBestMoveArrow}
                onToggleEngine={handleToggleEngine}
                onToggleBestMoveArrow={handleToggleBestMoveArrow}
                onChangeDepth={handleChangeDepth}
                onChangeMultiPv={handleChangeMultiPv}
                onPlayMove={handlePlayEngineMove}
                theme={theme}
              />
            </div>
          </div>

          {/* Right Column: Opening Explorer / Move History & Controls (5 cols on Desktop) */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            {/* Board Controls */}
            <BoardControls
              onNewGame={handleNewGame}
              onReset={handleReset}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onFlip={handleFlip}
              onOpenLoadModal={openLoadModal}
              getFen={() => chessRef.current.getFen()}
              getPgn={() => chessRef.current.getPgn()}
              canUndo={chessRef.current.canUndo()}
              canRedo={chessRef.current.canRedo()}
            />

            {/* Sidebar View Switcher Tabs */}
            <div
              className={`flex items-center gap-1.5 p-1 rounded-xl border text-xs font-semibold ${
                theme === 'dark'
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-white border-slate-200'
              }`}
            >
              <button
                onClick={() => setSidebarTab('explorer')}
                className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                  sidebarTab === 'explorer'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen size={14} />
                <span>Opening Explorer</span>
              </button>

              <button
                onClick={() => setSidebarTab('history')}
                className={`flex-1 py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition ${
                  sidebarTab === 'history'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : theme === 'dark'
                    ? 'text-slate-400 hover:text-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HistoryIcon size={14} />
                <span>Move History</span>
                <span
                  className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                    sidebarTab === 'history'
                      ? 'bg-emerald-700 text-emerald-100'
                      : theme === 'dark'
                      ? 'bg-slate-800 text-slate-400'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {historySnapshots.length}
                </span>
              </button>
            </div>

            {/* Tab Body: Opening Explorer Panel or Move History Table */}
            {sidebarTab === 'explorer' ? (
              <OpeningExplorerPanel
                currentFen={fen}
                currentEpd={chessRef.current.getEpd()}
                playedMovesSan={historySnapshots.slice(0, currentPly).map((s) => s.san)}
                currentPly={currentPly}
                recognizedOpening={recognizedOpening}
                onPlayCandidate={handlePlayCandidate}
                onLoadOpening={handleLoadOpening}
                onReturnToBook={handleReturnToBook}
                onSelectPly={handleSelectPly}
                theme={theme}
              />
            ) : (
              <div className="flex-1 min-h-[300px]">
                <MoveHistory
                  snapshots={historySnapshots}
                  currentPly={currentPly}
                  onSelectPly={handleSelectPly}
                  onFirst={handleFirstMove}
                  onPrev={handlePrevMove}
                  onNext={handleNextMove}
                  onLast={handleLastMove}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Promotion Selection Modal */}
      <PromotionModal
        isOpen={pendingPromotion !== null}
        color={turnColor}
        onSelect={handleSelectPromotion}
        onCancel={() => {
          setPendingPromotion(null);
          syncState();
        }}
      />

      {/* Load FEN / PGN Modal */}
      <LoadPositionModal
        isOpen={loadModalOpen}
        initialTab={loadModalTab}
        onClose={() => setLoadModalOpen(false)}
        onLoadFen={handleLoadFen}
        onLoadPgn={handleLoadPgn}
      />
    </div>
  );
};
