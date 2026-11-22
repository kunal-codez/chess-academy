import React from 'react';

interface EvaluationBarProps {
  whitePercentage: number;     // 0 to 100
  displayScore: string;        // e.g. "+0.4", "-1.8", "M2"
  orientation: 'white' | 'black';
  isEnabled: boolean;
  theme?: 'dark' | 'light';
}

export const EvaluationBar: React.FC<EvaluationBarProps> = ({
  whitePercentage,
  displayScore,
  orientation,
  isEnabled,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';

  // If engine is disabled, show neutral 50% split with subtle appearance
  const effectivePercentage = isEnabled ? whitePercentage : 50;

  // Determine top/bottom fill based on board orientation
  // When orientation is 'white': White is at bottom, Black is at top.
  // When orientation is 'black': Black is at bottom, White is at top.
  const whiteHeight = orientation === 'white' ? effectivePercentage : 100 - effectivePercentage;

  // Determine score label position (place in whichever section is larger)
  const isWhiteDominant = whitePercentage >= 50;
  const isWhiteAtBottom = orientation === 'white';
  const showScoreInWhite = isWhiteAtBottom ? isWhiteDominant : !isWhiteDominant;

  return (
    <div
      className={`relative w-7 sm:w-8 h-full min-h-[320px] max-h-[500px] rounded-lg overflow-hidden border flex flex-col select-none transition-colors ${
        isDark ? 'border-slate-800 bg-slate-900 shadow-md' : 'border-slate-300 bg-slate-200 shadow-sm'
      }`}
      title={isEnabled ? `Stockfish Evaluation: ${displayScore} (${whitePercentage}% White advantage)` : 'Engine is OFF'}
    >
      {/* Black's Portion (Top when White orientation, Bottom when Black orientation) */}
      <div
        className={`w-full transition-all duration-300 ease-out flex items-center justify-center relative ${
          orientation === 'white' ? 'bg-slate-900' : 'bg-slate-100'
        }`}
        style={{ height: `${100 - whiteHeight}%` }}
      >
        {!showScoreInWhite && isEnabled && (
          <span
            className={`text-[10px] sm:text-xs font-mono font-bold px-1 py-0.5 rounded ${
              orientation === 'white' ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            {displayScore}
          </span>
        )}
      </div>

      {/* White's Portion (Bottom when White orientation, Top when Black orientation) */}
      <div
        className={`w-full transition-all duration-300 ease-out flex items-center justify-center relative ${
          orientation === 'white' ? 'bg-slate-100' : 'bg-slate-900'
        }`}
        style={{ height: `${whiteHeight}%` }}
      >
        {showScoreInWhite && isEnabled && (
          <span
            className={`text-[10px] sm:text-xs font-mono font-bold px-1 py-0.5 rounded ${
              orientation === 'white' ? 'text-slate-900' : 'text-slate-100'
            }`}
          >
            {displayScore}
          </span>
        )}
      </div>

      {/* Disabled Overlay Tag */}
      {!isEnabled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[9px] uppercase tracking-wider font-bold -rotate-90 text-slate-500">
            OFF
          </span>
        </div>
      )}
    </div>
  );
};
