import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  GitFork,
  Play,
  RotateCcw,
  ChevronRight,
  Layers,
  Sparkles
} from 'lucide-react';
import type {
  OpeningRecord,
  OpeningRecognitionResult,
  CandidateContinuation
} from '../../types/opening.types.ts';
import { openingTree } from '../../services/OpeningTreeService.ts';
import { openingDatabase } from '../../services/OpeningDatabaseService.ts';

interface OpeningExplorerPanelProps {
  currentFen: string;
  currentEpd: string;
  playedMovesSan: string[];
  currentPly: number;
  recognizedOpening?: OpeningRecognitionResult;
  onPlayCandidate: (san: string) => void;
  onLoadOpening: (record: OpeningRecord) => void;
  onReturnToBook: (ply: number) => void;
  onSelectPly?: (ply: number) => void;
  theme?: 'dark' | 'light';
}

const ECO_VOLUMES = [
  { id: 'ALL', label: 'All', desc: 'All 500 ECO codes' },
  { id: 'A', label: 'A', desc: 'Flank & Irregular Openings' },
  { id: 'B', label: 'B', desc: 'Semi-Open & Sicilian' },
  { id: 'C', label: 'C', desc: 'Open Games & French' },
  { id: 'D', label: 'D', desc: 'Closed Games & Grünfeld' },
  { id: 'E', label: 'E', desc: 'Indian Defenses' }
];

