import { StockfishService } from '../../src/services/StockfishService.ts';

function testStockfishParser() {
  console.log('--- STOCKFISH UCI ENGINE INTEGRATION TEST ---');

  // Test 1: Standard Centipawn evaluation line
  const cpLine = 'info depth 18 seldepth 22 multipv 1 score cp 38 nodes 812400 nps 1500000 time 541 pv e2e4 e7e5 g1f3 b8c6 f1b5';
  const parsedCp = StockfishService.parseUciInfo(cpLine);
  console.log('1. Parsed Centipawn Evaluation:', parsedCp);
  if (!parsedCp || parsedCp.depth !== 18 || parsedCp.scoreCentipawns !== 38 || parsedCp.bestMove !== 'e2e4') {
    throw new Error('Centipawn parsing failed.');
  }
  console.log('✓ Centipawn UCI line parsed successfully (+0.38 pawns, depth 18).');

  // Test 2: Forced Mate evaluation line
  const mateLine = 'info depth 21 multipv 1 score mate 2 nodes 120400 nps 1100000 time 109 pv h5f7 e8d8 f7f8';
  const parsedMate = StockfishService.parseUciInfo(mateLine);
  console.log('\n2. Parsed Mate Evaluation:', parsedMate);
  if (!parsedMate || parsedMate.depth !== 21 || parsedMate.scoreMate !== 2 || parsedMate.bestMove !== 'h5f7') {
    throw new Error('Mate parsing failed.');
  }
  console.log('✓ Forced Mate UCI line parsed successfully (Mate in 2, depth 21).');

  // Test 3: Black Advantage (negative centipawns)
  const blackAdvantageLine = 'info depth 16 multipv 1 score cp -175 nodes 500000 nps 1200000 time 410 pv d7d5 e4d5 d8d5 b1c3 d5a5';
  const parsedBlack = StockfishService.parseUciInfo(blackAdvantageLine);
  console.log('\n3. Parsed Black Advantage:', parsedBlack);
  if (!parsedBlack || parsedBlack.scoreCentipawns !== -175) {
    throw new Error('Black advantage score parsing failed.');
  }
  console.log('✓ Negative score parsed successfully (-1.75 pawns for White).');

  // Test 4: Verify Non-eval strings return null safely
  const stringLine = 'info string NNUE evaluation loaded successfully';
  const parsedString = StockfishService.parseUciInfo(stringLine);
  if (parsedString !== null) {
    throw new Error('Non-eval line should return null.');
  }
  console.log('✓ Informational engine strings handled without errors.');

  console.log('\n✓ All Stockfish UCI parsing and communication logic verified successfully!\n');
}

testStockfishParser();
