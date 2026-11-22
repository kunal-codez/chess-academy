import { db } from '../db/db.ts';
import { Chess } from 'chess.js';
import { OpeningDatabaseService } from './OpeningDatabaseService.ts';
import type {
  Repertoire,
  RepertoireLine,
  RepertoireExportData
} from '../types/repertoire.types.ts';

export class RepertoireService {
  private static instance: RepertoireService | null = null;

  public static getInstance(): RepertoireService {
    if (!RepertoireService.instance) {
      RepertoireService.instance = new RepertoireService();
    }
    return RepertoireService.instance;
  }

  private generateId(prefix = 'rep'): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // ==========================================
  // REPERTOIRE CRUD
  // ==========================================

  public async createRepertoire(
    arg1: string | { name: string; color: 'white' | 'black'; description?: string },
    colorArg?: 'white' | 'black',
    descriptionArg?: string
  ): Promise<Repertoire> {
    let name: string;
    let color: 'white' | 'black';
    let description: string | undefined;

    if (typeof arg1 === 'object') {
      name = arg1.name;
      color = arg1.color;
      description = arg1.description;
    } else {
      name = arg1;
      color = colorArg || 'white';
      description = descriptionArg;
    }

    const now = new Date().toISOString();
    const repertoire: Repertoire = {
      id: this.generateId('rep'),
      name: name?.trim() || `${color === 'white' ? 'White' : 'Black'} Repertoire`,
      color,
      description: description?.trim() || undefined,
      createdAt: now,
      updatedAt: now
    };

    await db.personalRepertoires.add(repertoire);
    return repertoire;
  }

  public async getAllRepertoires(): Promise<Repertoire[]> {
    return db.personalRepertoires.orderBy('createdAt').reverse().toArray();
  }

  public async getRepertoireById(id: string): Promise<Repertoire | undefined> {
    return db.personalRepertoires.get(id);
  }

  public async getRepertoire(id: string): Promise<Repertoire | undefined> {
    return this.getRepertoireById(id);
  }

  public async getRepertoiresByColor(color: 'white' | 'black'): Promise<Repertoire[]> {
    return db.personalRepertoires
      .where('color')
      .equals(color)
      .reverse()
      .sortBy('createdAt');
  }

  public async updateRepertoire(
    id: string,
    updates: Partial<Pick<Repertoire, 'name' | 'color' | 'description'>>
  ): Promise<Repertoire> {
    const rep = await db.personalRepertoires.get(id);
    if (!rep) {
      throw new Error(`Repertoire with ID ${id} not found.`);
    }

    const updated: Repertoire = {
      ...rep,
      ...updates,
      name: updates.name ? updates.name.trim() : rep.name,
      description: updates.description !== undefined ? updates.description.trim() || undefined : rep.description,
      updatedAt: new Date().toISOString()
    };

    await db.personalRepertoires.put(updated);
    return updated;
  }

  public async deleteRepertoire(id: string): Promise<void> {
    await db.transaction('rw', db.personalRepertoires, db.repertoireLines, async () => {
      // Cascade delete all lines associated with this repertoire
      await db.repertoireLines.where('repertoireId').equals(id).delete();
      await db.personalRepertoires.delete(id);
    });
  }

  // ==========================================
  // REPERTOIRE LINES CRUD
  // ==========================================

