import { ChessService } from '../../src/services/ChessService.ts';
import { OpeningTreeService } from '../../src/services/OpeningTreeService.ts';
import { OpeningDatabaseService } from '../../src/services/OpeningDatabaseService.ts';
import dataset from '../../src/data/openings/openings.json' with { type: 'json' };
import type { OpeningRecord } from '../../src/types/opening.types.ts';

async function runOpeningExplorerTests() {
  console.log('================================================================');
  console.log(' PROMPT 9: OPENING VARIATION TREE & VISUAL EXPLORER TEST SUITE ');
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

  const tree = new OpeningTreeService(dataset as OpeningRecord[]);
  const db = new OpeningDatabaseService(dataset as OpeningRecord[]);
  const chess = new ChessService();

  // --- 1. TRIE STRUCTURE & INGESTION INTEGRITY ---
  console.log('1. TRIE STRUCTURE & INGESTION INTEGRITY');
  const totalOpenings = tree.getTotalOpeningCount();
  assert(totalOpenings === 3865, `All 3,865 opening records ingested into trie (found: ${totalOpenings})`);

  const totalNodes = tree.getTotalNodeCount();
  assert(totalNodes === 8802, `Trie contains exactly 8,802 nodes (found: ${totalNodes})`);

  const root = tree.getRoot();
  assert(root.ply === 0 && root.san === '', 'Root node initialized with ply 0 and empty SAN');
  assert(
    root.epd === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -',
    'Root node has standard chess starting position EPD'
  );
  assert(root.children.size === 20, `Root node has exactly 20 candidate first moves (found: ${root.children.size})`);
  assert(root.descendantCount === 3865, 'Root node descendantCount equals total catalogued openings (3,865)');

  // --- 2. ROOT CONTINUATIONS & DESCENDANT RANKING ---
  console.log('\n2. ROOT CONTINUATIONS & DESCENDANT RANKING');
  const rootContinuations = tree.getContinuations([]);
  assert(rootContinuations.length === 20, 'Root returns all 20 candidate moves for White');

  // Verify descending sort order
  let isSorted = true;
  for (let i = 0; i < rootContinuations.length - 1; i++) {
    if (rootContinuations[i].descendantCount < rootContinuations[i + 1].descendantCount) {
      isSorted = false;
      break;
    }
  }
  assert(isSorted, 'Root continuations sorted strictly descending by descendant variation count');

  // Specific canonical opening counts from start
  const e4Cont = rootContinuations.find((c) => c.san === 'e4');
  assert(e4Cont !== undefined && e4Cont.descendantCount === 2032, `1.e4 has 2,032 descendant variations (found: ${e4Cont?.descendantCount})`);

  const d4Cont = rootContinuations.find((c) => c.san === 'd4');
  assert(d4Cont !== undefined && d4Cont.descendantCount === 1333, `1.d4 has 1,333 descendant variations (found: ${d4Cont?.descendantCount})`);

  const c4Cont = rootContinuations.find((c) => c.san === 'c4');
  assert(c4Cont !== undefined && c4Cont.descendantCount === 202, `1.c4 English has 202 descendant variations (found: ${c4Cont?.descendantCount})`);

  const nf3Cont = rootContinuations.find((c) => c.san === 'Nf3');
  assert(nf3Cont !== undefined && nf3Cont.descendantCount === 109, `1.Nf3 Zukertort has 109 descendant variations (found: ${nf3Cont?.descendantCount})`);

  const nc3Cont = rootContinuations.find((c) => c.san === 'Nc3');
  assert(nc3Cont !== undefined && nc3Cont.descendantCount === 29, `1.Nc3 Van Geet has 29 descendant variations (found: ${nc3Cont?.descendantCount})`);

  const f4Cont = rootContinuations.find((c) => c.san === 'f4');
  assert(f4Cont !== undefined && f4Cont.descendantCount === 27, `1.f4 Bird Opening has 27 descendant variations (found: ${f4Cont?.descendantCount})`);

  // --- 3. DEEP VARIATION TRAVERSAL (SICILIAN NAJDORF B90–B99) ---
  console.log('\n3. DEEP VARIATION TRAVERSAL (SICILIAN NAJDORF)');
  const najdorfMoves = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'];
  const najdorfContinuations = tree.getContinuations(najdorfMoves);

  assert(najdorfContinuations.length >= 5, 'Najdorf variation returns at least 5 major continuation lines');

  const bg5 = najdorfContinuations.find((c) => c.san === 'Bg5');
  assert(bg5 !== undefined && bg5.descendantCount === 14, `Najdorf 6.Bg5 Classical has 14 lines (found: ${bg5?.descendantCount})`);
  assert(bg5 !== undefined && bg5.ecoCodes.includes('B99'), '6.Bg5 branches include ECO B99');

  const be3 = najdorfContinuations.find((c) => c.san === 'Be3');
  assert(be3 !== undefined && be3.descendantCount === 10, `Najdorf 6.Be3 English Attack has 10 lines (found: ${be3?.descendantCount})`);
  assert(be3 !== undefined && be3.sampleOpening !== undefined, '6.Be3 continuation provides representative sample opening');

  const be2 = najdorfContinuations.find((c) => c.san === 'Be2');
  assert(be2 !== undefined && be2.descendantCount === 6, `Najdorf 6.Be2 Opocensky has 6 lines (found: ${be2?.descendantCount})`);

  const f4 = najdorfContinuations.find((c) => c.san === 'f4');
  assert(f4 !== undefined && f4.descendantCount === 2, `Najdorf 6.f4 Amsterdam has 2 lines (found: ${f4?.descendantCount})`);

  const bc4 = najdorfContinuations.find((c) => c.san === 'Bc4');
  assert(bc4 !== undefined && bc4.descendantCount === 2, `Najdorf 6.Bc4 Lipnitsky has 2 lines (found: ${bc4?.descendantCount})`);

  // --- 4. MOVE SEQUENCE LOADING IN CHESS SERVICE ---
  console.log('\n4. CHESS SERVICE LOAD MOVE SEQUENCE');
  const englishAttack = db.getById('b90-sicilian-defense-najdorf-variation-english-attack');
  assert(englishAttack !== undefined, 'Found Najdorf English Attack in opening database');

  const loadRes = chess.loadMoveSequence(englishAttack!.movesSan);
  assert(loadRes.success, 'Successfully loaded full Najdorf English Attack move sequence into ChessService');

  const snapshots = chess.getSnapshots();
  assert(snapshots.length === 11, `Created exact 11 history snapshots for 11-ply opening (found: ${snapshots.length})`);
  assert(snapshots[10].san === 'Be3', 'Snapshot 11 reflects 6.Be3 move');
  assert(chess.getTurn() === 'b', 'Board state turn is Black to move after ply 11');
  assert(chess.getEpd() === englishAttack!.epd, 'ChessService EPD exactly matches OpeningRecord EPD');

  // Test loading invalid move sequence
  const invalidLoad = chess.loadMoveSequence(['e4', 'e5', 'Ke2', 'Nf6', 'Ke8']);
  assert(!invalidLoad.success, 'Invalid / illegal move sequence safely rejected with error');

  // --- 5. TRANSPOSITION CONTINUATION LOOKUP ---
  console.log('\n5. TRANSPOSITION CONTINUATION LOOKUP');
  // Transposition: 1.g3 d5 2.Nh3 e5 vs 1.g3 e5 2.Nh3 d5
  const transOrder1 = ['g3', 'd5', 'Nh3', 'e5'];
  const transOrder2 = ['g3', 'e5', 'Nh3', 'd5'];

  const chessT1 = new ChessService();
  chessT1.loadMoveSequence(transOrder1);
  const epdT1 = chessT1.getEpd();

  const chessT2 = new ChessService();
  chessT2.loadMoveSequence(transOrder2);
  const epdT2 = chessT2.getEpd();

  assert(epdT1 === epdT2, 'Both move orders reach identical EPD board state');

  const transNodes = tree.getTranspositionNodes(epdT1);
  assert(transNodes.length === 2, `Indexed exactly 2 transposing tree nodes for this EPD (found: ${transNodes.length})`);

  const continuationsT1 = tree.getContinuations(transOrder1, epdT1);
  const continuationsT2 = tree.getContinuations(transOrder2, epdT2);
  assert(continuationsT1.length > 0 && continuationsT2.length > 0, 'Both transposing paths return continuations');
  assert(
    continuationsT1[0].san === continuationsT2[0].san,
    `Both transposing paths share top candidate move: ${continuationsT1[0].san}`
  );

  // --- 6. OUT-OF-BOOK RECOGNITION & RETURN TARGET PLY ---
  console.log('\n6. OUT-OF-BOOK RECOGNITION & RETURN TARGET PLY');
  // Starts with Italian Game (ply 5), then plays uncatalogued random moves
  const uncataloguedMoves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'h6', 'a3', 'a6', 'h3', 'd6'];
  const outOfBookConts = tree.getContinuations(uncataloguedMoves);
  assert(outOfBookConts.length === 0, 'Uncatalogued position returns 0 candidate book continuations');

  const deepest = tree.findDeepestBookPly(uncataloguedMoves);
  assert(deepest.ply === 6, `Correctly identifies deepest book ply as 6 (found: ${deepest.ply})`);
  assert(deepest.moves.join(' ') === 'e4 e5 Nf3 Nc6 Bc4 h6', 'Deepest book sequence is Anti-Fried Liver Defense 1.e4 e5 2.Nf3 Nc6 3.Bc4 h6');
  assert(deepest.node !== undefined && deepest.node.descendantCount > 0, 'Deepest book node contains valid catalogued branches');

  // --- 7. HISTORY TRUNCATION & ALTERNATIVE BRANCHING ---
  console.log('\n7. HISTORY TRUNCATION & ALTERNATIVE BRANCHING');
  chess.loadMoveSequence(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4']); // 5 plies
  assert(chess.getSnapshots().length === 5, 'ChessService initialized with 5 plies');

  // Truncate back to ply 2 (after 1. e4 e5)
  const truncRes = chess.truncateToPly(2);
  assert(truncRes.success, 'Successfully truncated history to ply 2');
  assert(chess.getSnapshots().length === 2, 'History snapshots reduced to exactly 2 plies');
  assert(chess.getSnapshots().map((s) => s.san).join(' ') === 'e4 e5', 'History snapshots contain [e4, e5]');

  // Branch into King's Gambit with makeSanMove
  const kgMove = chess.makeSanMove('f4');
  assert(kgMove.success && kgMove.san === 'f4', 'Successfully executed 2.f4 (King\'s Gambit) via makeSanMove');
  assert(chess.getSnapshots().length === 3, 'Snapshots updated to 3 plies');

  const kgConts = tree.getContinuations(['e4', 'e5', 'f4']);
  assert(kgConts.length >= 3, 'King\'s Gambit returns legal catalogued responses (exf4, Bc5, d5, etc.)');
  assert(kgConts.some((c) => c.san === 'exf4'), 'King\'s Gambit Accepted (exf4) is a candidate move');

  // --- 8. OPENING EXPLORER SEARCH & VOLUME FILTERING ---
  console.log('\n8. OPENING EXPLORER SEARCH & VOLUME FILTERING');
  const najdorfSearch = db.search({ query: 'Najdorf' });
  assert(najdorfSearch.length > 0, `Search "Najdorf" returned ${najdorfSearch.length} variations`);
  assert(najdorfSearch.every((r) => r.name.includes('Najdorf') || r.variation?.includes('Najdorf')), 'All results match Najdorf');

  const volCSearch = db.search({ eco: 'C', limit: 20 });
  assert(volCSearch.length === 20, 'Volume C filter returns 20 openings');
  assert(volCSearch.every((r) => r.eco.startsWith('C')), 'All volume C results start with C (C00–C99)');

  const volESearch = db.search({ eco: 'E', limit: 15 });
  assert(volESearch.length === 15, 'Volume E filter returns 15 openings');
  assert(volESearch.every((r) => r.eco.startsWith('E')), 'All volume E results start with E (E00–E99)');

  const ruySearch = db.search({ family: 'Ruy Lopez' });
  assert(ruySearch.length > 50, `Found ${ruySearch.length} Ruy Lopez variations in encyclopedia`);

  // --- 9. LEGAL PLAYABILITY OF ALL CONTINUATIONS ---
  console.log('\n9. LEGAL PLAYABILITY OF CANDIDATE CONTINUATIONS');
  // Verify that every continuation offered by the tree can be legally played by ChessService
  const testPositions = [
    [], // Start
    ['e4'], // After 1.e4
    ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'], // Najdorf
    ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7'] // King's Indian
  ];

  for (const pos of testPositions) {
    const simChess = new ChessService();
    simChess.loadMoveSequence(pos);
    const candidateMoves = tree.getContinuations(pos);

    for (const cand of candidateMoves) {
      const testChess = new ChessService();
      testChess.loadMoveSequence(pos);
      const res = testChess.makeSanMove(cand.san);
      assert(
        res.success,
        `Continuation ${cand.san} from [${pos.join(' ')}] is legally executable on board`
      );
    }
  }

  console.log('\n================================================================');
  console.log(` RESULTS: ${passed} passed, ${failed} failed.`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runOpeningExplorerTests().catch((err) => {
  console.error('Fatal error in Opening Explorer tests:', err);
  process.exit(1);
});
