import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Bookmark,
  Plus,
  Download,
  Upload,
  Trash2,
  Edit3,
  Copy,
  Check,
  FileText,
  Play,
  AlertCircle
} from 'lucide-react';
import { repertoireService } from '../../services/RepertoireService.ts';
import { openingDatabase } from '../../services/OpeningDatabaseService.ts';
import type { Repertoire, RepertoireLine } from '../../types/repertoire.types.ts';

interface RepertoirePanelProps {
  currentFen: string;
  currentEpd: string;
  playedMovesSan: string[];
  currentPly: number;
  onLoadLine: (line: RepertoireLine) => void;
  theme?: 'dark' | 'light';
}

export const RepertoirePanel: React.FC<RepertoirePanelProps> = ({
  currentEpd,
  playedMovesSan,
  onLoadLine,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Repertoires list & active selection
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [selectedRepId, setSelectedRepId] = useState<string>('');
  const [activeLines, setActiveLines] = useState<RepertoireLine[]>([]);
  const [colorFilter, setColorFilter] = useState<'all' | 'white' | 'black'>('all');

  // Modals & form state
  const [isCreateRepModalOpen, setIsCreateRepModalOpen] = useState(false);
  const [newRepName, setNewRepName] = useState('');
  const [newRepColor, setNewRepColor] = useState<'white' | 'black'>('white');
  const [newRepDesc, setNewRepDesc] = useState('');

  const [isSaveLineModalOpen, setIsSaveLineModalOpen] = useState(false);
  const [saveLineName, setSaveLineName] = useState('');
  const [saveLineNotes, setSaveLineNotes] = useState('');
  const [saveLineTagInput, setSaveLineTagInput] = useState('');
  const [saveLineError, setSaveLineError] = useState<string | null>(null);

  // Edit Line state
  const [editingLine, setEditingLine] = useState<RepertoireLine | null>(null);
  const [editLineName, setEditLineName] = useState('');
  const [editLineNotes, setEditLineNotes] = useState('');

  // Copy feedback
  const [copiedLineId, setCopiedLineId] = useState<string | null>(null);

  // Load repertoires on mount
  const refreshRepertoires = async () => {
    const list = await repertoireService.getAllRepertoires();
    setRepertoires(list);
    if (list.length > 0 && !selectedRepId) {
      setSelectedRepId(list[0].id);
    }
  };

  useEffect(() => {
    refreshRepertoires();
  }, []);

  // Load lines when selected repertoire changes
  useEffect(() => {
    if (selectedRepId) {
      repertoireService.getLinesByRepertoire(selectedRepId).then((lines) => {
        setActiveLines(lines);
      });
    } else {
      setActiveLines([]);
    }
  }, [selectedRepId]);

  // Filtered repertoires
  const filteredRepertoires = useMemo(() => {
    if (colorFilter === 'all') return repertoires;
    return repertoires.filter((r) => r.color === colorFilter);
  }, [repertoires, colorFilter]);

  // Selected repertoire object
  const activeRepertoire = useMemo(() => {
    return repertoires.find((r) => r.id === selectedRepId);
  }, [repertoires, selectedRepId]);

  // Auto-detected opening name for current board position
  const currentDetected = useMemo(() => {
    if (playedMovesSan.length === 0) return null;
    return openingDatabase.recognize(playedMovesSan, currentEpd);
  }, [playedMovesSan, currentEpd]);

  // Open Save Line Modal
  const handleOpenSaveModal = () => {
    if (playedMovesSan.length === 0) return;
    setSaveLineError(null);
    setSaveLineNotes('');
    setSaveLineTagInput('');

    if (currentDetected?.matched && currentDetected.opening) {
      setSaveLineName(currentDetected.opening.name);
    } else {
      setSaveLineName(`Line: ${playedMovesSan.slice(0, 4).join(' ')}${playedMovesSan.length > 4 ? '...' : ''}`);
    }
    setIsSaveLineModalOpen(true);
  };

  // Submit Save Line
  const handleSaveLineSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRepId) return;

    const tags = saveLineTagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const res = await repertoireService.saveLine(selectedRepId, {
      name: saveLineName,
      movesSan: playedMovesSan,
      notes: saveLineNotes,
      tags
    });

    if (res.success) {
      setIsSaveLineModalOpen(false);
      setSaveLineError(null);
      const updatedLines = await repertoireService.getLinesByRepertoire(selectedRepId);
      setActiveLines(updatedLines);
    } else {
      setSaveLineError(res.error || 'Failed to save line.');
    }
  };

  // Submit Create Repertoire
  const handleCreateRepertoire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepName.trim()) return;

    const created = await repertoireService.createRepertoire({
      name: newRepName,
      color: newRepColor,
      description: newRepDesc
    });

    setNewRepName('');
    setNewRepDesc('');
    setIsCreateRepModalOpen(false);

    await refreshRepertoires();
    setSelectedRepId(created.id);
  };

  // Delete active repertoire
  const handleDeleteRepertoire = async () => {
    if (!activeRepertoire) return;
    const confirmMsg = `Are you sure you want to delete "${activeRepertoire.name}" and all ${activeLines.length} saved lines?`;
    if (window.confirm(confirmMsg)) {
      await repertoireService.deleteRepertoire(activeRepertoire.id);
      const remaining = await repertoireService.getAllRepertoires();
      setRepertoires(remaining);
      setSelectedRepId(remaining.length > 0 ? remaining[0].id : '');
    }
  };

  // Delete line
  const handleDeleteLine = async (lineId: string, lineName: string) => {
    if (window.confirm(`Delete line "${lineName}"?`)) {
      await repertoireService.deleteLine(lineId);
      if (selectedRepId) {
        const lines = await repertoireService.getLinesByRepertoire(selectedRepId);
        setActiveLines(lines);
      }
    }
  };

  // Edit line modal open
  const handleStartEditLine = (line: RepertoireLine) => {
    setEditingLine(line);
    setEditLineName(line.name);
    setEditLineNotes(line.notes || '');
  };

  // Save line edit
  const handleSaveEditLine = async () => {
    if (!editingLine) return;
    await repertoireService.updateLine(editingLine.id, {
      name: editLineName,
      notes: editLineNotes
    });
    setEditingLine(null);
    if (selectedRepId) {
      const lines = await repertoireService.getLinesByRepertoire(selectedRepId);
      setActiveLines(lines);
    }
  };

  // Copy PGN to clipboard
  const handleCopyPgn = (line: RepertoireLine) => {
    const pgn = repertoireService.exportLineToPgn(line, activeRepertoire?.name);
    navigator.clipboard.writeText(pgn).then(() => {
      setCopiedLineId(line.id);
      setTimeout(() => setCopiedLineId(null), 2000);
    });
  };

  // Export repertoire to JSON file
  const handleExportJson = async () => {
    if (!activeRepertoire) return;
    const jsonStr = await repertoireService.exportRepertoireToJson(activeRepertoire.id);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeRepertoire.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_repertoire.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import repertoire from JSON file
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const content = evt.target?.result as string;
      if (content) {
        const res = await repertoireService.importRepertoireFromJson(content);
        if (res.success && res.repertoire) {
          await refreshRepertoires();
          setSelectedRepId(res.repertoire.id);
          alert(`Successfully imported "${res.repertoire.name}" with ${res.importedLinesCount} lines!`);
        } else {
          alert(`Import failed: ${res.error || 'Invalid file format'}`);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div
      className={`rounded-xl border flex flex-col h-[520px] overflow-hidden transition-colors ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Top Header: Controls & Repertoire Selector */}
      <div
        className={`p-3 border-b flex flex-col gap-2.5 ${
          isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          {/* Side Color Pills */}
          <div className="flex items-center gap-1">
            {(['all', 'white', 'black'] as const).map((col) => (
              <button
                key={col}
                onClick={() => setColorFilter(col)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                  colorFilter === col
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : isDark
                    ? 'bg-slate-800 text-slate-400 hover:text-slate-200'
                    : 'bg-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                {col}
              </button>
            ))}
          </div>

          {/* New Repertoire & Import / Export */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsCreateRepModalOpen(true)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition shadow-sm"
              title="Create New Repertoire"
            >
              <Plus size={13} />
              <span>New</span>
            </button>

            {activeRepertoire && (
              <button
                onClick={handleExportJson}
                className={`p-1.5 rounded-lg border text-xs transition ${
                  isDark
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                }`}
                title="Export Repertoire JSON"
              >
                <Download size={13} />
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              className={`p-1.5 rounded-lg border text-xs transition ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
              title="Import Repertoire JSON"
            >
              <Upload size={13} />
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFileChange}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>

        {/* Repertoire Dropdown & Active Info */}
        {filteredRepertoires.length > 0 ? (
          <div className="flex items-center gap-2">
            <select
              value={selectedRepId}
              onChange={(e) => setSelectedRepId(e.target.value)}
              className={`flex-1 px-3 py-1.5 rounded-lg border text-xs font-medium outline-none transition ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-slate-100'
                  : 'bg-white border-slate-300 text-slate-900'
              }`}
            >
              {filteredRepertoires.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.color === 'white' ? '⚪' : '⚫'} {r.name} ({activeLines.length} lines)
                </option>
              ))}
            </select>

            {activeRepertoire && (
              <button
                onClick={handleDeleteRepertoire}
                className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition"
                title="Delete this repertoire"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-1">
            No repertoires found. Click &quot;New&quot; above to create your first repertoire!
          </div>
        )}
      </div>

      {/* Save Current Board Line Action Bar */}
      <div
        className={`px-3 py-2 border-b flex items-center justify-between gap-3 text-xs ${
          isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50/50 border-slate-200'
        }`}
      >
        <div className="truncate text-slate-400 text-[11px]">
          {playedMovesSan.length > 0 ? (
            <span>
              Current: <strong className="text-slate-200">{playedMovesSan.length} moves</strong>
              {currentDetected?.opening && ` • ${currentDetected.opening.name}`}
            </span>
          ) : (
            <span>Move pieces on the board to save lines</span>
          )}
        </div>

        <button
          onClick={handleOpenSaveModal}
          disabled={!activeRepertoire || playedMovesSan.length === 0}
          className={`px-3 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
            !activeRepertoire || playedMovesSan.length === 0
              ? 'opacity-40 cursor-not-allowed bg-slate-800 text-slate-500'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
          }`}
          title={
            playedMovesSan.length === 0
              ? 'Play at least one move to save a line'
              : !activeRepertoire
              ? 'Create or select a repertoire first'
              : 'Save current move sequence to repertoire'
          }
        >
          <Bookmark size={12} />
          <span>Save Current Line</span>
        </button>
      </div>

      {/* Saved Lines List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 min-h-0">
        {!activeRepertoire ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Create or select a repertoire to view and save opening variations.
          </div>
        ) : activeLines.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
            <Bookmark size={24} className="mb-2 text-slate-500 opacity-60" />
            <p className="text-xs font-semibold">No lines saved yet in this repertoire.</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-xs">
              Play your favorite opening variations on the interactive board and click &quot;Save Current Line&quot; above!
            </p>
          </div>
        ) : (
          activeLines.map((line) => (
            <div
              key={line.id}
              className={`p-3 flex flex-col gap-1.5 group transition ${
                isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  {line.eco && (
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-emerald-600 text-white shrink-0">
                      {line.eco}
                    </span>
                  )}
                  <h4 className="text-xs font-semibold truncate group-hover:text-emerald-400 transition">
                    {line.name}
                  </h4>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    ({line.movesSan.length} {line.movesSan.length === 1 ? 'ply' : 'plies'})
                  </span>
                </div>

                {/* Line Action Buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onLoadLine(line)}
                    className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition shadow-sm"
                    title="Load this line onto the board"
                  >
                    <Play size={10} fill="currentColor" />
                    <span>Load</span>
                  </button>

                  <button
                    onClick={() => handleCopyPgn(line)}
                    className={`p-1 rounded text-slate-400 hover:text-slate-200 transition ${
                      copiedLineId === line.id ? 'text-emerald-400' : ''
                    }`}
                    title="Copy Line as PGN"
                  >
                    {copiedLineId === line.id ? <Check size={13} /> : <Copy size={13} />}
                  </button>

                  <button
                    onClick={() => handleStartEditLine(line)}
                    className="p-1 rounded text-slate-400 hover:text-slate-200 transition"
                    title="Edit Notes"
                  >
                    <Edit3 size={13} />
                  </button>

                  <button
                    onClick={() => handleDeleteLine(line.id, line.name)}
                    className="p-1 rounded text-rose-400 hover:text-rose-300 transition"
                    title="Delete line"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Moves Preview */}
              <div className="text-[11px] font-mono text-slate-400 truncate">
                {line.movesSan.join(' ')}
              </div>

              {/* Study Notes & Tags */}
              {(line.notes || (line.tags && line.tags.length > 0)) && (
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  {line.notes && (
                    <div className="flex items-center gap-1 text-[11px] text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded truncate max-w-sm">
                      <FileText size={11} className="shrink-0" />
                      <span className="truncate">{line.notes}</span>
                    </div>
                  )}

                  {line.tags?.map((tag) => (
                    <span
                      key={tag}
                      className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                        isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* CREATE REPERTOIRE MODAL */}
      {isCreateRepModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-xl border p-5 shadow-2xl transition ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Bookmark size={16} className="text-emerald-500" />
              <span>Create New Repertoire</span>
            </h3>

            <form onSubmit={handleCreateRepertoire} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Repertoire Title:
                </label>
                <input
                  type="text"
                  required
                  value={newRepName}
                  onChange={(e) => setNewRepName(e.target.value)}
                  placeholder="e.g. My Sicilian Defense Repertoire"
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs outline-none ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Side (Orientation):
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="color"
                      checked={newRepColor === 'white'}
                      onChange={() => setNewRepColor('white')}
                    />
                    <span>⚪ White Repertoire</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="color"
                      checked={newRepColor === 'black'}
                      onChange={() => setNewRepColor('black')}
                    />
                    <span>⚫ Black Repertoire</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Description / Strategy (Optional):
                </label>
                <textarea
                  rows={2}
                  value={newRepDesc}
                  onChange={(e) => setNewRepDesc(e.target.value)}
                  placeholder="Key strategic plans, targets, tactical ideas..."
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs outline-none ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateRepModalOpen(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                >
                  Create Repertoire
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAVE LINE MODAL */}
      {isSaveLineModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-xl border p-5 shadow-2xl transition ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Bookmark size={16} className="text-emerald-500" />
              <span>Save Line to &quot;{activeRepertoire?.name}&quot;</span>
            </h3>

            {saveLineError && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 mb-3">
                <AlertCircle size={14} className="shrink-0" />
                <span>{saveLineError}</span>
              </div>
            )}

            <form onSubmit={handleSaveLineSubmit} className="space-y-3">
              {/* Moves preview */}
              <div
                className={`p-2.5 rounded-lg border text-xs font-mono break-words ${
                  isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-[10px] text-slate-500 mb-1">Move Sequence ({playedMovesSan.length} plies):</div>
                {playedMovesSan.join(' ')}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Line Title:
                </label>
                <input
                  type="text"
                  required
                  value={saveLineName}
                  onChange={(e) => setSaveLineName(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs outline-none ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Study Notes & Strategy:
                </label>
                <textarea
                  rows={2}
                  value={saveLineNotes}
                  onChange={(e) => setSaveLineNotes(e.target.value)}
                  placeholder="e.g. Castle early, watch for d5 break, keep bishop pair..."
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs outline-none ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Tags (comma separated):
                </label>
                <input
                  type="text"
                  value={saveLineTagInput}
                  onChange={(e) => setSaveLineTagInput(e.target.value)}
                  placeholder="e.g. mainline, sharp, gambit"
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs outline-none ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-100 focus:border-emerald-500'
                      : 'bg-white border-slate-300 text-slate-900 focus:border-emerald-600'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSaveLineModalOpen(false)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                >
                  Save Line
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT LINE MODAL */}
      {editingLine && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div
            className={`w-full max-w-md rounded-xl border p-5 shadow-2xl transition ${
              isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
              <Edit3 size={16} className="text-emerald-500" />
              <span>Edit Line Notes</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Line Title:
                </label>
                <input
                  type="text"
                  value={editLineName}
                  onChange={(e) => setEditLineName(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs outline-none ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Study Notes:
                </label>
                <textarea
                  rows={3}
                  value={editLineNotes}
                  onChange={(e) => setEditLineNotes(e.target.value)}
                  className={`w-full px-3 py-1.5 rounded-lg border text-xs outline-none ${
                    isDark
                      ? 'bg-slate-950 border-slate-700 text-slate-100'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLine(null)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                    isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditLine}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
