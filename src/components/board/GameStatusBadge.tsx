import React from 'react';
import type { GameStatus } from '../../services/ChessService.ts';
import type { OpeningRecognitionResult } from '../../types/opening.types.ts';
import { AlertCircle, CheckCircle2, ShieldAlert, BookOpen, ArrowRightLeft } from 'lucide-react';

interface GameStatusBadgeProps {
  status: GameStatus;
  isViewingHistory: boolean;
  historyPly: number;
  recognizedOpening?: OpeningRecognitionResult;
}

export const GameStatusBadge: React.FC<GameStatusBadgeProps> = ({
  status,
  isViewingHistory,
  historyPly,
  recognizedOpening
}) => {
  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm space-y-2">
      {/* Top Row: Turn & Status Indicators */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Turn Circle Indicator */}
          <div className="flex items-center gap-2">
            <span
              className={`w-3.5 h-3.5 rounded-full border shadow-sm transition-colors duration-200 ${
                status.turn === 'white'
                  ? 'bg-white border-slate-400'
                  : 'bg-slate-950 border-slate-600'
              }`}
            />
            <span className="font-semibold text-xs sm:text-sm text-slate-100 capitalize">
              {status.turn} to move
            </span>
          </div>

          {/* State Tags */}
          {status.status === 'checkmate' && (
            <span className="flex items-center gap-1 text-xs bg-red-600 text-white font-bold px-2.5 py-0.5 rounded-full shadow">
              <AlertCircle size={13} />
              CHECKMATE
            </span>
          )}

          {status.status === 'check' && (
            <span className="flex items-center gap-1 text-xs bg-amber-600/90 text-white font-bold px-2 py-0.5 rounded-full animate-pulse">
              <ShieldAlert size={13} />
              CHECK
            </span>
          )}

          {status.isGameOver && status.status !== 'checkmate' && (
            <span className="flex items-center gap-1 text-xs bg-sky-800 text-sky-200 font-semibold px-2 py-0.5 rounded-full">
              <CheckCircle2 size={13} />
              DRAW
            </span>
          )}

          {isViewingHistory && (
            <span className="text-xs bg-amber-900/60 text-amber-300 font-mono px-2 py-0.5 rounded border border-amber-800/80">
              Viewing move {historyPly}
            </span>
          )}
        </div>

        {/* Move Count */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="font-medium text-slate-300 hidden sm:inline">
            {status.description}
          </span>
          <span className="font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            Move {status.fullmoveNumber}
          </span>
        </div>
      </div>

      {/* Bottom Row: Recognized Opening Banner */}
      {recognizedOpening?.matched && recognizedOpening.opening && (
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs animate-fadeIn">
          <div className="flex items-center gap-2 truncate pr-2">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[11px] border border-amber-500/30">
              {recognizedOpening.opening.eco}
            </span>
            <span className="font-semibold text-slate-200 truncate" title={recognizedOpening.opening.name}>
              {recognizedOpening.opening.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {recognizedOpening.transposition && (
              <span className="flex items-center gap-1 text-[10px] bg-purple-900/50 text-purple-300 px-1.5 py-0.5 rounded border border-purple-800/60 font-mono">
                <ArrowRightLeft size={10} /> Transposition
              </span>
            )}
            {recognizedOpening.isExactMatch && (
              <span className="flex items-center gap-1 text-[10px] bg-emerald-900/50 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800/60 font-mono">
                <BookOpen size={10} /> Book Line
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
