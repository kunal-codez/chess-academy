import { Chess } from 'chess.js';
import type {
  OpeningRecord,
  OpeningTreeNode,
  CandidateContinuation
} from '../types/opening.types.ts';
import openingsDataset from '../data/openings/openings.json' with { type: 'json' };

export class OpeningTreeService {
  private static instance: OpeningTreeService | null = null;

  private root: OpeningTreeNode;
  private totalNodes = 1;
  private epdToNodes: Map<string, OpeningTreeNode[]> = new Map();

  constructor(customRecords?: OpeningRecord[]) {
    const records = customRecords || (openingsDataset as OpeningRecord[]);

    this.root = {
      san: '',
      ply: 0,
      epd: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -',
      openings: [],
      ecoCodes: [],
      descendantCount: records.length,
      children: new Map<string, OpeningTreeNode>()
    };

    this.buildTree(records);
  }

  public static getInstance(): OpeningTreeService {
    if (!OpeningTreeService.instance) {
      OpeningTreeService.instance = new OpeningTreeService();
    }
    return OpeningTreeService.instance;
  }

  private buildTree(records: OpeningRecord[]): void {
    const openingIdsMap = new Map<OpeningTreeNode, Set<string>>();
    const ecoCodesMap = new Map<OpeningTreeNode, Set<string>>();

    openingIdsMap.set(this.root, new Set());
    ecoCodesMap.set(this.root, new Set());

    // 1. Ingest all records into prefix tree
    for (const record of records) {
      let curr = this.root;
      openingIdsMap.get(curr)!.add(record.id);
      ecoCodesMap.get(curr)!.add(record.eco);

      for (let i = 0; i < record.movesSan.length; i++) {
        const san = record.movesSan[i];
        let next = curr.children.get(san);

        if (!next) {
          next = {
            san,
            uci: record.movesUci ? record.movesUci[i] : undefined,
            ply: i + 1,
            epd: '',
            openings: [],
            ecoCodes: [],
            descendantCount: 0,
            children: new Map()
          };
          curr.children.set(san, next);
          openingIdsMap.set(next, new Set());
          ecoCodesMap.set(next, new Set());
          this.totalNodes++;
        }

        openingIdsMap.get(next)!.add(record.id);
        ecoCodesMap.get(next)!.add(record.eco);

        if (i === record.movesSan.length - 1) {
          next.epd = record.epd;
          next.openings.push(record);
        }

        curr = next;
      }
    }

    // 2. Set descendant counts & distinct ECO codes
    for (const [node, idSet] of openingIdsMap.entries()) {
      node.descendantCount = idSet.size;
    }
    for (const [node, ecoSet] of ecoCodesMap.entries()) {
      node.ecoCodes = Array.from(ecoSet);
    }

    // 3. Index all intermediate & leaf node EPDs via DFS traversal
    const chess = new Chess();
    this.epdToNodes.set(this.root.epd, [this.root]);

    const dfs = (node: OpeningTreeNode) => {
      for (const [san, child] of node.children.entries()) {
        chess.move(san);
        const parts = chess.fen().split(' ');
        child.epd = `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]}`;

        if (!this.epdToNodes.has(child.epd)) {
          this.epdToNodes.set(child.epd, []);
        }
        this.epdToNodes.get(child.epd)!.push(child);

        dfs(child);
        chess.undo();
      }
    };

    dfs(this.root);
  }

  public getRoot(): OpeningTreeNode {
    return this.root;
  }

  public getTotalNodeCount(): number {
    return this.totalNodes;
  }

  public getTotalOpeningCount(): number {
    return this.root.descendantCount;
  }

  /**
   * Retrieves tree node at exact move sequence.
   */
  public getNode(movesSan: string[]): OpeningTreeNode | undefined {
    let curr: OpeningTreeNode | undefined = this.root;
    for (const san of movesSan) {
      if (!curr) return undefined;
      curr = curr.children.get(san);
    }
    return curr;
  }

  /**
   * Returns all tree nodes sharing the given EPD (board state).
   */
  public getTranspositionNodes(epd: string): OpeningTreeNode[] {
    return this.epdToNodes.get(epd) || [];
  }

  /**
   * Retrieves candidate continuations from the given move sequence, or via EPD transposition.
   * Sorted descending by descendant variation count.
   */
  public getContinuations(movesSan: string[], currentEpd?: string): CandidateContinuation[] {
    // 1. Direct Move Sequence Path
    const node = this.getNode(movesSan);
    if (node && node.children.size > 0) {
      const candidates: CandidateContinuation[] = [];
      for (const child of node.children.values()) {
        const names: string[] = [];
        this.collectSampleNames(child, names, 3);

        candidates.push({
          san: child.san,
          uci: child.uci,
          descendantCount: child.descendantCount,
          ecoCodes: child.ecoCodes,
          openingNames: names,
          sampleOpening: this.findSampleOpening(child),
          isTransposition: false
        });
      }
      return candidates.sort((a, b) => b.descendantCount - a.descendantCount);
    }

    // 2. Transposition Lookup via EPD if move order diverged
    if (currentEpd) {
      const transposedNodes = this.epdToNodes.get(currentEpd);
      if (transposedNodes && transposedNodes.length > 0) {
        const moveMap = new Map<string, CandidateContinuation>();

        for (const n of transposedNodes) {
          for (const child of n.children.values()) {
            if (!moveMap.has(child.san)) {
              const names: string[] = [];
              this.collectSampleNames(child, names, 3);

              moveMap.set(child.san, {
                san: child.san,
                uci: child.uci,
                descendantCount: child.descendantCount,
                ecoCodes: [...child.ecoCodes],
                openingNames: names,
                sampleOpening: this.findSampleOpening(child),
                isTransposition: true
              });
            } else {
              const existing = moveMap.get(child.san)!;
              existing.descendantCount = Math.max(existing.descendantCount, child.descendantCount);
              existing.ecoCodes = Array.from(new Set([...existing.ecoCodes, ...child.ecoCodes]));
            }
          }
        }
        return Array.from(moveMap.values()).sort((a, b) => b.descendantCount - a.descendantCount);
      }
    }

    // Out of book
    return [];
  }

  /**
   * Walks backwards from the end of movesSan to find the deepest ply that was still within book.
   */
  public findDeepestBookPly(movesSan: string[]): {
    ply: number;
    node?: OpeningTreeNode;
    moves: string[];
  } {
    for (let ply = movesSan.length; ply >= 1; ply--) {
      const subMoves = movesSan.slice(0, ply);
      const node = this.getNode(subMoves);
      if (node) {
        return { ply, node, moves: subMoves };
      }
    }
    return { ply: 0, node: this.root, moves: [] };
  }

  private collectSampleNames(node: OpeningTreeNode, out: string[], limit: number): void {
    for (const o of node.openings) {
      if (!out.includes(o.name)) out.push(o.name);
      if (out.length >= limit) return;
    }
    for (const child of node.children.values()) {
      this.collectSampleNames(child, out, limit);
      if (out.length >= limit) return;
    }
  }

  private findSampleOpening(node: OpeningTreeNode): OpeningRecord | undefined {
    if (node.openings.length > 0) return node.openings[0];
    for (const child of node.children.values()) {
      const found = this.findSampleOpening(child);
      if (found) return found;
    }
    return undefined;
  }
}

export const openingTree = OpeningTreeService.getInstance();
