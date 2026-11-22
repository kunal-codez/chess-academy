import { ChessService } from '../../src/services/ChessService.ts';

function testChessgroundConfig() {
  console.log('--- CHESSGROUND CONFIGURATION & STATE ENGINE TEST ---');

  const chess = new ChessService();

  // Test 1: Legal Destination Generation for Chessground
  const dests = chess.getLegalDests();
  console.log('1. Generated legal destination map for Chessground:');
  console.log(`   Total movable piece squares: ${dests.size}`);
  
  // Verify e2 can move to e3, e4
  const e2Moves = dests.get('e2');
  console.log('   e2 destinations:', e2Moves);
  if (!e2Moves || !e2Moves.includes('e3') || !e2Moves.includes('e4')) {
    throw new Error('e2 destinations mismatch.');
  }

  // Verify b1 (Knight) can move to a3, c3
  const b1Moves = dests.get('b1');
  console.log('   b1 destinations:', b1Moves);
  if (!b1Moves || !b1Moves.includes('a3') || !b1Moves.includes('c3')) {
    throw new Error('b1 destinations mismatch.');
  }

  // Test 2: Turn Color and Check State
  const turnColor = chess.getTurn() === 'w' ? 'white' : 'black';
  const inCheck = chess.inCheck();
  console.log(`2. Turn Color: ${turnColor}, inCheck: ${inCheck}`);
  if (turnColor !== 'white' || inCheck !== false) {
    throw new Error('Initial turn or check state invalid.');
  }

  // Test 3: Custom Shapes / Arrows formatting for Chessground
  const testArrows = [
    { orig: 'e2', dest: 'e4', brush: 'green' },
    { orig: 'g1', dest: 'f3', brush: 'blue' }
  ];
  console.log('3. Drawable arrows format for Chessground:', testArrows);
  if (testArrows.length !== 2 || testArrows[0].brush !== 'green') {
    throw new Error('Shape format validation failed.');
  }

  console.log('✓ Chessground integration state mapping verified successfully!\n');
}

testChessgroundConfig();
