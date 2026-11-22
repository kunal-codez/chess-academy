import React from 'react';
import { ChessboardTest } from './components/ChessboardTest';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <span className="text-amber-400 font-black">♟</span> Chess Opening Academy
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Resource Integration & Verification Suite — Zero-Cost Architecture
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 px-2.5 py-1 rounded-full font-mono font-medium">
            Budget: ₹0
          </span>
          <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded font-mono">
            GPL-3.0 Ready
          </span>
        </div>
      </header>

      {/* Main Integration Board View */}
      <main className="flex-1">
        <ChessboardTest />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 px-6 py-3 text-center text-xs text-slate-500">
        Integrating Chess.js • Chessground (Lichess) • Stockfish WebAssembly • Lichess Masters Explorer • Dexie.js (IndexedDB)
      </footer>
    </div>
  );
};

export default App;
