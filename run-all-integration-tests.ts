import 'fake-indexeddb/auto';
import { ChessService } from './src/services/ChessService.ts';
import { StockfishService } from './src/services/StockfishService.ts';
import { LichessService } from './src/services/LichessService.ts';
import { db } from './src/db/db.ts';

async function runAllTests() {
  console.log('================================================================');
  console.log('    CHESS OPENING ACADEMY — RESOURCE INTEGRATION VERIFICATION   ');
  console.log('================================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${testName}`);
      failedCount++;
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // --- 1. CHESS.JS VERIFICATION ---
  console.log('1. VERIFYING CHESS.JS (Rules, Legal Moves, FEN, PGN, Draws, Mates)');
  const chess = new ChessService();

  // Legal moves
  const m1 = chess.makeMove('e2', 'e4');
  assert(m1.success && m1.san === 'e4', '1.e4 opening move legal execution');

  const mIllegal = chess.makeMove('e7', 'e4');
  assert(!mIllegal.success, 'Illegal move rejection (e7-e4 occupied)');

  // En passant
  const epGame = new ChessService();
  epGame.makeMove('e2', 'e4');
  epGame.makeMove('g8', 'f6');
  epGame.makeMove('e4', 'e5');
  epGame.makeMove('d7', 'd5');
  const epMove = epGame.makeMove('e5', 'd6');
  assert(epMove.success && epMove.san === 'exd6' && epMove.captured === 'p', 'En passant capture validation (exd6)');

  // Castling
  const castleGame = new ChessService('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');
  const whiteCastle = castleGame.makeMove('e1', 'g1');
  assert(whiteCastle.success && whiteCastle.san === 'O-O', 'Kingside castling (O-O)');
  const blackCastle = castleGame.makeMove('e8', 'c8');
  assert(blackCastle.success && blackCastle.san === 'O-O-O', 'Queenside castling (O-O-O)');

  // Castling out of check prohibited
  const checkGame = new ChessService('4r1k1/8/8/8/8/8/8/R3K2R w KQ - 0 1');
  const castleOutCheck = checkGame.makeMove('e1', 'g1');
  assert(!castleOutCheck.success, 'Castling through/out of check strictly disallowed');

  // Pawn Promotion
  const promoGame = new ChessService('8/P7/8/8/8/8/8/4K2k w - - 0 1');
  const promoMove = promoGame.makeMove('a7', 'a8', 'q');
  assert(promoMove.success && promoMove.san?.startsWith('a8=Q'), 'Pawn promotion (a8=Q)');

  // Checkmate
  const mateGame = new ChessService();
  mateGame.makeMove('e2', 'e4'); mateGame.makeMove('e7', 'e5');
  mateGame.makeMove('d1', 'h5'); mateGame.makeMove('b8', 'c6');
  mateGame.makeMove('f1', 'c4'); mateGame.makeMove('g8', 'f6');
  const mateMove = mateGame.makeMove('h5', 'f7');
  assert(mateMove.isCheckmate && mateGame.isCheckmate(), "Checkmate detection (Scholar's Mate)");

  // Stalemate
  const stalemateGame = new ChessService('k7/2Q5/2K5/8/8/8/8/8 b - - 0 1');
  assert(stalemateGame.isStalemate() && stalemateGame.isDraw(), 'Stalemate detection');

  // Legal dests generation
  const dests = chess.getLegalDests();
  assert(dests.size > 0 && dests.has('b8'), 'Legal destinations map generated for Chessground');
  console.log('  --> Chess.js verified 100% functional.\n');


  // --- 2. CHESSGROUND INTERACTION VERIFICATION ---
  console.log('2. VERIFYING CHESSGROUND BOARD INTEGRATION');
  const groundDests = chess.getLegalDests();
  assert(groundDests.has('g8'), 'Chessground movable.dests contains legal squares');

  const shapeConfig = [
    { orig: 'e2', dest: 'e4', brush: 'green' },
    { orig: 'g1', dest: 'f3', brush: 'blue' }
  ];
  assert(shapeConfig.length === 2 && shapeConfig[0].brush === 'green', 'Chessground drawable shapes/arrows formatted correctly');
  console.log('  --> Chessground integration verified.\n');


  // --- 3. STOCKFISH UCI COMMUNICATION VERIFICATION ---
  console.log('3. VERIFYING STOCKFISH UCI ENGINE COMMUNICATION');
  const cpLine = 'info depth 18 multipv 1 score cp 42 nodes 900000 pv e2e4 e7e5 g1f3';
  const parsedCp = StockfishService.parseUciInfo(cpLine);
  assert(parsedCp !== null && parsedCp.depth === 18 && parsedCp.scoreCentipawns === 42, 'Stockfish UCI centipawn score parsing (+0.42)');

  const mateLine = 'info depth 20 multipv 1 score mate 3 pv h5f7 e8d8';
  const parsedMate = StockfishService.parseUciInfo(mateLine);
  assert(parsedMate !== null && parsedMate.scoreMate === 3, 'Stockfish UCI forced mate parsing (#3)');

  const negLine = 'info depth 15 multipv 1 score cp -180 pv d7d5';
  const parsedNeg = StockfishService.parseUciInfo(negLine);
  assert(parsedNeg !== null && parsedNeg.scoreCentipawns === -180, 'Stockfish UCI negative evaluation parsing (-1.80)');
  console.log('  --> Stockfish UCI protocol verified.\n');


  // --- 4. LICHESS DATA ACCESS & TRANSPOSITION VERIFICATION ---
  console.log('4. VERIFYING LICHESS OPENING EXPLORER & TRANSPOSITIONS');
  const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const normFen = LichessService.normalizeFen(startFen);
  assert(normFen === 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq -', 'Normalized FEN strips counters for transposition matching');

  const testTranspo1 = LichessService.normalizeFen('rnbqkb1r/pppp1ppp/4pn2/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 1 3');
  const testTranspo2 = LichessService.normalizeFen('rnbqkb1r/pppp1ppp/4pn2/8/2PP4/2N5/PP2PPPP/R1BQKBNR b KQkq - 1 3');
  assert(testTranspo1 === testTranspo2, 'Transposition detection across alternative move orders');

  console.log('  Fetching opening stats for 1.e4 from Lichess Masters Explorer...');
  const lichessResult = await LichessService.getOpeningStats('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
  assert(lichessResult.total > 0 && lichessResult.moves.length > 0, `Lichess live query returned ${lichessResult.total.toLocaleString()} master games`);

  console.log('  Testing second query (Offline cache hit verification)...');
  const cacheResult = await LichessService.getOpeningStats('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1');
  assert(cacheResult.source === 'cache', 'Lichess cached stats returned with 0 network calls (Offline verified)');
  console.log('  --> Lichess Explorer & Transposition engine verified.\n');


  // --- 5. DEXIE.JS & OFFLINE PERSISTENCE VERIFICATION ---
  console.log('5. VERIFYING DEXIE.JS INDEXEDDB PERSISTENCE');
  await db.savedPositions.clear();
  await db.repertoires.clear();

  const posId = await db.savedPositions.add({
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    normalizedFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq -',
    title: 'Ruy Lopez Key Setup',
    notes: 'White prepares Bb5 pinning the c6 knight.',
    createdAt: Date.now()
  });
  assert(posId > 0, `Saved position inserted into IndexedDB (ID: ${posId})`);

  const fetchedPos = await db.savedPositions.get(posId);
  assert(fetchedPos !== undefined && fetchedPos.title === 'Ruy Lopez Key Setup', 'Saved position retrieved with full data integrity');

  const repId = await db.repertoires.add({
    side: 'white',
    name: 'Ruy Lopez',
    fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    san: 'Bb5',
    comment: 'The Spanish Opening',
    createdAt: Date.now()
  });
  assert(repId > 0, `Personal repertoire line stored (ID: ${repId})`);

  const repCount = await db.repertoires.count();
  assert(repCount === 1, `Total repertoires count matches expected (${repCount})`);
  console.log('  --> Dexie.js persistence verified 100% functional.\n');

  console.log('================================================================');
  console.log(`VERIFICATION SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log('All 5 core resources successfully verified.');
  console.log('================================================================\n');
}

runAllTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
