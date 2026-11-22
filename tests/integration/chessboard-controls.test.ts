import { ChessService } from '../../src/services/ChessService.ts';

async function runChessboardControlsTests() {
  console.log('================================================================');
  console.log(' PROMPT 7: INTERACTIVE CHESSBOARD & CONTROLS ENGINE TEST SUITE ');
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

  // --- 1. INITIAL BOARD POSITION ---
  console.log('1. INITIAL BOARD POSITION');
  const game = new ChessService();
  assert(
    game.getFen() === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    'Initial starting FEN is exact standard position'
  );
  assert(game.getTurn() === 'w', 'Initial turn is White');
  assert(game.getSnapshots().length === 0, 'Initial snapshot history is empty');
  assert(game.getLegalMoves().length === 20, 'Initial position has exactly 20 legal moves');
  assert(!game.inCheck() && !game.isGameOver(), 'Initial position is not in check and not game over');

  // --- 2. LEGAL MOVE EXECUTION ---
  console.log('\n2. LEGAL MOVE EXECUTION');
  const m1 = game.makeMove('e2', 'e4');
  assert(m1.success && m1.san === 'e4', 'Legal move 1.e4 executed successfully');
  assert(game.getFen().includes('4P3'), 'FEN updated to reflect pawn on e4');
  assert(game.getSnapshots().length === 1, 'Move snapshot recorded in history');

  // --- 3. ILLEGAL MOVE REJECTION ---
  console.log('\n3. ILLEGAL MOVE REJECTION');
  const initialFenAfterE4 = game.getFen();
  const illegalMove = game.makeMove('e7', 'e4'); // Black cannot move pawn onto occupied e4
  assert(!illegalMove.success, 'Illegal move (e7-e4 into occupied square) rejected');
  assert(game.getFen() === initialFenAfterE4, 'Board FEN unmodified after illegal move rejection');

  // Illegal piece move: Black king trying to move to e7 through pawns
  const illegalKing = game.makeMove('e8', 'e7');
  assert(!illegalKing.success, 'Illegal king move through pawn rejected');

  // --- 4. TURN SWITCHING ---
  console.log('\n4. TURN SWITCHING');
  assert(game.getTurn() === 'b', 'Turn switched to Black after 1.e4');
  const mBlack = game.makeMove('e7', 'e5');
  assert(mBlack.success && mBlack.san === 'e5', 'Black played 1...e5 successfully');
  assert(game.getTurn() === 'w', 'Turn switched back to White after 1...e5');
  assert(game.getGameStatus().fullmoveNumber === 2, 'Fullmove counter incremented to 2');

  // --- 5. CASTLING (KINGSIDE & QUEENSIDE) ---
  console.log('\n5. CASTLING');
  // Setup position with castling rights
  const castleGame = new ChessService('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const whiteO_O = castleGame.makeMove('e1', 'g1');
  assert(whiteO_O.success && whiteO_O.san === 'O-O', 'White executes Kingside Castling (O-O)');
  assert(castleGame.getFen().includes('R4RK1'), 'White king on g1 and rook on f1');

  const blackO_O_O = castleGame.makeMove('e8', 'c8');
  assert(blackO_O_O.success && blackO_O_O.san === 'O-O-O', 'Black executes Queenside Castling (O-O-O)');
  assert(castleGame.getFen().includes('2kr3r'), 'Black king on c8 and rook on d8');

  // Disallow castling through check
  const checkCastleGame = new ChessService('4r1k1/8/8/8/8/8/8/R3K2R w KQ - 0 1');
  assert(checkCastleGame.inCheck(), 'White King is in check');
  const illegalCastleOutCheck = checkCastleGame.makeMove('e1', 'g1');
  assert(!illegalCastleOutCheck.success, 'Cannot castle while in check');

  // --- 6. EN PASSANT ---
  console.log('\n6. EN PASSANT');
  const epGame = new ChessService();
  epGame.makeMove('e2', 'e4');
  epGame.makeMove('g8', 'f6');
  epGame.makeMove('e4', 'e5');
  epGame.makeMove('d7', 'd5'); // Two-square pawn advance triggering en passant

  assert(epGame.getFen().includes('d6'), 'En passant square d6 recorded in FEN');
  const epCapture = epGame.makeMove('e5', 'd6');
  assert(
    epCapture.success && epCapture.san === 'exd6' && epCapture.captured === 'p',
    'En passant capture executed (exd6)'
  );
  assert(!epGame.getFen().includes('3pP3'), 'Captured d5 pawn removed from board');

  // --- 7. PAWN PROMOTION ---
  console.log('\n7. PAWN PROMOTION');
  const promoGame = new ChessService('8/P7/8/8/8/8/8/4K2k w - - 0 1');
  assert(promoGame.isPromotionMove('a7', 'a8'), 'isPromotionMove detects promotion at rank 8');

  // Promote to Queen
  const promoQ = promoGame.makeMove('a7', 'a8', 'q');
  assert(promoQ.success && promoQ.san?.startsWith('a8=Q'), 'Pawn promotes to Queen (a8=Q)');

  // Promote to Knight
  const promoKnightGame = new ChessService('8/P7/8/8/8/8/8/4K2k w - - 0 1');
  const promoN = promoKnightGame.makeMove('a7', 'a8', 'n');
  assert(promoN.success && promoN.san === 'a8=N', 'Pawn promotes to Knight (a8=N)');

  // Promote to Rook
  const promoRookGame = new ChessService('8/P7/8/8/8/8/8/4K2k w - - 0 1');
  const promoR = promoRookGame.makeMove('a7', 'a8', 'r');
  assert(promoR.success && promoR.san === 'a8=R', 'Pawn promotes to Rook (a8=R)');

  // Promote to Bishop
  const promoBishopGame = new ChessService('8/P7/8/8/8/8/8/4K2k w - - 0 1');
  const promoB = promoBishopGame.makeMove('a7', 'a8', 'b');
  assert(promoB.success && promoB.san?.startsWith('a8=B'), 'Pawn promotes to Bishop (a8=B)');

  // --- 8. CHECK DETECTION ---
  console.log('\n8. CHECK DETECTION');
  const checkPosition = new ChessService('rnbqkbnr/ppppp2p/5p2/6pQ/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 3');
  assert(checkPosition.inCheck(), 'Check detected accurately on Black King');
  const checkStatus = checkPosition.getGameStatus();
  assert(checkStatus.inCheck && checkStatus.turn === 'black', 'Status indicates Black is in check');

  // --- 9. CHECKMATE ---
  console.log('\n9. CHECKMATE');
  const mateGame = new ChessService();
  mateGame.makeMove('f2', 'f3');
  mateGame.makeMove('e7', 'e5');
  mateGame.makeMove('g2', 'g4');
  mateGame.makeMove('d8', 'h4'); // Fool's Mate

  assert(mateGame.isCheckmate(), "Fool's mate detected as checkmate");
  assert(mateGame.isGameOver(), 'Game over flag set to true');
  const mateStatus = mateGame.getGameStatus();
  assert(mateStatus.status === 'checkmate' && mateStatus.winner === 'black', 'Winner accurately identified as Black');

  // --- 10. STALEMATE & DRAWS ---
  console.log('\n10. STALEMATE & DRAWS');
  const stalemateGame = new ChessService('k7/2Q5/2K5/8/8/8/8/8 b - - 0 1');
  assert(stalemateGame.isStalemate(), 'Stalemate detected (King not in check, no legal moves)');
  assert(stalemateGame.isDraw(), 'Stalemate classified as draw');
  assert(stalemateGame.getGameStatus().status === 'stalemate', 'Game status shows stalemate');

  // Insufficient Material Draw
  const insufficientGame = new ChessService('8/8/8/8/8/4k3/8/4K3 w - - 0 1');
  assert(insufficientGame.isInsufficientMaterial(), 'King vs King detected as insufficient material draw');
  assert(insufficientGame.getGameStatus().status === 'insufficient_material', 'Status shows insufficient material');

  // --- 11. UNDO AND REDO ---
  console.log('\n11. UNDO AND REDO');
  const testUndoGame = new ChessService();
  testUndoGame.makeMove('e2', 'e4');
  testUndoGame.makeMove('e7', 'e5');
  testUndoGame.makeMove('g1', 'f3');
  assert(testUndoGame.getSnapshots().length === 3, '3 plies played');
  assert(testUndoGame.canUndo(), 'canUndo is true');

  // Undo 2.Nf3
  const undoneMove = testUndoGame.undo();
  assert(undoneMove !== null && undoneMove.san === 'Nf3', '2.Nf3 undone successfully');
  assert(testUndoGame.getSnapshots().length === 2, 'Snapshots reduced to 2');
  assert(testUndoGame.getTurn() === 'w', 'Turn restored to White');
  assert(testUndoGame.canRedo(), 'canRedo is true after undo');

  // Redo 2.Nf3
  const redoneMove = testUndoGame.redo();
  assert(redoneMove !== null && redoneMove.san === 'Nf3', '2.Nf3 redone successfully');
  assert(testUndoGame.getSnapshots().length === 3, 'Snapshots restored to 3');
  assert(testUndoGame.getTurn() === 'b', 'Turn restored to Black');

  // Playing a move after undo clears redo stack
  testUndoGame.undo(); // Undo 2.Nf3 again
  testUndoGame.makeMove('f2', 'f4'); // Play 2.f4 (King's Gambit) instead
  assert(!testUndoGame.canRedo(), 'Redo stack cleared after divergent move played');

  // --- 12. FEN EXPORT AND IMPORT ---
  console.log('\n12. FEN EXPORT AND IMPORT');
  const fenGame = new ChessService();
  fenGame.makeMove('d2', 'd4');
  fenGame.makeMove('d7', 'd5');
  const exportedFen = fenGame.getFen();
  assert(typeof exportedFen === 'string' && exportedFen.includes('3p4'), 'FEN exported accurately');

  // Import valid FEN
  const targetFen = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
  const loadRes = fenGame.load(targetFen);
  assert(loadRes.success, 'Valid FEN loaded successfully');
  assert(fenGame.getFen() === targetFen, 'Loaded FEN matches target exactly');

  // Import invalid FEN
  const badRes = fenGame.load('invalid-fen-string-here');
  assert(!badRes.success && badRes.error !== undefined, 'Invalid FEN properly rejected with error message');

  // --- 13. PGN EXPORT AND IMPORT ---
  console.log('\n13. PGN EXPORT AND IMPORT');
  const pgnGame = new ChessService();
  pgnGame.makeMove('e2', 'e4');
  pgnGame.makeMove('e7', 'e5');
  pgnGame.makeMove('g1', 'f3');
  pgnGame.makeMove('b8', 'c6');
  const exportedPgn = pgnGame.getPgn();
  assert(exportedPgn.includes('1. e4 e5 2. Nf3 Nc6'), 'PGN string exported correctly');

  // Import valid PGN
  const newPgnGame = new ChessService();
  const importPgnRes = newPgnGame.loadPgn('1. d4 Nf6 2. c4 e6 3. Nc3 Bb4');
  assert(importPgnRes.success, 'Valid PGN loaded successfully');
  assert(newPgnGame.getSnapshots().length === 6, 'All 6 plies loaded into snapshots');
  assert(newPgnGame.getSnapshots()[5].san === 'Bb4', 'Last loaded move is Nimzo-Indian Bb4');

  // --- 14. MOVE HISTORY NAVIGATION ---
  console.log('\n14. MOVE HISTORY NAVIGATION');
  const navGame = new ChessService();
  navGame.makeMove('e2', 'e4');
  navGame.makeMove('c7', 'c5'); // Sicilian
  navGame.makeMove('g1', 'f3');

  const startFen = navGame.getFenAtPly(0);
  assert(startFen === navGame.getInitialFen(), 'Ply 0 returns starting FEN');

  const ply1Fen = navGame.getFenAtPly(1);
  assert(ply1Fen.includes('4P3') && !ply1Fen.includes('2p5'), 'Ply 1 contains only 1.e4');

  const ply2Fen = navGame.getFenAtPly(2);
  assert(ply2Fen.includes('2p5'), 'Ply 2 contains 1...c5');

  const latestFen = navGame.getFenAtPly(3);
  assert(latestFen === navGame.getFen(), 'Ply 3 matches latest game position');

  // --- 15. BOARD ORIENTATION & CHESSGROUND INTEGRATION ---
  console.log('\n15. BOARD ORIENTATION & CHESSGROUND INTEGRATION');
  const cgGame = new ChessService();
  const dests = cgGame.getLegalDests();
  assert(dests instanceof Map, 'Legal dests returns Map');
  assert(dests.has('e2') && dests.get('e2')?.includes('e4'), 'e2 legal dests include e4');
  assert(dests.has('b1') && dests.get('b1')?.includes('c3'), 'b1 knight legal dests include c3');
  assert(!dests.has('e1'), 'King on e1 has no legal destinations at initial position');

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('All 15 requirement points successfully verified!');
  console.log('================================================================\n');
}

runChessboardControlsTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
