import type { LineTrainingProgress, SrsQuality } from '../types/srs.types.ts';
import type { RepertoireLine } from '../types/repertoire.types.ts';

/**
 * Maps performance on a line drill to SM-2 quality score (0-5).
 * - 0 mistakes, 0 hints -> Quality 5 (Perfect recall)
 * - 0 mistakes, 1+ hints -> Quality 4 (Correct with assistance)
 * - 1 mistake -> Quality 3 (Pass with minor hesitation)
 * - 2 mistakes -> Quality 2 (Failed — reset to initial review)
 * - 3+ mistakes or skipped -> Quality 1 (Hard fail — reset to initial review)
 */
export function calculateQuality(mistakes: number, hintsUsed: number, skipped = false): SrsQuality {
  if (skipped || mistakes >= 3) {
    return 1;
  }
  if (mistakes === 2) {
    return 2;
  }
  if (mistakes === 1) {
    return 3;
  }
  if (hintsUsed > 0) {
    return 4;
  }
  return 5;
}

/**
 * Computes updated SM-2 scheduling parameters based on drill performance.
 * Accepts an optional `now: Date` parameter for deterministic testing.
 */
export function calculateSm2(
  current: LineTrainingProgress | undefined,
  lineId: string,
  repertoireId: string,
  mistakes: number,
  hintsUsed: number,
  skipped = false,
  now: Date = new Date()
): LineTrainingProgress {
  const quality = calculateQuality(mistakes, hintsUsed, skipped);

  const prevEase = current ? current.easeFactor : 2.5;
  const prevReps = current ? current.repetitions : 0;
  const prevInterval = current ? current.intervalDays : 0;
  const totalAttempts = (current ? current.totalAttempts : 0) + 1;
  const totalCorrect = (current ? current.totalCorrect : 0) + (mistakes === 0 && !skipped ? 1 : 0);
  const totalMistakes = (current ? current.totalMistakes : 0) + mistakes;

  // Standard SM-2 Ease Factor formula
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const qDiff = 5 - quality;
  const calculatedEf = prevEase + (0.1 - qDiff * (0.08 + qDiff * 0.02));
  const newEaseFactor = Math.max(1.3, Math.round(calculatedEf * 100) / 100);

  let newRepetitions: number;
  let newIntervalDays: number;

  if (quality < 3) {
    // Failure: reset repetition count and set interval to 1 day
    newRepetitions = 0;
    newIntervalDays = 1;
  } else {
    // Success (quality 3, 4, 5)
    if (prevReps === 0) {
      newRepetitions = 1;
      newIntervalDays = 1;
    } else if (prevReps === 1) {
      newRepetitions = 2;
      newIntervalDays = 6;
    } else {
      newRepetitions = prevReps + 1;
      newIntervalDays = Math.max(1, Math.round(prevInterval * newEaseFactor));
    }
  }

  const nextReviewDate = new Date(now.getTime() + newIntervalDays * 24 * 60 * 60 * 1000);

  return {
    lineId,
    repertoireId,
    repetitions: newRepetitions,
    easeFactor: newEaseFactor,
    intervalDays: newIntervalDays,
    nextReviewAt: nextReviewDate.toISOString(),
    lastReviewedAt: now.toISOString(),
    totalAttempts,
    totalCorrect,
    totalMistakes
  };
}

/**
 * Checks whether a given line is currently due for review.
 * - If line has never been reviewed, it is NEW and considered DUE.
 * - If nextReviewAt <= now, it is OVERDUE and considered DUE.
 */
export function isLineDue(progress: LineTrainingProgress | undefined, now: Date = new Date()): boolean {
  if (!progress || !progress.lastReviewedAt) {
    return true; // New line
  }
  const reviewTime = new Date(progress.nextReviewAt).getTime();
  return reviewTime <= now.getTime();
}

/**
 * Sorts drill lines into an optimal review queue:
 * 1. Overdue lines first (ordered by oldest nextReviewAt first)
 * 2. New / unreviewed lines next
 * 3. Future-scheduled lines last (ordered by nextReviewAt)
 */
export function sortDrillQueue(
  lines: RepertoireLine[],
  progressMap: Map<string, LineTrainingProgress>,
  now: Date = new Date()
): RepertoireLine[] {
  const nowMs = now.getTime();

  return [...lines].sort((a, b) => {
    const progA = progressMap.get(a.id);
    const progB = progressMap.get(b.id);

    const isDueA = isLineDue(progA, now);
    const isDueB = isLineDue(progB, now);

    // If one is due and the other isn't, due line comes first
    if (isDueA && !isDueB) return -1;
    if (!isDueA && isDueB) return 1;

    // Both are due: distinguish between overdue and new
    if (isDueA && isDueB) {
      const hasReviewedA = Boolean(progA && progA.lastReviewedAt);
      const hasReviewedB = Boolean(progB && progB.lastReviewedAt);

      if (hasReviewedA && !hasReviewedB) return -1; // Overdue before new
      if (!hasReviewedA && hasReviewedB) return 1;

      if (hasReviewedA && hasReviewedB) {
        // Both are overdue: sort by oldest nextReviewAt first
        return new Date(progA!.nextReviewAt).getTime() - new Date(progB!.nextReviewAt).getTime();
      }

      // Both are new: maintain line creation order
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }

    // Neither is due: sort by upcoming nextReviewAt
    const timeA = progA ? new Date(progA.nextReviewAt).getTime() : nowMs;
    const timeB = progB ? new Date(progB.nextReviewAt).getTime() : nowMs;
    return timeA - timeB;
  });
}
