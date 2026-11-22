import React, { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface LoadPositionModalProps {
  isOpen: boolean;
  initialTab?: 'fen' | 'pgn';
  onClose: () => void;
  onLoadFen: (fen: string) => { success: boolean; error?: string };
  onLoadPgn: (pgn: string) => { success: boolean; error?: string };
}

export const LoadPositionModal: React.FC<LoadPositionModalProps> = ({
  isOpen,
  initialTab = 'fen',
  onClose,
  onLoadFen,
  onLoadPgn
}) => {
  const [tab, setTab] = useState<'fen' | 'pgn'>(initialTab);
  const [inputText, setInputText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLoad = () => {
    setErrorMessage(null);
    if (!inputText.trim()) {
      setErrorMessage('Please enter a FEN or PGN string.');
      return;
    }

    if (tab === 'fen') {
      const res = onLoadFen(inputText.trim());
      if (res.success) {
        setInputText('');
        onClose();
      } else {
        setErrorMessage(res.error || 'Invalid FEN string');
      }
    } else {
      const res = onLoadPgn(inputText.trim());
      if (res.success) {
        setInputText('');
        onClose();
      } else {
        setErrorMessage(res.error || 'Invalid PGN content');
      }
    }
  };

  const presets = [
    {
      name: 'Initial Position',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    },
    {
      name: 'Pawn Promotion Test',
      fen: '8/P7/8/8/8/8/8/4K2k w - - 0 1'
    },
    {
      name: 'Castling Rights Position',
      fen: 'r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1'
    },
    {
      name: 'Italian Game (1.e4 e5 2.Nf3 Nc6 3.Bc4)',
      fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 shadow-2xl max-w-lg w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition"
          aria-label="Close modal"
        >
          <X size={18} />
        </button>

        <h3 className="text-base font-bold text-white mb-3">Load Position / Game</h3>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 mb-4">
          <button
            onClick={() => {
              setTab('fen');
              setErrorMessage(null);
            }}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition ${
              tab === 'fen'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            FEN String
          </button>
          <button
            onClick={() => {
              setTab('pgn');
              setErrorMessage(null);
            }}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition ${
              tab === 'pgn'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            PGN Notation
          </button>
        </div>

        {/* Input Area */}
        <div className="space-y-3">
          <textarea
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              setErrorMessage(null);
            }}
            placeholder={
              tab === 'fen'
                ? 'Paste Forsyth-Edwards Notation (FEN) string here...'
                : 'Paste Portable Game Notation (PGN) here...'
            }
            rows={4}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500 transition"
          />

          {errorMessage && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/60 border border-red-800/80 p-2 rounded-lg">
              <AlertCircle size={14} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Presets for FEN */}
          {tab === 'fen' && (
            <div>
              <p className="text-[11px] text-slate-400 mb-1.5 font-medium">Quick Presets:</p>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setInputText(p.fen);
                      setErrorMessage(null);
                    }}
                    className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded border border-slate-700 transition"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              onClick={handleLoad}
              className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-900 font-bold text-xs transition"
            >
              Load Position
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