export const OpeningExplorerPanel: React.FC<OpeningExplorerPanelProps> = ({
  currentEpd,
  playedMovesSan,
  currentPly,
  recognizedOpening,
  onPlayCandidate,
  onLoadOpening,
  onReturnToBook,
  onSelectPly,
  theme = 'dark'
}) => {
  const [activeTab, setActiveTab] = useState<'continuations' | 'browse'>('continuations');

  // Search & Browse state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVolume, setSelectedVolume] = useState('ALL');

  // Calculate candidate continuations from tree
  const continuations: CandidateContinuation[] = useMemo(() => {
    return openingTree.getContinuations(playedMovesSan, currentEpd);
  }, [playedMovesSan, currentEpd]);

  // Max descendant count for percentage bar
  const maxDescendantCount = useMemo(() => {
    if (continuations.length === 0) return 1;
    return Math.max(...continuations.map((c) => c.descendantCount), 1);
  }, [continuations]);

  // Deepest book ply if currently out of book
  const deepestBook = useMemo(() => {
    if (continuations.length > 0 || playedMovesSan.length === 0) return null;
    return openingTree.findDeepestBookPly(playedMovesSan);
  }, [continuations, playedMovesSan]);

  // Filtered search results
  const searchResults: OpeningRecord[] = useMemo(() => {
    if (activeTab !== 'browse') return [];

    let ecoPrefix = selectedVolume !== 'ALL' ? selectedVolume : undefined;

    return openingDatabase.search({
      query: searchQuery.trim() || undefined,
      eco: ecoPrefix,
      limit: 50
    });
  }, [activeTab, searchQuery, selectedVolume]);

  const isDark = theme === 'dark';

  return (
    <div
      className={`rounded-xl border flex flex-col h-[520px] overflow-hidden transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Top Explorer Tab Navigation */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b text-xs font-medium ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('continuations')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'continuations'
                ? isDark
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <GitFork size={14} />
            <span>Continuations</span>
            <span
              className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${
                isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {continuations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('browse')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              activeTab === 'browse'
                ? isDark
                  ? 'bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30'
                  : 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                : isDark
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen size={14} />
            <span>Search & Browse</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1">
          <Layers size={13} className="text-emerald-500" />
          <span>3,865 lines</span>
        </div>
      </div>

      {/* TAB 1: CONTINUATIONS TREE */}
      {activeTab === 'continuations' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Header Card: Recognized Opening Position */}
          <div
            className={`p-3 border-b flex flex-col gap-1.5 ${
              isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                {recognizedOpening?.opening?.eco ? (
                  <span className="px-1.5 py-0.5 rounded text-[11px] font-mono font-bold bg-emerald-600 text-white shrink-0">
                    {recognizedOpening.opening.eco}
                  </span>
                ) : (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold shrink-0 ${
                      isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    Start
                  </span>
                )}

                <h3 className="text-xs sm:text-sm font-semibold truncate">
                  {recognizedOpening?.opening?.name ||
                    (playedMovesSan.length === 0
                      ? 'Starting Position'
                      : 'Uncatalogued Position')}
                </h3>
              </div>

              {/* Status Badge */}
              <div className="shrink-0">
                {recognizedOpening?.transposition ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Transposition
                  </span>
                ) : continuations.length > 0 ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    In Book
                  </span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Out of Book
                  </span>
                )}
              </div>
            </div>

            {/* Move History Breadcrumb Strip */}
            {playedMovesSan.length > 0 ? (
              <div className="flex items-center gap-1 overflow-x-auto text-[11px] font-mono text-slate-400 py-0.5 no-scrollbar">
                {playedMovesSan.map((m, idx) => {
                  const ply = idx + 1;
                  const isCurrent = ply === currentPly;
                  const moveNum = Math.ceil(ply / 2);
                  const isWhite = ply % 2 === 1;

                  return (
                    <button
                      key={idx}
                      onClick={() => onSelectPly?.(ply)}
                      className={`hover:underline flex items-center shrink-0 px-1 py-0.5 rounded ${
                        isCurrent
                          ? isDark
                            ? 'bg-slate-800 text-emerald-400 font-bold'
                            : 'bg-emerald-100 text-emerald-800 font-bold'
                          : ''
                      }`}
                    >
                      {isWhite && <span className="text-slate-500 mr-0.5">{moveNum}.</span>}
                      <span>{m}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-[11px] text-slate-400">
                White to move. Choose a candidate book move below or play on the board.
              </p>
            )}
          </div>

          {/* Continuations List Table */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {continuations.length > 0 ? (
              <div className="divide-y divide-slate-800/60">
                <div
                  className={`sticky top-0 z-10 px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider flex items-center justify-between ${
                    isDark ? 'bg-slate-900 text-slate-400' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <div className="w-16">Candidate</div>
                  <div className="flex-1 px-2">Variation / Line</div>
                  <div className="w-20 text-right">Variations</div>
                  <div className="w-8"></div>
                </div>

                {continuations.map((cont, idx) => {
                  const percentage = Math.round(
                    (cont.descendantCount / maxDescendantCount) * 100
                  );
                  const isWhiteTurn = playedMovesSan.length % 2 === 0;

                  return (
                    <div
                      key={cont.san + idx}
                      onClick={() => onPlayCandidate(cont.san)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          onPlayCandidate(cont.san);
                        }
                      }}
                      className={`px-3 py-2.5 flex items-center justify-between cursor-pointer group transition ${
                        isDark
                          ? 'hover:bg-slate-800/80 active:bg-slate-800'
                          : 'hover:bg-slate-50 active:bg-slate-100'
                      }`}
                    >
                      {/* Move SAN */}
                      <div className="w-16 flex items-center gap-1.5 shrink-0">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isWhiteTurn ? 'bg-slate-200' : 'bg-slate-900 border border-slate-600'
                          }`}
                        />
                        <span className="font-mono font-bold text-xs group-hover:text-emerald-400 transition">
                          {cont.san}
                        </span>
                      </div>

                      {/* Line Name / Sample Opening */}
                      <div className="flex-1 px-2 min-w-0">
                        <div className="text-xs truncate font-medium">
                          {cont.openingNames[0] || cont.sampleOpening?.name || 'Theory Line'}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                          {cont.ecoCodes.slice(0, 3).map((code) => (
                            <span
                              key={code}
                              className={`px-1 rounded text-[9px] font-mono ${
                                isDark
                                  ? 'bg-slate-800 text-slate-300'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {code}
                            </span>
                          ))}
                          {cont.ecoCodes.length > 3 && (
                            <span className="text-[9px] text-slate-500">
                              +{cont.ecoCodes.length - 3}
                            </span>
                          )}
                          {cont.isTransposition && (
                            <span className="text-[9px] text-purple-400 ml-1">
                              • transposes
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Descendant Lines Count + Relative Bar */}
                      <div className="w-20 text-right shrink-0">
                        <div className="text-xs font-mono font-semibold">
                          {cont.descendantCount}
                          <span className="text-[10px] text-slate-400 font-normal ml-0.5">
                            {cont.descendantCount === 1 ? 'line' : 'lines'}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 h-1 rounded-full mt-1 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(percentage, 5)}%` }}
                          />
                        </div>
                      </div>

                      {/* Play Action Icon */}
                      <div className="w-8 flex justify-end shrink-0 pl-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPlayCandidate(cont.san);
                          }}
                          className={`p-1 rounded opacity-0 group-hover:opacity-100 transition ${
                            isDark
                              ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30'
                              : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          }`}
                          title={`Play ${cont.san}`}
                        >
                          <Play size={12} fill="currentColor" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* OUT OF BOOK STATE */
              <div className="p-6 text-center flex flex-col items-center justify-center h-full">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                    isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'
                  }`}
                >
                  <Sparkles size={24} />
                </div>
                <h4 className="text-sm font-semibold mb-1">Out of Encyclopedia Book</h4>
                <p className="text-xs text-slate-400 max-w-xs mb-4">
                  The current board sequence has deviated into an uncatalogued line.
                </p>

                {deepestBook && deepestBook.ply > 0 ? (
                  <div
                    className={`w-full max-w-sm p-3 rounded-lg border text-left mb-4 ${
                      isDark
                        ? 'bg-slate-950 border-slate-800 text-slate-300'
                        : 'bg-slate-50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="text-[11px] text-slate-400 mb-1">
                      Last Catalogued Book Position:
                    </div>
                    <div className="text-xs font-semibold text-emerald-400 truncate">
                      {deepestBook.node?.openings[0]?.name ||
                        `Book Move at Ply ${deepestBook.ply}`}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Diverged at Move {Math.ceil((deepestBook.ply + 1) / 2)} (Ply{' '}
                      {deepestBook.ply})
                    </div>
                  </div>
                ) : null}

                {deepestBook && (
                  <button
                    onClick={() => onReturnToBook(deepestBook.ply)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition"
                  >
                    <RotateCcw size={14} />
                    <span>Return to Last Book Move (Ply {deepestBook.ply})</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SEARCH & BROWSE */}
      {activeTab === 'browse' && (
        <div className="flex-1 flex flex-col min-h-0">
          {/* Search Bar + Filter Pills */}
          <div
            className={`p-3 border-b space-y-2.5 ${
              isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/70 border-slate-200'
            }`}
          >
            {/* Search Input */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, variation, or ECO (e.g. Najdorf, Sicilian, B90)..."
                className={`w-full pl-9 pr-3 py-1.5 rounded-lg border text-xs outline-none transition ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-100 placeholder-slate-500 focus:border-emerald-500'
                    : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-emerald-600'
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs px-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* ECO Volume Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
              {ECO_VOLUMES.map((vol) => {
                const isSelected = selectedVolume === vol.id;
                return (
                  <button
                    key={vol.id}
                    onClick={() => setSelectedVolume(vol.id)}
                    title={vol.desc}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium shrink-0 transition ${
                      isSelected
                        ? 'bg-emerald-600 text-white font-semibold'
                        : isDark
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                    }`}
                  >
                    {vol.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 min-h-0">
            {searchResults.length > 0 ? (
              searchResults.map((rec) => (
                <div
                  key={rec.id}
                  className={`p-3 flex items-center justify-between gap-3 group transition ${
                    isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-600/90 text-white shrink-0">
                        {rec.eco}
                      </span>
                      <h4 className="text-xs font-semibold truncate group-hover:text-emerald-400 transition">
                        {rec.name}
                      </h4>
                    </div>

                    <div className="text-[11px] font-mono text-slate-400 truncate">
                      {rec.pgn}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                      <span>{rec.family}</span>
                      <span>•</span>
                      <span>{rec.plyCount} plies</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onLoadOpening(rec)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium shrink-0 flex items-center gap-1 transition ${
                      isDark
                        ? 'bg-slate-800 text-emerald-400 hover:bg-emerald-600 hover:text-white border border-slate-700'
                        : 'bg-slate-100 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-slate-300'
                    }`}
                    title="Load complete opening line onto the interactive board"
                  >
                    <span>Load</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-400">
                No openings found matching your criteria. Try adjusting the query or ECO volume filter.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
