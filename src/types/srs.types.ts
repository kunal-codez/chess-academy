export interface LineTrainingProgress {
  lineId: string;
  repertoireId: string;
  repetitions: number;           // Consecutive successful repetitions (0, 1, 2, ...)
  easeFactor: number;            // Default 2.5, minimum 1.3
  intervalDays: number;          // Current review interval in days
  nextReviewAt: string;          // ISO 8601 string timestamp
  lastReviewedAt: string | null; // ISO 8601 string timestamp or null if unreviewed
  totalAttempts: number;         // Total drill sessions attempted
  totalCorrect: number;          // Sessions completed with 0 mistakes
  totalMistakes: number;         // Cumulative mistakes across all sessions
}

export type SrsQuality = 0 | 1 | 2 | 3 | 4 | 5;

export interface DrillResult {
  lineId: string;
  repertoireId: string;
  mistakes: number;
  hintsUsed: number;
  skipped: boolean;
  quality: SrsQuality;
  updatedProgress: LineTrainingProgress;
}

export interface RepertoireStatsSummary {
  repertoireId: string;
  totalLines: number;
  dueLines: number;
  newLines: number;
  masteredLines: number; // intervalDays >= 6
}
