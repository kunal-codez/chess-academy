export interface Repertoire {
  id: string;                      // Unique ID (UUID / slug)
  name: string;                    // Title (e.g. "My Sicilian Najdorf")
  color: 'white' | 'black';        // Side being prepared
  description?: string;            // Strategic notes / goals
  createdAt: string;               // ISO 8601 string
  updatedAt: string;               // ISO 8601 string
}

export interface RepertoireLine {
  id: string;                      // Unique ID
  repertoireId: string;            // Parent Repertoire foreign key
  name: string;                    // Variation title
  eco: string | null;              // ECO code (e.g. "B90") or null if unclassified
  movesSan: string[];              // Sequence of SAN moves from move 1
  movesUci: string[];              // Sequence of UCI moves
  finalFen: string;                // Board FEN at end of sequence
  finalEpd: string;                // Board EPD for transposition matching
  notes?: string;                  // Strategic commentary, tactical reminders
  tags?: string[];                 // Custom tags e.g. ["mainline", "sharp", "gambit"]
  createdAt: string;               // ISO 8601 string
  updatedAt: string;               // ISO 8601 string
}

export interface RepertoireExportData {
  version: '1.0.0';
  schemaVersion?: number;
  source: 'Chess Opening Academy';
  repertoire: Repertoire;
  lines: RepertoireLine[];
  exportedAt: string;
}
