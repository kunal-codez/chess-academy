import 'fake-indexeddb/auto';
import { db } from '../../src/db/db.ts';

async function testDatabase() {
  console.log('--- DEXIE.JS DATABASE INTEGRATION TEST ---');
  
  // 1. Clear any prior test entries
  await db.savedPositions.clear();
  await db.repertoires.clear();
  await db.lichessCache.clear();

  // 2. Insert Saved Position
  const posId = await db.savedPositions.add({
    fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
    normalizedFen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3',
    title: "King's Pawn Opening (1.e4)",
    notes: 'Key starting move controlling d5 and f5 squares.',
    createdAt: Date.now()
  });
  console.log(`✓ Inserted saved position with ID: ${posId}`);

  // 3. Query Saved Position
  const fetchedPos = await db.savedPositions.get(posId);
  console.log(`✓ Retrieved position: "${fetchedPos?.title}"`);
  if (!fetchedPos || fetchedPos.title !== "King's Pawn Opening (1.e4)") {
    throw new Error('Position retrieval failed or corrupted.');
  }

  // 4. Insert Repertoire Line
  const repId = await db.repertoires.add({
    side: 'white',
    name: 'Italian Game Mainline',
    fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    san: 'Bc4',
    comment: 'Classical development targeting the vulnerable f7 square.',
    createdAt: Date.now()
  });
  console.log(`✓ Inserted repertoire line with ID: ${repId}`);

  // 5. Test Lichess Offline Cache
  const testFenKey = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3';
  await db.lichessCache.put({
    fenKey: testFenKey,
    whiteWins: 450000,
    blackWins: 380000,
    draws: 320000,
    totalGames: 1150000,
    cachedAt: Date.now(),
    topMoves: [
      { san: 'c5', uci: 'c7c5', white: 180000, black: 170000, draws: 130000 },
      { san: 'e5', uci: 'e7e5', white: 150000, black: 120000, draws: 110000 }
    ]
  });
  console.log(`✓ Cached Lichess stats for: ${testFenKey}`);

  // 6. Retrieve from Cache (Simulating offline query)
  const cachedData = await db.lichessCache.get(testFenKey);
  console.log(`✓ Offline cache query successful: Total games cached = ${cachedData?.totalGames}`);
  if (!cachedData || cachedData.totalGames !== 1150000 || cachedData.topMoves.length !== 2) {
    throw new Error('Cache verification failed.');
  }

  console.log('✓ All Dexie.js database read/write and caching tests PASSED!\n');
}

testDatabase().catch((err) => {
  console.error('Dexie test failed:', err);
  process.exit(1);
});