  public async saveLine(
    arg1: string | { repertoireId: string; name?: string; movesSan: string[]; notes?: string; tags?: string[] },
    arg2?: {
      name?: string;
      movesSan: string[];
      notes?: string;
      tags?: string[];
    }
  ): Promise<{
    success: boolean;
    line?: RepertoireLine;
    error?: string;
    isDuplicate?: boolean;
  }> {
    let repertoireId: string;
    let lineData: {
      name?: string;
      movesSan: string[];
      notes?: string;
      tags?: string[];
    };

    if (typeof arg1 === 'object') {
      repertoireId = arg1.repertoireId;
      lineData = {
        name: arg1.name,
        movesSan: arg1.movesSan,
        notes: arg1.notes,
        tags: arg1.tags
      };
    } else {
      repertoireId = arg1;
      lineData = arg2 || { movesSan: [] };
    }
    const rep = await db.personalRepertoires.get(repertoireId);
    if (!rep) {
      return { success: false, error: `Repertoire with ID ${repertoireId} does not exist.` };
    }

    if (!lineData.movesSan || lineData.movesSan.length === 0) {
      return { success: false, error: 'Cannot save an empty move sequence. Play at least one move on the board.' };
    }

    // Validate legal move sequence using chess.js
    const chess = new Chess();
    const movesUci: string[] = [];

    for (const san of lineData.movesSan) {
      try {
        const move = chess.move(san);
        if (!move) {
          return { success: false, error: `Illegal move in sequence: "${san}"` };
        }
        movesUci.push(move.from + move.to + (move.promotion || ''));
      } catch (err: any) {
        return { success: false, error: `Move validation error: "${san}" (${err?.message || 'Illegal move'})` };
      }
    }

    const finalFen = chess.fen();
    const finalEpd = chess.fen().split(' ').slice(0, 4).join(' ');

    // Check for duplicate move sequence in this repertoire
    const existingLines = await db.repertoireLines.where('repertoireId').equals(repertoireId).toArray();
    const targetMoveKey = lineData.movesSan.join(' ');
    const duplicate = existingLines.find((l) => l.movesSan.join(' ') === targetMoveKey);

    if (duplicate) {
      return {
        success: false,
        isDuplicate: true,
        error: `This exact move sequence is already saved as "${duplicate.name}" in this repertoire.`
      };
    }

    // Auto-detect opening name and ECO code if not provided
    const recognized = OpeningDatabaseService.getInstance().recognize(lineData.movesSan, finalEpd);
    let name = lineData.name?.trim();
    let eco: string | null = null;

    if (recognized.matched && recognized.opening) {
      eco = recognized.opening.eco;
      if (!name) {
        name = recognized.opening.name;
      }
    } else if (!name) {
      name = `Custom Line (${lineData.movesSan.slice(0, 4).join(' ')}${lineData.movesSan.length > 4 ? '...' : ''})`;
    }

    const now = new Date().toISOString();
    const line: RepertoireLine = {
      id: this.generateId('line'),
      repertoireId,
      name,
      eco,
      movesSan: [...lineData.movesSan],
      movesUci,
      finalFen,
      finalEpd,
      notes: lineData.notes?.trim() || undefined,
      tags: lineData.tags && lineData.tags.length > 0 ? lineData.tags : undefined,
      createdAt: now,
      updatedAt: now
    };

    await db.repertoireLines.add(line);
    await db.personalRepertoires.update(repertoireId, { updatedAt: now });

    return { success: true, line };
  }

  public async getLinesByRepertoire(repertoireId: string): Promise<RepertoireLine[]> {
    return db.repertoireLines.where('repertoireId').equals(repertoireId).sortBy('createdAt');
  }

  public async getLinesForRepertoire(repertoireId: string): Promise<RepertoireLine[]> {
    return this.getLinesByRepertoire(repertoireId);
  }

  public async getLineById(id: string): Promise<RepertoireLine | undefined> {
    return db.repertoireLines.get(id);
  }

  public async getLine(id: string): Promise<RepertoireLine | undefined> {
    return this.getLineById(id);
  }

  public async updateLine(
    id: string,
    updates: Partial<Pick<RepertoireLine, 'name' | 'notes' | 'tags'>>
  ): Promise<RepertoireLine> {
    const line = await db.repertoireLines.get(id);
    if (!line) {
      throw new Error(`Repertoire line ${id} not found.`);
    }

    const now = new Date().toISOString();
    const updated: RepertoireLine = {
      ...line,
      ...updates,
      name: updates.name ? updates.name.trim() : line.name,
      notes: updates.notes !== undefined ? updates.notes.trim() || undefined : line.notes,
      tags: updates.tags !== undefined ? updates.tags : line.tags,
      updatedAt: now
    };

    await db.repertoireLines.put(updated);
    await db.personalRepertoires.update(line.repertoireId, { updatedAt: now });

    return updated;
  }

  public async deleteLine(id: string): Promise<void> {
    const line = await db.repertoireLines.get(id);
    if (line) {
      await db.repertoireLines.delete(id);
      await db.personalRepertoires.update(line.repertoireId, { updatedAt: new Date().toISOString() });
    }
  }

  // ==========================================
  // EXPORT & IMPORT
  // ==========================================

