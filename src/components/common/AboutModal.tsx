import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Heart, Database, Key as KeyIcon, BookOpen, ExternalLink, Cpu } from 'lucide-react';
import { repertoireService } from '../../services/RepertoireService.ts';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme?: 'dark' | 'light';
}

export const AboutModal: React.FC<AboutModalProps> = ({
  isOpen,
  onClose,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const [repertoireCount, setRepertoireCount] = useState<number>(0);
  const [lineCount, setLineCount] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      repertoireService.getAllRepertoires().then(async (reps) => {
        setRepertoireCount(reps.length);
        let totalLines = 0;
        for (const rep of reps) {
          const lines = await repertoireService.getLinesByRepertoire(rep.id);
          totalLines += lines.length;
        }
        setLineCount(totalLines);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full max-w-lg rounded-2xl border p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold">Chess Opening Academy</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                100% Offline • Free Forever • Zero Tracking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg border transition ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-100'
                : 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
            }`}
            aria-label="Close About Dialog"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Live Local Summary */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Database size={13} />
            <span>Local Storage & Engine Status</span>
          </h4>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] text-slate-400 block">Openings</span>
              <span className="font-bold text-emerald-400">3,865</span>
            </div>
            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] text-slate-400 block">Repertoires</span>
              <span className="font-bold text-slate-200">{repertoireCount}</span>
            </div>
            <div className={`p-2.5 rounded-xl border ${isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-[10px] text-slate-400 block">Saved Lines</span>
              <span className="font-bold text-slate-200">{lineCount}</span>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts Legend */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <KeyIcon size={13} />
            <span>Keyboard Shortcuts</span>
          </h4>
          <div className={`p-3 rounded-xl border text-xs space-y-1.5 font-mono ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans">Step Back / Forward:</span>
              <div className="flex gap-1 font-bold">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">←</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">→</kbd>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans">Jump to Start / End:</span>
              <div className="flex gap-1 font-bold">
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">Home</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">End</kbd>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-sans">Flip Board Perspective:</span>
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] font-bold">F</kbd>
            </div>
          </div>
        </div>

        {/* Open Source Attributions */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Heart size={13} className="text-rose-400" />
            <span>Open-Source Attributions & Licenses</span>
          </h4>
          <div className={`p-3 rounded-xl border text-xs space-y-2 ${isDark ? 'bg-slate-950/60 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-bold text-slate-200 block">Stockfish Engine</span>
                <span className="text-[11px] text-slate-400">Local WebAssembly binary by the Stockfish team (GPL-3.0)</span>
              </div>
              <Cpu size={14} className="text-emerald-400 shrink-0 mt-0.5" />
            </div>

            <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-800/80">
              <div>
                <span className="font-bold text-slate-200 block">Chessground</span>
                <span className="text-[11px] text-slate-400">High-performance chessboard UI by lichess.org (GPL-3.0)</span>
              </div>
              <BookOpen size={14} className="text-emerald-400 shrink-0 mt-0.5" />
            </div>

            <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-800/80">
              <div>
                <span className="font-bold text-slate-200 block">Lichess Chess Openings</span>
                <span className="text-[11px] text-slate-400">Opening classifications dataset (CC0 1.0 Public Domain, DOI: 10.5281/zenodo.19608774)</span>
              </div>
              <ExternalLink size={14} className="text-emerald-400 shrink-0 mt-0.5" />
            </div>

            <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-800/80">
              <div>
                <span className="font-bold text-slate-200 block">Chess.js</span>
                <span className="text-[11px] text-slate-400">Rules validation and FEN/PGN parser by Jeff Hlywa (BSD-2-Clause)</span>
              </div>
              <ShieldCheck size={14} className="text-emerald-400 shrink-0 mt-0.5" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
