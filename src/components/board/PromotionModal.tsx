import React from 'react';
import type { PieceSymbol } from 'chess.js';
import { X } from 'lucide-react';

interface PromotionModalProps {
  isOpen: boolean;
  color: 'white' | 'black';
  onSelect: (piece: PieceSymbol) => void;
  onCancel: () => void;
}

export const PromotionModal: React.FC<PromotionModalProps> = ({
  isOpen,
  color,
  onSelect,
  onCancel
}) => {
  if (!isOpen) return null;

  const pieces: { symbol: PieceSymbol; name: string; unicodeWhite: string; unicodeBlack: string }[] = [
    { symbol: 'q', name: 'Queen', unicodeWhite: '♕', unicodeBlack: '♛' },
    { symbol: 'r', name: 'Rook', unicodeWhite: '♖', unicodeBlack: '♜' },
    { symbol: 'b', name: 'Bishop', unicodeWhite: '♗', unicodeBlack: '♝' },
    { symbol: 'n', name: 'Knight', unicodeWhite: '♘', unicodeBlack: '♞' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-2xl max-w-xs w-full text-center relative">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg transition"
          aria-label="Cancel promotion"
        >
          <X size={18} />
        </button>

        <h3 className="text-base font-bold text-white mb-1">Promote Pawn</h3>
        <p className="text-xs text-slate-400 mb-4">Choose a piece to replace your pawn:</p>

        <div className="grid grid-cols-4 gap-2">
          {pieces.map((p) => (
            <button
              key={p.symbol}
              onClick={() => onSelect(p.symbol)}
              className="flex flex-col items-center justify-center p-3 rounded-lg bg-slate-800 hover:bg-amber-600/30 hover:border-amber-500 border border-slate-700 transition duration-150 group"
            >
              <span className="text-3xl filter drop-shadow select-none group-hover:scale-110 transition-transform">
                {color === 'white' ? p.unicodeWhite : p.unicodeBlack}
              </span>
              <span className="text-[11px] font-medium text-slate-300 mt-1 capitalize">
                {p.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
