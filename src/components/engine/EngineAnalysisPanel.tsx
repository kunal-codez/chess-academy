import React from 'react';
import {
  Power,
  Activity,
  ArrowUpRight,
  Loader2,
  Play
} from 'lucide-react';
import type { EngineEvaluationState } from '../../services/StockfishService.ts';

interface EngineAnalysisPanelProps {
  engineState: EngineEvaluationState;
  isEngineEnabled: boolean;
  showBestMoveArrow: boolean;
  onToggleEngine: () => void;
  onToggleBestMoveArrow: () => void;
  onChangeDepth: (depth: number) => void;
  onChangeMultiPv: (multiPv: number) => void;
  onPlayMove?: (san: string) => void;
  theme?: 'dark' | 'light';
}

const DEPTH_PRESETS = [
  { label: 'Quick (12)', value: 12 },
  { label: 'Standard (16)', value: 16 },
  { label: 'Deep (20)', value: 20 }
];

const MULTIPV_PRESETS = [1, 2, 3];

export const EngineAnalysisPanel: React.FC<EngineAnalysisPanelProps> = ({
  engineState,
  isEngineEnabled,
  showBestMoveArrow,
  onToggleEngine,
  onToggleBestMoveArrow,
  onChangeDepth,
  onChangeMultiPv,
  onPlayMove,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  return (
    <div
      className={`rounded-xl border flex flex-col overflow-hidden transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Top Header & Master Toggle */}
      <div
        className={`p-3 border-b flex items-center justify-between gap-3 text-xs ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleEngine}
            className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition ${
              isEngineEnabled
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                : isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
            title={isEngineEnabled ? 'Disable Engine Analysis' : 'Enable Stockfish Engine'}
          >
            <Power size={13} />
            <span>{isEngineEnabled ? 'Engine ON' : 'Engine OFF'}</span>
          </button>

          {isEngineEnabled && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              {engineState.isEvaluating ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Depth {engineState.depth}/{engineState.targetDepth}</span>
                </span>
              ) : engineState.status === 'initializing' ? (
                <span className="flex items-center gap-1 text-amber-400">
                  <Loader2 size={12} className="animate-spin" />
                  <span>Initializing WASM...</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-400">
                  <Activity size={12} className="text-emerald-500" />
                  <span>Depth {engineState.targetDepth}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Arrow Overlay Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleBestMoveArrow}
            disabled={!isEngineEnabled}
            className={`px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition ${
              !isEngineEnabled
                ? 'opacity-40 cursor-not-allowed'
                : showBestMoveArrow
                ? isDark
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : isDark
                ? 'bg-slate-800 text-slate-400 hover:text-slate-200'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
            title="Toggle recommended move arrow on the board"
          >
            <ArrowUpRight size={13} />
            <span className="hidden sm:inline">Best Move Arrow</span>
          </button>
        </div>
      </div>

      {/* Engine Configuration Strip (When Enabled) */}
      {isEngineEnabled && (
        <div
          className={`px-3 py-2 border-b flex flex-wrap items-center justify-between gap-3 text-xs ${
            isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50/50 border-slate-200'
          }`}
        >
          {/* Depth Presets */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 mr-1">Depth:</span>
            {DEPTH_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => onChangeDepth(preset.value)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  engineState.targetDepth === preset.value
                    ? 'bg-emerald-600 text-white font-semibold'
                    : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* MultiPV Lines Selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400 mr-1">Lines:</span>
            {MULTIPV_PRESETS.map((count) => (
              <button
                key={count}
                onClick={() => onChangeMultiPv(count)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition ${
                  engineState.multiPv === count
                    ? 'bg-emerald-600 text-white font-semibold'
                    : isDark
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {count} {count === 1 ? 'Line' : 'Lines'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Analysis Body */}
      <div className="p-3 flex-1 min-h-[140px] max-h-[300px] overflow-y-auto">
        {!isEngineEnabled ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <Power size={24} className="mb-2 text-slate-500 opacity-60" />
            <p className="text-xs font-medium">Local Stockfish Engine is paused.</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              Toggle the engine ON above to evaluate positions in real-time with zero cloud APIs.
            </p>
          </div>
        ) : engineState.lines.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <Loader2 size={20} className="animate-spin text-emerald-500 mb-2" />
            <p className="text-xs">Computing candidate lines with Stockfish WebAssembly...</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {engineState.lines.map((line) => {
              const isWhiteAhead = (line.normalizedCp || 0) > 20 || (line.normalizedMate || 0) > 0;
              const isBlackAhead = (line.normalizedCp || 0) < -20 || (line.normalizedMate || 0) < 0;
              const isMate = line.scoreMate !== null;

              return (
                <div
                  key={line.multipv}
                  className={`p-2.5 rounded-lg border flex flex-col gap-1.5 transition ${
                    isDark
                      ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        #{line.multipv}
                      </span>

                      {/* Evaluation Score Pill */}
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                          isMate
                            ? 'bg-purple-600 text-white'
                            : isWhiteAhead
                            ? 'bg-emerald-600 text-white'
                            : isBlackAhead
                            ? 'bg-rose-600 text-white'
                            : isDark
                            ? 'bg-slate-800 text-slate-200'
                            : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {line.formattedScore}
                      </span>

                      {/* First SAN move action */}
                      {line.bestMoveSan && (
                        <button
                          onClick={() => onPlayMove?.(line.bestMoveSan!)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold transition ${
                            isDark
                              ? 'bg-slate-800 hover:bg-emerald-600 hover:text-white text-emerald-400'
                              : 'bg-slate-200 hover:bg-emerald-600 hover:text-white text-emerald-700'
                          }`}
                          title={`Play ${line.bestMoveSan}`}
                        >
                          <Play size={10} fill="currentColor" />
                          <span>{line.bestMoveSan}</span>
                        </button>
                      )}
                    </div>

                    {/* Nodes / NPS / Depth Stats */}
                    <div className="text-[10px] font-mono text-slate-400">
                      {line.nps ? `${Math.round(line.nps / 1000)}k nps` : `depth ${line.depth}`}
                    </div>
                  </div>

                  {/* Formatted Continuation Line */}
                  <div className="text-xs font-mono text-slate-300 break-words leading-relaxed pl-0.5">
                    {line.formattedPgn || line.pvSan.join(' ')}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
