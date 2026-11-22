import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Play,
  RotateCcw,
  HelpCircle,
  Eye,
  CheckCircle2,
  AlertTriangle,
  X,
  Award,
  Layers,
  ArrowRight,
  BookOpen
} from 'lucide-react';
import { drillSession } from '../../services/DrillSessionService.ts';
import { repertoireService } from '../../services/RepertoireService.ts';
import type { DrillSessionState, DrillMode } from '../../services/DrillSessionService.ts';
import type { Repertoire } from '../../types/repertoire.types.ts';

interface TrainerPanelProps {
  onSwitchToRepertoireTab: () => void;
  onExitDrill: () => void;
  theme?: 'dark' | 'light';
}

interface RepertoireCardData {
  repertoire: Repertoire;
  totalLines: number;
  dueLines: number;
  masteredLines: number;
}

export const TrainerPanel: React.FC<TrainerPanelProps> = ({
  onSwitchToRepertoireTab,
  onExitDrill,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const [drillState, setDrillState] = useState<DrillSessionState>(drillSession.getState());
  const [repertoiresData, setRepertoiresData] = useState<RepertoireCardData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Subscribe to DrillSessionService updates
  useEffect(() => {
    const unsubscribe = drillSession.subscribe((state) => {
      setDrillState(state);
    });
    return unsubscribe;
  }, []);

  // Fetch repertoires and SRS metrics
  const loadRepertoiresStats = async () => {
    setLoading(true);
    const allReps = await repertoireService.getAllRepertoires();
    const cards: RepertoireCardData[] = [];

    for (const rep of allReps) {
      const stats = await drillSession.getRepertoireStats(rep.id);
      cards.push({
        repertoire: rep,
        totalLines: stats.totalLines,
        dueLines: stats.dueLines,
        masteredLines: stats.masteredLines
      });
    }

    setRepertoiresData(cards);
    setLoading(false);
  };

  useEffect(() => {
    if (drillState.status === 'idle') {
      loadRepertoiresStats();
    }
  }, [drillState.status]);

  const handleStartDrill = async (repertoire: Repertoire, mode: DrillMode) => {
    await drillSession.startSession(repertoire, mode);
  };

  const handleHint = () => {
    drillSession.provideHint();
  };

  const handleSkip = async () => {
    await drillSession.skipLine();
  };

  const handleRestartLine = () => {
    drillSession.restartCurrentLine();
  };

  const handleNextLine = async () => {
    await drillSession.nextLine();
  };

  const handleExit = () => {
    drillSession.exitDrill();
    onExitDrill();
  };

  // ---------------------------------------------------------------------------
  // 1. ACTIVE DRILL HUD VIEW (Drilling or Line Completed)
  // ---------------------------------------------------------------------------
  if (drillState.status === 'drilling' || drillState.status === 'line_completed') {
    const { queue, currentIndex, currentLineState, sessionStats, feedback } = drillState;
    const currentLine = currentLineState?.line;
    const isLineComplete = drillState.status === 'line_completed';
    const progressPercent = queue.length > 0 ? Math.round(((currentIndex + (isLineComplete ? 1 : 0)) / queue.length) * 100) : 0;

    return (
      <div
        className={`flex flex-col h-full rounded-2xl border p-4 sm:p-5 shadow-sm space-y-4 ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
              <GraduationCap size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded uppercase tracking-wider bg-slate-800 text-slate-300">
                  {drillState.repertoire?.color}
                </span>
                <h3 className="text-sm font-bold truncate max-w-[200px] sm:max-w-[280px]">
                  {drillState.repertoire?.name}
                </h3>
              </div>
              <p className="text-[11px] text-slate-400">
                Line {currentIndex + 1} of {queue.length} ({drillState.mode === 'due' ? 'Due Review' : 'Practice All'})
              </p>
            </div>
          </div>

          <button
            onClick={handleExit}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition ${
              isDark
                ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-900/50'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-rose-600'
            }`}
            title="Exit Drill Session"
          >
            <X size={16} />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full space-y-1">
          <div className="flex justify-between text-[11px] font-medium text-slate-400">
            <span>Session Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-3 gap-2">
          <div className={`p-2.5 rounded-xl border text-center ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Mistakes</span>
            <span className={`text-base font-bold ${currentLineState?.mistakes ? 'text-rose-400' : 'text-slate-200'}`}>
              {currentLineState?.mistakes || 0}
            </span>
          </div>
          <div className={`p-2.5 rounded-xl border text-center ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Hints</span>
            <span className={`text-base font-bold ${currentLineState?.hintsUsed ? 'text-amber-400' : 'text-slate-200'}`}>
              {currentLineState?.hintsUsed || 0}
            </span>
          </div>
          <div className={`p-2.5 rounded-xl border text-center ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Accuracy</span>
            <span className="text-base font-bold text-emerald-400">
              {sessionStats.accuracy}%
            </span>
          </div>
        </div>

        {/* Feedback Alert Banner */}
        {feedback.message && (
          <div
            className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs transition-all ${
              feedback.type === 'error'
                ? 'bg-rose-950/40 border-rose-800/80 text-rose-300'
                : feedback.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                : 'bg-sky-950/40 border-sky-800/80 text-sky-300'
            }`}
          >
            {feedback.type === 'error' && <AlertTriangle size={16} className="text-rose-400 flex-shrink-0" />}
            {feedback.type === 'success' && <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />}
            {feedback.type === 'info' && <Layers size={16} className="text-sky-400 flex-shrink-0" />}
            <span className="font-medium">{feedback.message}</span>
          </div>
        )}

        {/* Drill Line Card / Completion Card */}
        {isLineComplete ? (
          <div className={`p-4 rounded-xl border space-y-3 ${isDark ? 'bg-emerald-950/20 border-emerald-800/60' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-600/30 text-emerald-300 border border-emerald-500/30">
                {currentLine?.eco || 'Line Complete'}
              </span>
              <span className="text-xs text-emerald-400 font-medium">
                Interval: {currentLineState?.completedResult?.intervalDays}d (Reps: {currentLineState?.completedResult?.repetitions})
              </span>
            </div>

            <h4 className="text-sm font-bold text-emerald-200">
              {currentLine?.name}
            </h4>

            {currentLine?.notes && (
              <div className={`p-2.5 rounded-lg border text-xs italic ${isDark ? 'bg-slate-900/80 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'}`}>
                <span className="font-bold text-slate-400 block not-italic text-[10px] uppercase tracking-wider mb-1">Study Notes:</span>
                "{currentLine.notes}"
              </div>
            )}

            <button
              onClick={handleNextLine}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition"
            >
              <span>{currentIndex + 1 < queue.length ? 'Next Line' : 'View Session Summary'}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        ) : (
          <div className={`p-3.5 rounded-xl border space-y-2 ${isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-400">
                Move {Math.floor(drillState.currentPly / 2) + 1}
              </span>
              <span className="text-[11px] font-medium text-emerald-400">
                {drillSession.isUserTurn() ? 'Your move' : 'Opponent thinking...'}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Play your prepared response on the board. Incorrect moves snap back automatically with no penalties.
            </p>
          </div>
        )}

        {/* Drill Controls (Hint, Solution, Restart) */}
        {!isLineComplete && (
          <div className="grid grid-cols-3 gap-2 pt-2">
            <button
              onClick={handleHint}
              disabled={!drillSession.isUserTurn()}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                isDark
                  ? 'bg-slate-800/90 border-slate-700 text-amber-300 hover:bg-amber-950/30 hover:border-amber-700/60'
                  : 'bg-white border-slate-200 text-amber-600 hover:bg-amber-50'
              } disabled:opacity-50`}
            >
              <HelpCircle size={14} />
              <span>Hint {currentLineState?.hintLevel ? `(${currentLineState.hintLevel}/2)` : ''}</span>
            </button>

            <button
              onClick={handleSkip}
              disabled={!drillSession.isUserTurn()}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                isDark
                  ? 'bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              } disabled:opacity-50`}
            >
              <Eye size={14} />
              <span>Solution</span>
            </button>

            <button
              onClick={handleRestartLine}
              className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                isDark
                  ? 'bg-slate-800/90 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              <RotateCcw size={14} />
              <span>Restart</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. SESSION SUMMARY VIEW (All Lines Completed)
  // ---------------------------------------------------------------------------
  if (drillState.status === 'session_completed') {
    const { sessionStats, repertoire } = drillState;

    return (
      <div
        className={`flex flex-col h-full rounded-2xl border p-5 shadow-sm space-y-5 text-center ${
          isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center shadow-inner">
          <Award size={32} />
        </div>

        <div>
          <h3 className="text-base font-bold">Drill Session Complete!</h3>
          <p className="text-xs text-slate-400 mt-1">
            Excellent work drilling your {repertoire?.name} lines.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-left">
          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Lines Reviewed</span>
            <span className="text-lg font-bold text-slate-100">{sessionStats.completedLines}</span>
          </div>

          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Perfect Lines</span>
            <span className="text-lg font-bold text-emerald-400">{sessionStats.perfectLines}</span>
          </div>

          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Mistakes</span>
            <span className="text-lg font-bold text-rose-400">{sessionStats.totalMistakes}</span>
          </div>

          <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Final Accuracy</span>
            <span className="text-lg font-bold text-emerald-400">{sessionStats.accuracy}%</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          {repertoire && (
            <button
              onClick={() => handleStartDrill(repertoire, drillState.mode)}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
            >
              <RotateCcw size={14} />
              <span>Drill Again</span>
            </button>
          )}

          <button
            onClick={handleExit}
            className={`flex-1 py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>Exit to Trainer</span>
          </button>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. PRE-DRILL DASHBOARD VIEW (Idle Mode)
  // ---------------------------------------------------------------------------
  return (
    <div
      className={`flex flex-col h-full rounded-2xl border p-4 sm:p-5 shadow-sm space-y-4 ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
            <GraduationCap size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold">Repertoire Trainer</h3>
            <p className="text-[11px] text-slate-400">
              Spaced Repetition (SM-2) memory recall drills
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading repertoires...</div>
      ) : repertoiresData.length === 0 ? (
        <div className="py-10 text-center space-y-3">
          <BookOpen size={36} className="mx-auto text-slate-500" />
          <h4 className="text-sm font-bold text-slate-300">No Repertoires Found</h4>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            You haven't created any opening repertoires yet. Save variations in the Repertoire builder first to start drilling.
          </p>
          <button
            onClick={onSwitchToRepertoireTab}
            className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-sm transition"
          >
            <span>Go to Repertoire Builder</span>
            <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {repertoiresData.map(({ repertoire, totalLines, dueLines, masteredLines }) => (
            <div
              key={repertoire.id}
              className={`p-3.5 rounded-xl border space-y-3 transition ${
                isDark ? 'bg-slate-950/60 border-slate-800 hover:border-slate-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                      repertoire.color === 'white'
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                        : 'bg-purple-400/20 text-purple-300 border border-purple-400/30'
                    }`}
                  >
                    {repertoire.color}
                  </span>
                  <h4 className="text-xs font-bold truncate max-w-[180px] sm:max-w-[220px]">
                    {repertoire.name}
                  </h4>
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  {totalLines} {totalLines === 1 ? 'line' : 'lines'}
                </span>
              </div>

              {/* Stats Counters */}
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className={`p-1.5 rounded-lg border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className="text-[10px] text-slate-400 block">Total</span>
                  <span className="font-bold text-slate-200">{totalLines}</span>
                </div>
                <div className={`p-1.5 rounded-lg border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className="text-[10px] text-amber-400 block">Due Now</span>
                  <span className={`font-bold ${dueLines > 0 ? 'text-amber-300' : 'text-slate-400'}`}>
                    {dueLines}
                  </span>
                </div>
                <div className={`p-1.5 rounded-lg border ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                  <span className="text-[10px] text-emerald-400 block">Mastered</span>
                  <span className="font-bold text-emerald-400">{masteredLines}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => handleStartDrill(repertoire, 'due')}
                  disabled={totalLines === 0}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    dueLines > 0
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                      : isDark
                      ? 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                  } disabled:opacity-40`}
                >
                  <Play size={12} />
                  <span>Drill Due ({dueLines})</span>
                </button>

                <button
                  onClick={() => handleStartDrill(repertoire, 'all')}
                  disabled={totalLines === 0}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
                    isDark
                      ? 'bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/30'
                      : 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                  } disabled:opacity-40`}
                >
                  <Layers size={12} />
                  <span>Practice All</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
