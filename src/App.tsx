import React from 'react';
import { InteractiveChessArena } from './components/board/InteractiveChessArena.tsx';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl select-none">♟</span>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              Chess Opening Academy
            </h1>
            <p className="text-[11px] text-slate-400">
              Interactive Board & Controls Engine — Strict ₹0 Budget
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="text-[11px] bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 px-2.5 py-0.5 rounded-full font-mono font-medium">
            Budget: ₹0.00
          </span>
          <span className="text-[11px] bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-0.5 rounded font-mono hidden sm:inline">
            GPL-3.0
          </span>
        </div>
      </header>

      {/* Main Interactive Chess Area */}
      <main className="flex-1">
        <InteractiveChessArena />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 px-6 py-2.5 text-center text-[11px] text-slate-500">
        Chess Rules: chess.js • Board Viewport: Chessground (Lichess) • Pure Client-Side Architecture
      </footer>
    </div>
  );
};

export default App;
