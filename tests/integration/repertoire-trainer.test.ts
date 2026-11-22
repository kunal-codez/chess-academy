import 'fake-indexeddb/auto';
import { db } from '../../src/db/db.ts';
import { repertoireService } from '../../src/services/RepertoireService.ts';
import { drillSession } from '../../src/services/DrillSessionService.ts';
import {
  calculateQuality,
  calculateSm2,
  isLineDue,
  sortDrillQueue
} from '../../src/services/SrsScheduler.ts';
import type { LineTrainingProgress } from '../../src/types/srs.types.ts';
import type { RepertoireLine } from '../../types/repertoire.types.ts';

async function runRepertoireTrainerTests() {
  console.log('================================================================');
  console.log(' PROMPT 12: INTERACTIVE REPERTOIRE TRAINER & SRS TEST SUITE    ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failed++;
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // Set drill session to synchronous for fast, deterministic unit testing
  drillSession.autoReplyDelayMs = 0;

  // Clear all IndexedDB tables before test
  await db.personalRepertoires.clear();
  await db.repertoireLines.clear();
  await db.lineTrainingProgress.clear();

  const now = new Date('2026-11-22T12:00:00Z');

  // -------------------------------------------------------------------------
  // 1. SM-2 SCHEDULER QUALITY MAPPING & FORMULA MATH
  // -------------------------------------------------------------------------
  console.log('1. SM-2 SCHEDULER QUALITY MAPPING & FORMULA MATH');

  // Quality score mapping
  assert(calculateQuality(0, 0) === 5, '0 mistakes, 0 hints -> Quality 5 (Perfect)');
  assert(calculateQuality(0, 1) === 4, '0 mistakes, 1 hint -> Quality 4 (Good)');
  assert(calculateQuality(0, 2) === 4, '0 mistakes, 2 hints -> Quality 4 (Good)');
  assert(calculateQuality(1, 0) === 3, '1 mistake -> Quality 3 (Pass with hesitation)');
  assert(calculateQuality(2, 0) === 2, '2 mistakes -> Quality 2 (Fail)');
  assert(calculateQuality(3, 0) === 1, '3 mistakes -> Quality 1 (Hard Fail)');
  assert(calculateQuality(0, 0, true) === 1, 'Skipped line -> Quality 1 (Hard Fail)');

  // SM-2 Review 1: First perfect review (initial state undefined)
  const rev1 = calculateSm2(undefined, 'line-1', 'rep-1', 0, 0, false, now);
  assert(rev1.repetitions === 1, 'Review 1 (Perfect): repetitions = 1');
  assert(rev1.intervalDays === 1, 'Review 1 (Perfect): interval = 1 day');
  assert(rev1.easeFactor === 2.6, 'Review 1 (Perfect): ease factor increases from 2.5 to 2.6');
  assert(rev1.totalAttempts === 1, 'Review 1: totalAttempts = 1');
  assert(rev1.totalCorrect === 1, 'Review 1: totalCorrect = 1');
  assert(rev1.totalMistakes === 0, 'Review 1: totalMistakes = 0');
  const expectedRev1Date = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
  assert(rev1.nextReviewAt === expectedRev1Date, 'Review 1: nextReviewAt is exactly 1 day ahead');

  // SM-2 Review 2: Second consecutive perfect review
  const day2 = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const rev2 = calculateSm2(rev1, 'line-1', 'rep-1', 0, 0, false, day2);
  assert(rev2.repetitions === 2, 'Review 2 (Perfect): repetitions = 2');
  assert(rev2.intervalDays === 6, 'Review 2 (Perfect): interval = 6 days');
  assert(rev2.easeFactor === 2.7, 'Review 2 (Perfect): ease factor increases to 2.7');
  assert(rev2.totalAttempts === 2, 'Review 2: totalAttempts = 2');
  assert(rev2.totalCorrect === 2, 'Review 2: totalCorrect = 2');

  // SM-2 Review 3: Third consecutive perfect review
  const day8 = new Date(day2.getTime() + 6 * 24 * 60 * 60 * 1000);
  const rev3 = calculateSm2(rev2, 'line-1', 'rep-1', 0, 0, false, day8);
  assert(rev3.repetitions === 3, 'Review 3 (Perfect): repetitions = 3');
  // interval = Math.round(6 * 2.8) = 17 days
  assert(rev3.intervalDays === Math.round(6 * rev3.easeFactor), `Review 3: interval is Math.round(6 * ${rev3.easeFactor}) = ${rev3.intervalDays}`);
  assert(rev3.easeFactor === 2.8, 'Review 3 (Perfect): ease factor reaches 2.8');

  assert(rev3.totalAttempts === 3, 'Review 3: totalAttempts = 3');
  assert(rev3.totalCorrect === 3, 'Review 3: totalCorrect = 3');

  // SM-2 Review 4: Failed review (2 mistakes)
  const day25 = new Date(day8.getTime() + rev3.intervalDays * 24 * 60 * 60 * 1000);
  const rev4Failed = calculateSm2(rev3, 'line-1', 'rep-1', 2, 0, false, day25);
  assert(rev4Failed.repetitions === 0, 'Failed Review (2 mistakes): repetitions reset to 0');
  assert(rev4Failed.intervalDays === 1, 'Failed Review: interval reset to 1 day');
  assert(rev4Failed.easeFactor < rev3.easeFactor, 'Failed Review: ease factor reduced');
  assert(rev4Failed.totalAttempts === 4, 'Failed Review: totalAttempts incremented to 4');
  assert(rev4Failed.totalCorrect === 3, 'Failed Review: totalCorrect remains 3 (not incremented on failure)');
  assert(rev4Failed.totalMistakes === 2, 'Failed Review: totalMistakes increased to 2');

  // SM-2 Minimum Ease Factor floor clamp (never below 1.3)
  let lowProgress: LineTrainingProgress | undefined = undefined;
  for (let i = 0; i < 15; i++) {
    lowProgress = calculateSm2(lowProgress, 'line-floor', 'rep-1', 5, 0, false, now);
  }
  assert(lowProgress.easeFactor >= 1.3, `Ease factor floor clamped at 1.3 (got: ${lowProgress.easeFactor})`);

  // -------------------------------------------------------------------------
  // 2. QUEUE SORTING & DUE STATUS
  // -------------------------------------------------------------------------
  console.log('\n2. QUEUE SORTING & DUE STATUS');

  const lineA: RepertoireLine = {
    id: 'line-a',
    repertoireId: 'rep-1',
    name: 'Overdue Line',
    eco: 'C00',
    movesSan: ['e4', 'e6'],
    movesUci: ['e2e4', 'e7e6'],
    finalFen: '',
    finalEpd: '',
    createdAt: new Date('2026-11-20T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-11-20T10:00:00Z').toISOString()
  };

  const lineB: RepertoireLine = {
    id: 'line-b',
    repertoireId: 'rep-1',
    name: 'New Unreviewed Line',
    eco: 'C01',
    movesSan: ['e4', 'e6', 'd4'],
    movesUci: ['e2e4', 'e7e6', 'd2d4'],
    finalFen: '',
    finalEpd: '',
    createdAt: new Date('2026-11-21T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-11-21T10:00:00Z').toISOString()
  };

  const lineC: RepertoireLine = {
    id: 'line-c',
    repertoireId: 'rep-1',
    name: 'Future Scheduled Line',
    eco: 'C02',
    movesSan: ['e4', 'e6', 'd4', 'd5'],
    movesUci: ['e2e4', 'e7e6', 'd2d4', 'd7d5'],
    finalFen: '',
    finalEpd: '',
    createdAt: new Date('2026-11-22T10:00:00Z').toISOString(),
    updatedAt: new Date('2026-11-22T10:00:00Z').toISOString()
  };

  const progressMap = new Map<string, LineTrainingProgress>();
  // Line A is overdue (nextReviewAt was yesterday)
  progressMap.set('line-a', {
    lineId: 'line-a',
    repertoireId: 'rep-1',
    repetitions: 1,
    easeFactor: 2.5,
    intervalDays: 1,
    nextReviewAt: '2026-11-21T12:00:00Z',
    lastReviewedAt: '2026-11-20T12:00:00Z',
    totalAttempts: 1,
    totalCorrect: 1,
    totalMistakes: 0
  });

  // Line B is unreviewed (no progressMap entry)

  // Line C is scheduled 5 days in future
  progressMap.set('line-c', {
    lineId: 'line-c',
    repertoireId: 'rep-1',
    repetitions: 2,
    easeFactor: 2.6,
    intervalDays: 6,
    nextReviewAt: '2026-11-27T12:00:00Z',
    lastReviewedAt: '2026-11-21T12:00:00Z',
    totalAttempts: 2,
    totalCorrect: 2,
    totalMistakes: 0
  });

  assert(isLineDue(progressMap.get('line-a'), now) === true, 'Line A (yesterday) is due');
  assert(isLineDue(progressMap.get('line-b'), now) === true, 'Line B (unreviewed) is due');
  assert(isLineDue(progressMap.get('line-c'), now) === false, 'Line C (5 days future) is NOT due');

  // Sorted Queue: Line A (overdue) -> Line B (new) -> Line C (future)
  const sortedQueue = sortDrillQueue([lineC, lineB, lineA], progressMap, now);
  assert(sortedQueue[0].id === 'line-a', 'Queue #1: Overdue line prioritized first');
  assert(sortedQueue[1].id === 'line-b', 'Queue #2: New unreviewed line placed second');
  assert(sortedQueue[2].id === 'line-c', 'Queue #3: Future scheduled line placed last');

  // -------------------------------------------------------------------------
  // 3. DRILL SESSION FLOW: WHITE REPERTOIRE
  // -------------------------------------------------------------------------
  console.log('\n3. DRILL SESSION FLOW: WHITE REPERTOIRE');

  const whiteRep = await repertoireService.createRepertoire('White Openings', 'white');
  const italianLine = await repertoireService.saveLine(whiteRep.id, {
    name: 'Italian Game Giuoco Piano',
    movesSan: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'],
    notes: 'Italian main branch: 3.Bc4 develops bishop actively targeting f7'
  });
  assert(italianLine.success === true && italianLine.line !== undefined, 'Italian line saved to White repertoire');

  // Start Due drill session
  const startWhiteRes = await drillSession.startSession(whiteRep, 'all', now);
  assert(startWhiteRes === true, 'Drill session started successfully');

  let state = drillSession.getState();
  assert(state.status === 'drilling', 'Drill state is "drilling"');
  assert(state.currentPly === 0, 'Current ply starts at 0 for White repertoire');
  assert(drillSession.isUserTurn() === true, 'Ply 0 is user\'s turn (White)');

  // User plays move 1: 1.e4 (e2 -> e4)
  const move1Res = drillSession.handleUserMove('e2', 'e4', undefined, now);
  assert(move1Res.isCorrect === true, '1.e4 recognized as correct move');

  // Since autoReplyDelayMs === 0 in tests, opponent immediately played 1...e5
  state = drillSession.getState();
  assert(state.currentPly === 2, 'Opponent automatically replied with 1...e5; current ply is now 2');
  assert(drillSession.isUserTurn() === true, 'Ply 2 is user\'s turn');

  // User plays move 2: 2.Nf3 (g1 -> f3)
  const move2Res = drillSession.handleUserMove('g1', 'f3', undefined, now);
  assert(move2Res.isCorrect === true, '2.Nf3 recognized as correct move');

  // Opponent immediately replied with 2...Nc6
  state = drillSession.getState();
  assert(state.currentPly === 4, 'Opponent replied with 2...Nc6; current ply is 4');

  // User plays move 3: 3.Bc4 (f1 -> c4) -> Final move of line!
  const move3Res = drillSession.handleUserMove('f1', 'c4', undefined, now);
  assert(move3Res.isCorrect === true, '3.Bc4 recognized as correct');
  assert(move3Res.isLineComplete === true, 'Line marked complete after 3.Bc4');

  state = drillSession.getState();
  assert(state.status === 'line_completed', 'Session status transitioned to "line_completed"');
  assert(state.currentLineState?.mistakes === 0, 'Zero mistakes recorded');
  assert(state.sessionStats.completedLines === 1, '1 line completed in session stats');
  assert(state.sessionStats.perfectLines === 1, '1 perfect line in session stats');

  // Advance to next line (which finishes session)
  await drillSession.nextLine(now);
  state = drillSession.getState();
  assert(state.status === 'session_completed', 'Session completed after finishing single queued line');
  assert(state.sessionStats.accuracy === 100, 'Session accuracy is 100%');

  drillSession.exitDrill();

  // -------------------------------------------------------------------------
  // 4. DRILL SESSION FLOW: BLACK REPERTOIRE (OPPONENT PLAYS MOVE 1)
  // -------------------------------------------------------------------------
  console.log('\n4. DRILL SESSION FLOW: BLACK REPERTOIRE (OPPONENT PLAYS MOVE 1)');

  const blackRep = await repertoireService.createRepertoire('Black Defenses', 'black');
  const frenchLine = await repertoireService.saveLine(blackRep.id, {
    name: 'French Defense: Winawer',
    movesSan: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Bb4'],
    notes: 'Winawer 3...Bb4 pins the c3 knight and leads to complex imbalances'
  });
  assert(frenchLine.success === true && frenchLine.line !== undefined, 'French Winawer line saved');

  // Start Black drill session
  await drillSession.startSession(blackRep, 'all', now);
  state = drillSession.getState();

  // For Black repertoire, opponent automatically plays 1.e4 on session init!
  assert(state.currentPly === 1, 'Opponent automatically played 1.e4 on Black repertoire init; current ply is 1');
  assert(drillSession.isUserTurn() === true, 'Ply 1 is user\'s turn (Black)');

  // User plays 1...e6 (e7 -> e6)
  const french1 = drillSession.handleUserMove('e7', 'e6', undefined, now);
  assert(french1.isCorrect === true, 'User 1...e6 correct');

  // Opponent played 2.d4 (ply 3)
  state = drillSession.getState();
  assert(state.currentPly === 3, 'Opponent played 2.d4; current ply is 3');

  // User plays 2...d5 (d7 -> d5)
  const french2 = drillSession.handleUserMove('d7', 'd5', undefined, now);
  assert(french2.isCorrect === true, 'User 2...d5 correct');

  // Opponent played 3.Nc3 (ply 5)
  state = drillSession.getState();
  assert(state.currentPly === 5, 'Opponent played 3.Nc3; current ply is 5');

  // User plays 3...Bb4 (f8 -> b4) -> completes Winawer line
  const french3 = drillSession.handleUserMove('f8', 'b4', undefined, now);
  assert(french3.isCorrect === true && french3.isLineComplete === true, '3...Bb4 completes Winawer line');

  state = drillSession.getState();
  assert(state.status === 'line_completed', 'Black drill line completed successfully');

  drillSession.exitDrill();

  // -------------------------------------------------------------------------
  // 5. WRONG MOVE & HINT HANDLING
  // -------------------------------------------------------------------------
  console.log('\n5. WRONG MOVE & HINT HANDLING');

  await drillSession.startSession(whiteRep, 'all', now);
  state = drillSession.getState();
  assert(state.currentPly === 0, 'Ready at ply 0');

  // User plays incorrect move: 1.d4 instead of 1.e4
  const wrongMove = drillSession.handleUserMove('d2', 'd4', undefined, now);
  assert(wrongMove.isCorrect === false, '1.d4 flagged as incorrect against 1.e4 line');

  state = drillSession.getState();
  assert(state.currentPly === 0, 'Ply did not advance after incorrect move');
  assert(state.currentLineState?.mistakes === 1, 'Mistake counter incremented to 1');
  assert(state.feedback.type === 'error', 'Error feedback rendered');

  // Request Hint Level 1
  const hint1 = drillSession.provideHint();
  assert(hint1 !== null && hint1.from === 'e2' && hint1.level === 1, 'Hint 1 highlights origin square e2');
  state = drillSession.getState();
  assert(state.shapes.length === 1 && state.shapes[0].orig === 'e2', 'Hint 1 autoShape generated on e2');
  assert(state.currentLineState?.hintsUsed === 1, 'hintsUsed incremented to 1');

  // Request Hint Level 2
  const hint2 = drillSession.provideHint();
  assert(hint2 !== null && hint2.to === 'e4' && hint2.level === 2, 'Hint 2 reveals target destination e4');
  state = drillSession.getState();
  assert(state.shapes[0].orig === 'e2' && state.shapes[0].dest === 'e4', 'Hint 2 move arrow generated from e2 to e4');

  // User now plays correct move 1.e4
  const correctAfterHint = drillSession.handleUserMove('e2', 'e4', undefined, now);
  assert(correctAfterHint.isCorrect === true, 'Move executed correctly after hint');
  state = drillSession.getState();
  assert(state.shapes.length === 0, 'Hints automatically cleared on correct move');

  drillSession.exitDrill();

  // -------------------------------------------------------------------------
  // 6. DEXIE V4 PERSISTENCE & CASCADE CLEANUP
  // -------------------------------------------------------------------------
  console.log('\n6. DEXIE V4 PERSISTENCE & CASCADE CLEANUP');
  await new Promise((r) => setTimeout(r, 20));

  // Check that the Italian line completed in Section 3 has persistent progress in IndexedDB
  const italianProgress = await db.lineTrainingProgress.get(italianLine.line!.id);
  assert(italianProgress !== undefined, 'LineTrainingProgress persisted in Dexie table lineTrainingProgress');
  assert(italianProgress?.repertoireId === whiteRep.id, 'repertoireId foreign key stored');
  assert(italianProgress?.repetitions === 1, 'repetitions = 1 saved in IndexedDB');
  assert(italianProgress?.intervalDays === 1, 'intervalDays = 1 saved in IndexedDB');

  // Repertoire stats function
  const repStats = await drillSession.getRepertoireStats(whiteRep.id, now);
  assert(repStats.totalLines === 1, 'repStats.totalLines = 1');
  assert(repStats.dueLines === 0, 'repStats.dueLines = 0 (nextReviewAt is tomorrow)');

  // Test single line deletion cascade: deleting line deletes its lineTrainingProgress record
  await repertoireService.deleteLine(italianLine.line!.id);
  const deletedProgCheck = await db.lineTrainingProgress.get(italianLine.line!.id);
  assert(deletedProgCheck === undefined, 'Deleting line cleans up lineTrainingProgress record');

  // Test repertoire deletion cascade: deleting blackRep deletes French line and its progress
  const frenchProgBefore = await db.lineTrainingProgress.get(frenchLine.line!.id);
  assert(frenchProgBefore !== undefined, 'French line training progress existed before repertoire deletion');

  await repertoireService.deleteRepertoire(blackRep.id);
  const frenchProgAfter = await db.lineTrainingProgress.get(frenchLine.line!.id);
  assert(frenchProgAfter === undefined, 'Deleting repertoire cascade-deleted lineTrainingProgress');

  console.log('\n================================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(' PROMPT 12 REPERTOIRE TRAINER & SRS SUITE: 100% VERIFIED       ');
  console.log('================================================================\n');
}

runRepertoireTrainerTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