  public async exportRepertoireToJson(repertoireId: string): Promise<string> {
    const rep = await db.personalRepertoires.get(repertoireId);
    if (!rep) {
      throw new Error(`Repertoire ${repertoireId} not found.`);
    }

    const lines = await this.getLinesByRepertoire(repertoireId);
    const exportData: RepertoireExportData = {
      version: '1.0.0',
      schemaVersion: 1,
      source: 'Chess Opening Academy',
      repertoire: rep,
      lines,
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  }

  public async importRepertoireFromJson(input: string | RepertoireExportData | any): Promise<{
    success: boolean;
    repertoire?: Repertoire;
    importedLinesCount: number;
    linesCount: number;
    error?: string;
  }> {
    try {
      const data: RepertoireExportData = typeof input === 'string' ? JSON.parse(input) : input;

      if (!data.repertoire || !data.repertoire.name || !data.repertoire.color) {
        return { success: false, importedLinesCount: 0, linesCount: 0, error: 'Invalid repertoire format in JSON file.' };
      }

      const now = new Date().toISOString();
      const newRepId = this.generateId('rep');
      const importedRepertoire: Repertoire = {
        id: newRepId,
        name: `${data.repertoire.name} (Imported)`,
        color: data.repertoire.color,
        description: data.repertoire.description,
        createdAt: now,
        updatedAt: now
      };

      const validLines: RepertoireLine[] = [];
      const linesToImport = Array.isArray(data.lines) ? data.lines : [];

      for (const rawLine of linesToImport) {
        if (!rawLine.movesSan || rawLine.movesSan.length === 0) continue;

        // Verify chess validity
        const chess = new Chess();
        let isValid = true;
        const movesUci: string[] = [];

        for (const san of rawLine.movesSan) {
          try {
            const move = chess.move(san);
            if (!move) {
              isValid = false;
              break;
            }
            movesUci.push(move.from + move.to + (move.promotion || ''));
          } catch {
            isValid = false;
            break;
          }
        }

        if (!isValid) continue;

        validLines.push({
          id: this.generateId('line'),
          repertoireId: newRepId,
          name: rawLine.name || 'Imported Line',
          eco: rawLine.eco || null,
          movesSan: [...rawLine.movesSan],
          movesUci,
          finalFen: chess.fen(),
          finalEpd: chess.fen().split(' ').slice(0, 4).join(' '),
          notes: rawLine.notes,
          tags: rawLine.tags,
          createdAt: now,
          updatedAt: now
        });
      }

      await db.transaction('rw', db.personalRepertoires, db.repertoireLines, async () => {
        await db.personalRepertoires.add(importedRepertoire);
        if (validLines.length > 0) {
          await db.repertoireLines.bulkAdd(validLines);
        }
      });

      return {
        success: true,
        repertoire: importedRepertoire,
        importedLinesCount: validLines.length,
        linesCount: validLines.length
      };
    } catch (err: any) {
      return { success: false, importedLinesCount: 0, linesCount: 0, error: `JSON Parse error: ${err?.message || 'Corrupt file'}` };
    }
  }

  public async exportRepertoireToPgn(repertoireId: string): Promise<string> {
    const rep = await db.personalRepertoires.get(repertoireId);
    if (!rep) {
      throw new Error(`Repertoire ${repertoireId} not found.`);
    }

    const lines = await this.getLinesByRepertoire(repertoireId);
    if (lines.length === 0) {
      return '';
    }

    return lines.map((line) => this.exportLineToPgn(line, rep.name)).join('\n\n\n');
  }

  public exportLineToPgn(line: RepertoireLine, repertoireName?: string): string {
    const headers = [
      `[Event "${repertoireName ? repertoireName : 'Chess Opening Academy'}"]`,
      `[Site "Chess Opening Academy"]`,
      `[Date "${new Date(line.createdAt || Date.now()).toISOString().slice(0, 10).replace(/-/g, '.')}"]`,
      `[White "${line.name}"]`,
      `[Black "Analysis"]`,
      `[Result "*"]`
    ];

    if (line.eco) {
      headers.push(`[ECO "${line.eco}"]`);
    }

    const tokens: string[] = [];
    let moveNum = 1;
    for (let i = 0; i < line.movesSan.length; i++) {
      const san = line.movesSan[i];
      if (i % 2 === 0) {
        tokens.push(`${moveNum}. ${san}`);
      } else {
        tokens.push(san);
        moveNum++;
      }
    }

    let movetext = tokens.join(' ') + ' *';
    if (line.notes && line.notes.trim()) {
      movetext += ` { ${line.notes.trim()} }`;
    }

    return `${headers.join('\n')}\n\n${movetext}\n`;
  }
}

export const repertoireService = RepertoireService.getInstance();
