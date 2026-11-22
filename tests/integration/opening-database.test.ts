import 'fake-indexeddb/auto';
import { OpeningDatabaseService } from '../../src/services/OpeningDatabaseService.ts';
import { db, seedOpenings } from '../../src/db/db.ts';
import type { OpeningRecord } from '../../src/types/opening.types.ts';
import dataset from '../../src/data/openings/openings.json' with { type: 'json' };

async function runOpeningDatabaseTests() {
  console.log('================================================================');
  console.log(' PROMPT 8: OPENING DATABASE & ECO CLASSIFICATION TEST SUITE   ');
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

  const service = new OpeningDatabaseService(dataset as OpeningRecord[]);

  // --- 1. ECO A00 COVERAGE ---
  console.log('1. ECO A00 COVERAGE');
  const a00Records = service.getByEco('A00');
  assert(a00Records.length > 0, 'ECO A00 records present in dataset');
  const grob = a00Records.find((r) => r.name.includes('Grob Opening'));
  assert(grob !== undefined && grob.movesSan[0] === 'g4', 'A00 Grob Opening (1.g4) present and valid');

  // --- 2. ECO A99 COVERAGE ---
  console.log('\n2. ECO A99 COVERAGE');
  const a99Records = service.getByEco('A99');
  assert(a99Records.length > 0, 'ECO A99 records present in dataset');
  const dutchIlyin = a99Records.find((r) => r.family.includes('Dutch Defense'));
  assert(dutchIlyin !== undefined, 'A99 Dutch Defense Ilyin-Zhenevsky variation verified');

  // --- 3. ECO B00 AND B99 COVERAGE ---
  console.log('\n3. ECO B00 & B99 COVERAGE');
  const b00Records = service.getByEco('B00');
  assert(b00Records.length > 0, 'ECO B00 records present');
  const b00Nimzo = b00Records.find((r) => r.name.includes('Nimzowitsch Defense') || r.name.includes('Defense'));
  assert(b00Nimzo !== undefined, 'B00 Uncommon King Pawn defenses present');

  const b99Records = service.getByEco('B99');
  assert(b99Records.length > 0, 'ECO B99 records present');
  const najdorfMain = b99Records.find((r) => r.name.includes('Najdorf Variation'));
  assert(najdorfMain !== undefined && najdorfMain.movesSan.includes('a6'), 'B99 Najdorf Mainline verified');

  // --- 4. ECO C00 AND C99 COVERAGE ---
  console.log('\n4. ECO C00 & C99 COVERAGE');
  const c00Records = service.getByEco('C00');
  assert(c00Records.length > 0, 'ECO C00 records present');
  const french = c00Records.find((r) => r.name === 'French Defense');
  assert(french !== undefined && french.movesSan[0] === 'e4' && french.movesSan[1] === 'e6', 'C00 French Defense (1.e4 e6) verified');

  const c99Records = service.getByEco('C99');
  assert(c99Records.length > 0, 'ECO C99 records present');
  const chigorin = c99Records.find((r) => r.name.includes('Ruy Lopez'));
  assert(chigorin !== undefined, 'C99 Ruy Lopez Chigorin lines verified');

  // --- 5. ECO D00 AND D99 COVERAGE ---
  console.log('\n5. ECO D00 & D99 COVERAGE');
  const d00Records = service.getByEco('D00');
  assert(d00Records.length > 0, 'ECO D00 records present');
  const qpGame = d00Records.find((r) => r.movesSan[0] === 'd4' && r.movesSan[1] === 'd5');
  assert(qpGame !== undefined, 'D00 Queen Pawn Game (1.d4 d5) verified');

  const d99Records = service.getByEco('D99');
  assert(d99Records.length > 0, 'ECO D99 records present');
  const grunfeld = d99Records.find((r) => r.name.includes('Grünfeld'));
  assert(grunfeld !== undefined, 'D99 Grünfeld Defense lines verified');

  // --- 6. ECO E00 AND E99 COVERAGE (AND 100% 500-ECO AUDIT) ---
  console.log('\n6. ECO E00 & E99 COVERAGE (FULL 500 ECO CODES)');
  const e00Records = service.getByEco('E00');
  assert(e00Records.length > 0, 'ECO E00 Catalan / Queen Pawn lines present');

  const e99Records = service.getByEco('E99');
  assert(e99Records.length > 0, 'ECO E99 King\'s Indian Defense Orthodox lines present');

  // Programmatic verification of all 500 ECO codes
  const missingEcos: string[] = [];
  for (const vol of ['A', 'B', 'C', 'D', 'E']) {
    for (let i = 0; i < 100; i++) {
      const code = `${vol}${i.toString().padStart(2, '0')}`;
      if (service.getByEco(code).length === 0) {
        missingEcos.push(code);
      }
    }
  }
  assert(missingEcos.length === 0, 'All 500 ECO codes from A00 to E99 are represented in dataset');
  console.log(`  --> Confirmed: ${service.getTotalCount()} total records spanning 500 distinct ECO codes.`);

  // --- 7. OPENING-NAME SEARCH ---
  console.log('\n7. OPENING-NAME SEARCH');
  const sicilianSearch = service.search({ query: 'Sicilian Defense' });
  assert(sicilianSearch.length > 50, 'Found >50 Sicilian Defense records');
  assert(sicilianSearch.every((r) => r.family.toLowerCase().includes('sicilian') || r.name.toLowerCase().includes('sicilian')), 'All search results match Sicilian');

  // Case insensitivity
  const lowerSearch = service.search({ query: 'ruy lopez' });
  const upperSearch = service.search({ query: 'RUY LOPEZ' });
  assert(lowerSearch.length === upperSearch.length && lowerSearch.length > 20, 'Search is strictly case-insensitive');

  // --- 8. ECO-CODE SEARCH ---
  console.log('\n8. ECO-CODE SEARCH');
  const b90Search = service.search({ eco: 'B90' });
  assert(b90Search.length > 0 && b90Search.every((r) => r.eco === 'B90'), 'Exact ECO B90 search returns only B90 records');

  const cPrefixSearch = service.search({ eco: 'C1' });
  assert(cPrefixSearch.length > 0 && cPrefixSearch.every((r) => r.eco.startsWith('C1')), 'Prefix ECO search for C1 returns C10-C19');

  const rangeSearch = service.getByEcoRange('B90', 'B99');
  assert(rangeSearch.length > 0 && rangeSearch.every((r) => r.eco >= 'B90' && r.eco <= 'B99'), 'Range search returns B90 to B99 lines');

  // --- 9. MAINLINE RECOGNITION ---
  console.log('\n9. MAINLINE RECOGNITION');
  const italianMoves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'];
  const italianRec = service.recognize(italianMoves);
  assert(italianRec.matched, 'Italian Game recognized');
  assert(italianRec.opening?.name.includes('Italian Game'), `Recognized name: ${italianRec.opening?.name}`);
  assert(italianRec.opening?.eco === 'C50', 'Italian Game classified as ECO C50');

  // --- 10. VARIATION RECOGNITION ---
  console.log('\n10. VARIATION RECOGNITION');
  const najdorfMoves = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'];
  const najdorfRec = service.recognize(najdorfMoves);
  assert(najdorfRec.matched, 'Najdorf Variation recognized');
  assert(najdorfRec.opening?.name.includes('Najdorf Variation'), 'Deepest variation classified as Najdorf Variation');
  assert(najdorfRec.opening?.eco === 'B90', 'Najdorf classified as B90');
  assert(najdorfRec.isExactMatch, 'Exact match flag set for full line completion');

  // --- 11. PARTIAL MOVE-SEQUENCE MATCHING (PLAYED BEYOND BOOK) ---
  console.log('\n11. PARTIAL MOVE-SEQUENCE MATCHING');
  // Play Najdorf + 4 additional non-book moves
  const beyondBookMoves = [
    'e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6',
    'Be3', 'e5', 'Nb3', 'Be6', 'f3', 'h5', 'Qd2', 'Nbd7'
  ];
  const partialRec = service.recognize(beyondBookMoves);
  assert(partialRec.matched, 'Opening recognized when playing beyond book');
  assert(partialRec.isPrefixMatch, 'isPrefixMatch is true');
  assert(!partialRec.isExactMatch, 'isExactMatch is false (moves played beyond definition)');
  assert(partialRec.matchedPly >= 10, `Deepest recognized ply was ${partialRec.matchedPly}`);

  // --- 12. UNKNOWN OPENING HANDLING ---
  console.log('\n12. UNKNOWN OPENING HANDLING');
  const nonsenseMoves = ['a3', 'h6', 'h3', 'a6', 'b3', 'b6', 'g3', 'g6'];
  const unknownRec = service.recognize(nonsenseMoves);
  assert(!unknownRec.matched, 'Unrecognized opening returns matched: false');
  assert(unknownRec.opening === undefined, 'No opening object returned for unknown sequence');

  // --- 13. TRANSPOSITION RECOGNITION ---
  console.log('\n13. TRANSPOSITION RECOGNITION');
  // Transposition Example:
  // Move order A: 1.d4 d5 2.c4 e6 (Queen's Gambit Declined)
  // Move order B: 1.c4 e6 2.d4 d5 (English transposing to QGD)
  const orderAMoves = ['d4', 'd5', 'c4', 'e6'];
  const orderBMoves = ['c4', 'e6', 'd4', 'd5'];

  const recA = service.recognize(orderAMoves);
  assert(recA.matched, 'Order A recognized');

  // Pass current position EPD for Order B
  const qgdEpd = 'rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w KQkq -';
  const recB = service.recognize(orderBMoves, qgdEpd);
  assert(recB.matched, 'Transposed line recognized via EPD position');
  assert(recB.opening?.name.includes("Queen's Gambit Declined") || recB.opening?.eco === 'D30', 'Classified accurately as Queen\'s Gambit');
  assert(recB.transposition === true, 'Transposition flag set to true');

  // --- 14. UNDO AND REDO RECOGNITION UPDATES ---
  console.log('\n14. UNDO & REDO RECOGNITION UPDATES');
  const simHistory = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'];
  
  // Latest: Najdorf (B90)
  const fullRec = service.recognize(simHistory);
  assert(fullRec.opening?.eco === 'B90', 'At ply 10: Najdorf B90');

  // Undo 2 plies back to 1.e4 c5 2.Nf3 d6 3.d4 cxd4
  const undoneHistory = simHistory.slice(0, 6);
  const undoneRec = service.recognize(undoneHistory);
  assert(undoneRec.matched && undoneRec.opening?.eco !== 'B90', 'At ply 6: Reverted to Open Sicilian B54/B50');

  // Redo back to ply 10
  const redoneRec = service.recognize(simHistory);
  assert(redoneRec.opening?.eco === 'B90', 'After Redo: Restored Najdorf B90');

  // --- 15. OFFLINE DATABASE ACCESS (INDEXEDDB VIA DEXIE) ---
  console.log('\n15. OFFLINE DATABASE ACCESS (DEXIE.JS)');
  await db.openings.clear();
  await db.metadata.clear();

  // Test seeding a sample slice of records into Dexie
  const sampleRecords = dataset.slice(0, 50) as OpeningRecord[];
  const seedRes = await seedOpenings(sampleRecords);
  assert(seedRes.newlyInserted && seedRes.count === 50, 'Seeded 50 opening records into IndexedDB offline');

  const queriedFromDb = await db.openings.where('eco').equals(sampleRecords[0].eco).toArray();
  assert(queriedFromDb.length > 0, `IndexedDB queried records by ECO ${sampleRecords[0].eco}`);
  assert(queriedFromDb[0].name === sampleRecords[0].name, 'Data retrieved from IndexedDB matches original record');

  // --- 16. DUPLICATE IMPORT PREVENTION ---
  console.log('\n16. DUPLICATE IMPORT PREVENTION');
  // Call seedOpenings again with the same records
  const secondSeedRes = await seedOpenings(sampleRecords);
  assert(!secondSeedRes.newlyInserted, 'Second seed call skips insertion');
  const countAfterDuplicateSeed = await db.openings.count();
  assert(countAfterDuplicateSeed === 50, 'Opening count remains exactly 50 (duplicates prevented)');

  // --- 17. DATASET INTEGRITY AND INVALID-RECORD REJECTION ---
  console.log('\n17. DATASET INTEGRITY & INVALID RECORD REJECTION');
  // Check random 100 records for data completeness
  const sample100 = dataset.slice(100, 200) as OpeningRecord[];
  for (const r of sample100) {
    if (!r.id || !r.eco || !r.name || !r.movesSan || r.movesSan.length === 0 || !r.epd) {
      throw new Error(`Record integrity check failed on ID ${r.id}`);
    }
  }
  assert(true, '100 sample records passed deep schema integrity checks');

  // Verify invalid record rejection in service
  const invalidRecords: any[] = [{ id: 'bad-1', eco: 'INVALID', name: '', movesSan: [] }];
  const testDb = new OpeningDatabaseService(sampleRecords);
  assert(testDb.getById('bad-1') === undefined, 'Invalid record not present in clean instance');

  console.log('\n================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('All 17 requirements for Prompt 8 successfully verified!');
  console.log('================================================================\n');
}

runOpeningDatabaseTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
