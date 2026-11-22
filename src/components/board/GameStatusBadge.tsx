import React from 'react';
import type { GameStatus } from '../../services/ChessService.ts';
import { AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface GameStatusBadgeProps {
  status: GameStatus;
  isViewingHistory: boolean;
  historyPly: number;
}

export const GameStatusBadge: React.FC<GameStatusBadgeProps> = ({
  status,
  isViewingHistory,
  historyPly
}) => {
  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm flex flex-wrap items-center justify-between gap-3">
      {/* Turn & Status Indicator */}
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

      {/* Description & Move Count */}
      <div className="flex items-center gap-3 text-xs text-slate-400">
        <span className="font-medium text-slate-300 hidden sm:inline">
          {status.description}
        </span>
        <span className="font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
          Move {status.fullmoveNumber}
        </span>
      </div>
    </div>
  );
};
