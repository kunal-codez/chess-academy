import React, { useEffect, useRef } from 'react';
import type { HistorySnapshot } from '../../services/ChessService.ts';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';

interface MoveHistoryProps {
  snapshots: HistorySnapshot[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  snapshots,
  currentPly,
  onSelectPly,
  onFirst,
  onPrev,
  onNext,
  onLast
}) => {
  const activeMoveRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Group snapshots into move pairs (White and Black)
  const moveRows: {
    moveNumber: number;
    white?: HistorySnapshot;
    black?: HistorySnapshot;
  }[] = [];

  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i];
    const rowIdx = Math.floor(i / 2);
    if (!moveRows[rowIdx]) {
      moveRows[rowIdx] = { moveNumber: rowIdx + 1 };
    }
    if (snap.color === 'w') {
      moveRows[rowIdx].white = snap;
    } else {
      moveRows[rowIdx].black = snap;
    }
  }

  // Auto-scroll to active move
  useEffect(() => {
    if (activeMoveRef.current && containerRef.current) {
      activeMoveRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [currentPly]);

  const canGoBack = currentPly > 0;
  const canGoForward = currentPly < snapshots.length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-full shadow-sm">
      {/* Header */}
      <div className="px-3.5 py-2.5 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-200 tracking-wide uppercase">
          Move History
        </h3>
        <span className="text-[11px] font-mono text-slate-400">
          {snapshots.length} {snapshots.length === 1 ? 'ply' : 'plies'}
        </span>
      </div>

      {/* Move List Table */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-2 min-h-[160px] max-h-[300px] sm:max-h-[360px] space-y-1 font-mono text-xs"
      >
        {snapshots.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-8 px-4">
            <span className="text-2xl mb-1">♟</span>
            <p className="text-xs">Initial position</p>
            <p className="text-[11px] text-slate-600 mt-0.5">Moves will appear here as you play</p>
          </div>
        ) : (
          moveRows.map((row) => {
            const isWhiteActive = row.white?.ply === currentPly;
            const isBlackActive = row.black?.ply === currentPly;

            return (
              <div
                key={row.moveNumber}
                className="grid grid-cols-12 gap-1 items-center px-1.5 py-0.5 rounded hover:bg-slate-800/40 text-xs"
              >
                {/* Move Number */}
                <div className="col-span-2 text-slate-500 font-semibold text-[11px]">
                  {row.moveNumber}.
                </div>

                {/* White Move */}
                <div className="col-span-5">
                  {row.white && (
                    <button
                      ref={isWhiteActive ? activeMoveRef : undefined}
                      onClick={() => onSelectPly(row.white!.ply)}
                      className={`w-full text-left px-2 py-1 rounded transition text-xs font-semibold ${
                        isWhiteActive
                          ? 'bg-amber-600/30 text-amber-300 font-bold border border-amber-500/50'
                          : 'text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {row.white.san}
                    </button>
                  )}
                </div>

                {/* Black Move */}
                <div className="col-span-5">
                  {row.black && (
                    <button
                      ref={isBlackActive ? activeMoveRef : undefined}
                      onClick={() => onSelectPly(row.black!.ply)}
                      className={`w-full text-left px-2 py-1 rounded transition text-xs font-semibold ${
                        isBlackActive
                          ? 'bg-amber-600/30 text-amber-300 font-bold border border-amber-500/50'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {row.black.san}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* History Navigation Bar */}
      <div className="p-2 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-1">
        <button
          onClick={onFirst}
          disabled={!canGoBack}
          className="flex-1 flex items-center justify-center p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 transition"
          title="Jump to start"
        >
          <ChevronsLeft size={16} />
        </button>

        <button
          onClick={onPrev}
          disabled={!canGoBack}
          className="flex-1 flex items-center justify-center p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 transition"
          title="Previous move"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          onClick={onNext}
          disabled={!canGoForward}
          className="flex-1 flex items-center justify-center p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 transition"
          title="Next move"
        >
          <ChevronRight size={16} />
        </button>

        <button
          onClick={onLast}
          disabled={!canGoForward}
          className="flex-1 flex items-center justify-center p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 text-slate-300 transition"
          title="Jump to latest position"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};
