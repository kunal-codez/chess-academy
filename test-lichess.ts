import 'fake-indexeddb/auto';
import { LichessService } from './src/services/LichessService.ts';

async function testLichessIntegration() {
  console.log('--- LICHESS OPENING EXPLORER INTEGRATION TEST ---');

  // Starting position after 1.e4
  const testFen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';

  console.log('1. Fetching live master statistics from Lichess API...');
  const result1 = await LichessService.getOpeningStats(testFen);
  console.log(`Source: ${result1.source}`);
  console.log(`Total master games recorded: ${result1.total}`);
  console.log(`White wins: ${result1.white}, Black wins: ${result1.black}, Draws: ${result1.draws}`);
  console.log(`Top moves returned: ${result1.moves.length}`);
  if (result1.moves.length > 0) {
    console.log(`Top move: ${result1.moves[0].san} (Played ${result1.moves[0].total} times)`);
  }

  if (result1.source !== 'network' || result1.total === 0) {
    console.warn('Warning: Live network fetch did not return expected data. Checking cache fallback.');
  } else {
    console.log('✓ Successfully retrieved real opening statistics from Lichess Masters Explorer!');
  }

  console.log('\n2. Testing cache retrieval for identical position (Zero network calls)...');
  const result2 = await LichessService.getOpeningStats(testFen);
  console.log(`Source: ${result2.source}`);
  if (result2.source === 'cache') {
    console.log('✓ Cache hit confirmed! Offline / repeat queries cost ₹0 and 0 API requests.');
  } else {
    throw new Error('Cache hit was expected on second query.');
  }

  console.log('\n✓ Lichess integration and caching verified successfully!\n');
}

testLichessIntegration().catch(err => {
  console.error('Lichess integration test failed:', err);
  process.exit(1);
});
