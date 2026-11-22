export interface OpeningRecord {
  id: string;               // e.g., "b90-sicilian-defense-najdorf-variation-english-attack"
  eco: string;              // e.g., "B90"
  name: string;             // e.g., "Sicilian Defense: Najdorf Variation, English Attack"
  family: string;           // e.g., "Sicilian Defense"
  variation?: string;       // e.g., "Najdorf Variation"
  subvariation?: string;    // e.g., "English Attack"
  pgn: string;              // e.g., "1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6 6. Be3"
  movesSan: string[];       // ["e4", "c5", "Nf3", "d6", "d4", "cxd4", "Nxd4", "Nf6", "Nc3", "a6", "Be3"]
  movesUci: string[];       // ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6", "c1e3"]
  epd: string;              // e.g., "r1bqkb1r/1p2pppp/p1np1n2/8/3NP3/2N1B3/PPP2PPP/R2QKB1R b KQkq -"
  fen: string;              // Full FEN string
  plyCount: number;         // 11
  source: string;           // "lichess-org/chess-openings"
}

export interface OpeningRecognitionResult {
  matched: boolean;
  isExactMatch: boolean;        // true if current sequence exactly matches the full opening line
  isPrefixMatch: boolean;       // true if played beyond this line or currently within mainline
  opening?: OpeningRecord;
  family?: string;
  matchedPly: number;           // ply count where the opening was recognized
  transposition?: boolean;      // true if matched via EPD transposition rather than move order
  candidateOpenings?: OpeningRecord[]; // Alternative continuation lines from current position
}

export interface OpeningSearchQuery {
  query?: string;               // text matching name, family, variation
  eco?: string;                 // exact or prefix code (e.g. "B90" or "B9")
  family?: string;              // exact or partial family name
  ecoRange?: { start: string; end: string }; // e.g. start: "C00", end: "C99"
  limit?: number;
  offset?: number;
}

export interface OpeningTreeNode {
  san: string;                     // Move notation (e.g. "e4", empty string for root)
  uci?: string;                    // UCI notation (e.g. "e2e4")
  ply: number;                     // Half-move depth from starting position
  epd: string;                     // Position EPD
  openings: OpeningRecord[];       // Openings associated with / terminating at this node
  ecoCodes: string[];              // Unique ECO codes represented in this branch
  descendantCount: number;         // Total number of catalogued openings passing through or terminating in this branch
  children: Map<string, OpeningTreeNode>; // Child moves indexed by SAN
}

export interface CandidateContinuation {
  san: string;                     // Next move SAN (e.g. "c5")
  uci?: string;                    // Next move UCI (e.g. "c7c5")
  descendantCount: number;         // How many catalogued opening variations feature this continuation
  ecoCodes: string[];              // Distinct ECO codes reached via this move
  openingNames: string[];          // Names of major openings that continue with this move
  sampleOpening?: OpeningRecord;   // Primary representative opening line
  isTransposition?: boolean;       // Whether this continuation leads to or stems from a transposition
}
