import React, { useState } from 'react';
import {
  RotateCcw,
  RotateCw,
  Undo2,
  Redo2,
  Copy,
  Check,
  FileText,
  Upload,
  PlusCircle
} from 'lucide-react';

interface BoardControlsProps {
  onNewGame: () => void;
  onReset: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onFlip: () => void;
  onOpenLoadModal: (tab: 'fen' | 'pgn') => void;
  getFen: () => string;
  getPgn: () => string;
  canUndo: boolean;
  canRedo: boolean;
}

export const BoardControls: React.FC<BoardControlsProps> = ({
  onNewGame,
  onReset,
  onUndo,
  onRedo,
  onFlip,
  onOpenLoadModal,
  getFen,
  getPgn,
  canUndo,
  canRedo
}) => {
  const [copiedType, setCopiedType] = useState<'fen' | 'pgn' | null>(null);

  const handleCopy = async (type: 'fen' | 'pgn') => {
    try {
      const text = type === 'fen' ? getFen() : getPgn();
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      // Fallback for clipboard
      const text = type === 'fen' ? getFen() : getPgn();
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-sm space-y-2.5">
      {/* Primary Action Buttons */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
        <button
          onClick={onNewGame}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-emerald-800/60 hover:bg-emerald-700 text-emerald-200 border border-emerald-700/50 transition active:scale-95 text-center"
          title="Start fresh new game"
        >
          <PlusCircle size={17} />
          <span className="text-[11px] font-medium mt-1">New</span>
        </button>

        <button
          onClick={onReset}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 text-center"
          title="Reset to starting position"
        >
          <RotateCcw size={17} />
          <span className="text-[11px] font-medium mt-1">Reset</span>
        </button>

        <button
          onClick={onUndo}
          disabled={!canUndo}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 border border-slate-700 transition active:scale-95 text-center"
          title="Undo last move"
        >
          <Undo2 size={17} />
          <span className="text-[11px] font-medium mt-1">Undo</span>
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-200 border border-slate-700 transition active:scale-95 text-center"
          title="Redo move"
        >
          <Redo2 size={17} />
          <span className="text-[11px] font-medium mt-1">Redo</span>
        </button>

        <button
          onClick={onFlip}
          className="flex flex-col items-center justify-center py-2 px-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 text-center"
          title="Flip board orientation (White/Black)"
        >
          <RotateCw size={17} />
          <span className="text-[11px] font-medium mt-1">Flip</span>
        </button>
      </div>

      {/* Copy & Import Utilities */}
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2 pt-1 border-t border-slate-800">
        <button
          onClick={() => handleCopy('fen')}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700/80 transition"
          title="Copy FEN string to clipboard"
        >
          {copiedType === 'fen' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span>{copiedType === 'fen' ? 'Copied' : 'FEN'}</span>
        </button>

        <button
          onClick={() => handleCopy('pgn')}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700/80 transition"
          title="Copy PGN game notation to clipboard"
        >
          {copiedType === 'pgn' ? <Check size={14} className="text-emerald-400" /> : <FileText size={14} />}
          <span>{copiedType === 'pgn' ? 'Copied' : 'PGN'}</span>
        </button>

        <button
          onClick={() => onOpenLoadModal('fen')}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700/80 transition"
          title="Load FEN position"
        >
          <Upload size={14} />
          <span>Load FEN</span>
        </button>

        <button
          onClick={() => onOpenLoadModal('pgn')}
          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700/80 transition"
          title="Load PGN game"
        >
          <Upload size={14} />
          <span>Load PGN</span>
        </button>
      </div>
    </div>
  );
};
