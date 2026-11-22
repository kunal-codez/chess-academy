import 'fake-indexeddb/auto';
import { db } from '../../src/db/db.ts';
import { repertoireService } from '../../src/services/RepertoireService.ts';
import { ChessService } from '../../src/services/ChessService.ts';
import { openingDatabase } from '../../src/services/OpeningDatabaseService.ts';

async function runRepertoireBuilderTests() {
  console.log('================================================================');
  console.log(' PROMPT 11: PERSONAL REPERTOIRE BUILDER TEST SUITE             ');
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

  // Clear tables before starting
  await db.personalRepertoires.clear();
  await db.repertoireLines.clear();

  // -------------------------------------------------------------------------
  // 1. REPERTOIRE CREATION (WHITE & BLACK)
  // -------------------------------------------------------------------------
  console.log('1. REPERTOIRE CREATION (WHITE & BLACK)');
  const whiteRep = await repertoireService.createRepertoire('1.e4 Attacking Repertoire', 'white', 'My primary White weapon');
  assert(typeof whiteRep.id === 'string' && whiteRep.id.length > 0, 'White repertoire created with valid UUID');
  assert(whiteRep.name === '1.e4 Attacking Repertoire', 'White repertoire name stored correctly');
  assert(whiteRep.color === 'white', 'White repertoire color flag set to "white"');
  assert(whiteRep.description === 'My primary White weapon', 'White repertoire description preserved');
  assert(
    (typeof whiteRep.createdAt === 'string' && !isNaN(new Date(whiteRep.createdAt).getTime())) ||
    (whiteRep.createdAt instanceof Date && !isNaN(whiteRep.createdAt.getTime())),
    'White repertoire has valid creation timestamp'
  );

  const blackRep = await repertoireService.createRepertoire('Sicilian & King\'s Indian', 'black', 'Aggressive counter-attacking lines');
  assert(typeof blackRep.id === 'string' && blackRep.id.length > 0, 'Black repertoire created with valid UUID');
  assert(blackRep.color === 'black', 'Black repertoire color flag set to "black"');

  const allReps = await repertoireService.getAllRepertoires();
  assert(allReps.length === 2, 'getAllRepertoires returns both created repertoires');

  const whiteOnly = await repertoireService.getRepertoiresByColor('white');
  assert(whiteOnly.length === 1 && whiteOnly[0].id === whiteRep.id, 'getRepertoiresByColor("white") filters accurately');

  const blackOnly = await repertoireService.getRepertoiresByColor('black');
  assert(blackOnly.length === 1 && blackOnly[0].id === blackRep.id, 'getRepertoiresByColor("black") filters accurately');

  // -------------------------------------------------------------------------
  // 2. SAVING VALID LINES & AUTO-RECOGNITION
  // -------------------------------------------------------------------------
  console.log('\n2. SAVING VALID LINES & AUTO-RECOGNITION');
  // Najdorf line in Black repertoire: 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6
  const najdorfMoves = ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6', 'Nc3', 'a6'];
  const najdorfResult = await repertoireService.saveLine({
    repertoireId: blackRep.id,
    movesSan: najdorfMoves,
    notes: 'Key move 5...a6 prevents Nb5/Bb5+ pins and prepares ...e5 / ...b5',
    tags: ['sicilian', 'najdorf', 'tactical']
  });

  assert(najdorfResult.success === true, 'Najdorf move sequence successfully saved');
  assert(!najdorfResult.isDuplicate, 'Najdorf is not flagged as duplicate on initial save');
  assert(najdorfResult.line !== undefined, 'Line object returned from saveLine');

  const savedNajdorf = najdorfResult.line!;
  assert(savedNajdorf.repertoireId === blackRep.id, 'Line accurately references parent black repertoire ID');
  assert(savedNajdorf.movesSan.length === 10, 'All 10 moves recorded in order');
  assert(savedNajdorf.movesUci.length === 10 && savedNajdorf.movesUci[9] === 'a7a6', 'UCI moves computed correctly (a7a6 for a6)');
  assert(savedNajdorf.finalFen.includes('rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R'), 'Final FEN computed accurately');
  assert(savedNajdorf.eco === 'B90' || savedNajdorf.eco.startsWith('B'), `ECO classification auto-detected: ${savedNajdorf.eco}`);
  assert(savedNajdorf.name.toLowerCase().includes('najdorf') || savedNajdorf.name.toLowerCase().includes('sicilian'), `Opening name auto-detected: ${savedNajdorf.name}`);
  assert(savedNajdorf.tags.includes('najdorf'), 'Custom tags preserved');
  assert(savedNajdorf.notes.includes('5...a6 prevents Nb5'), 'User notes preserved');

  // Save Ruy Lopez line in White repertoire: 1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O
  const ruyMoves = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6', 'O-O'];
  const ruyResult = await repertoireService.saveLine({
    repertoireId: whiteRep.id,
    movesSan: ruyMoves,
    name: 'Spanish Main Line (5.O-O)',
    notes: 'Castling prepares Re1 and d4 strike',
    tags: ['open-game', 'ruy-lopez']
  });

  assert(ruyResult.success === true, 'Ruy Lopez sequence successfully saved');
  assert(ruyResult.line!.name === 'Spanish Main Line (5.O-O)', 'Custom user name preserved when explicitly supplied');
  assert(ruyResult.line!.eco === 'C65' || ruyResult.line!.eco.startsWith('C'), `Ruy Lopez ECO auto-assigned: ${ruyResult.line!.eco}`);

  // -------------------------------------------------------------------------
  // 3. DUPLICATE MOVE SEQUENCE PROTECTION
  // -------------------------------------------------------------------------
  console.log('\n3. DUPLICATE MOVE SEQUENCE PROTECTION');
  // Attempt to save identical Najdorf line in the same Black repertoire
  const dupResult = await repertoireService.saveLine({
    repertoireId: blackRep.id,
    movesSan: najdorfMoves,
    notes: 'Trying to duplicate Najdorf'
  });

  assert(dupResult.success === false, 'Duplicate sequence within same repertoire is rejected');
  assert(dupResult.isDuplicate === true, 'isDuplicate flag is true');
  assert(
    (dupResult.error?.includes('already saved') || dupResult.error?.includes('already exists')) ?? false,
    'Clear duplicate error message returned'
  );

  // However, saving the exact same moves in a DIFFERENT repertoire (e.g. White prep) is permitted
  const diffRepResult = await repertoireService.saveLine({
    repertoireId: whiteRep.id,
    movesSan: najdorfMoves,
    notes: 'Najdorf from White prep perspective'
  });
  assert(diffRepResult.success === true, 'Same move sequence is permitted across different repertoires');

  // -------------------------------------------------------------------------
  // 4. ILLEGAL MOVE REJECTION & VALIDATION
  // -------------------------------------------------------------------------
  console.log('\n4. ILLEGAL MOVE REJECTION & VALIDATION');
  // Empty moves
  const emptyResult = await repertoireService.saveLine({
    repertoireId: whiteRep.id,
    movesSan: []
  });
  assert(emptyResult.success === false, 'Empty move list is rejected');
  assert(
    (emptyResult.error?.toLowerCase().includes('empty') || emptyResult.error?.toLowerCase().includes('no moves')) ?? false,
    'Error mentions empty/no moves'
  );

  // Non-existent repertoire ID
  const invalidRepResult = await repertoireService.saveLine({
    repertoireId: 'non-existent-rep-uuid',
    movesSan: ['e4', 'e5']
  });
  assert(invalidRepResult.success === false, 'Non-existent repertoire ID is rejected');
  assert(
    (invalidRepResult.error?.toLowerCase().includes('not found') || invalidRepResult.error?.toLowerCase().includes('exist')) ?? false,
    'Error mentions repertoire not found'
  );

  // Corrupted / illegal move on move 1: 1.Ke8 (King to e8 on move 1)
  const illegalMoveResult = await repertoireService.saveLine({
    repertoireId: whiteRep.id,
    movesSan: ['Ke8']
  });
  assert(illegalMoveResult.success === false, 'Illegal move sequence (1.Ke8) rejected');
  assert(
    (illegalMoveResult.error?.toLowerCase().includes('illegal') || illegalMoveResult.error?.toLowerCase().includes('invalid')) ?? false,
    'Error indicates illegal move in sequence'
  );

  // Corrupted move deep in sequence: 1.e4 c5 2.Nf3 d6 3.Nxe8 (illegal knight capture of king)
  const deepIllegalResult = await repertoireService.saveLine({
    repertoireId: whiteRep.id,
    movesSan: ['e4', 'c5', 'Nf3', 'd6', 'Nxe8']
  });
  assert(deepIllegalResult.success === false, 'Deep illegal move rejected');
  assert(
    (deepIllegalResult.error?.toLowerCase().includes('illegal') || deepIllegalResult.error?.toLowerCase().includes('invalid')) ?? false,
    'Deep illegal move flagged accurately'
  );

  // -------------------------------------------------------------------------
  // 5. LINE EDITING, UPDATING & RETRIEVAL
  // -------------------------------------------------------------------------
  console.log('\n5. LINE EDITING, UPDATING & RETRIEVAL');
  const updatedLine = await repertoireService.updateLine(savedNajdorf.id, {
    name: 'Najdorf 6.Bg5 Mainline Preparation',
    notes: 'Updated analysis: Watch out for 6.h3 Adams Attack as well',
    tags: ['sicilian', 'najdorf', 'tactical', 'sharp']
  });

  assert(updatedLine !== undefined, 'updateLine returns updated line object');
  assert(updatedLine!.name === 'Najdorf 6.Bg5 Mainline Preparation', 'Line title updated');
  assert(updatedLine!.notes.includes('Adams Attack'), 'Notes updated');
  assert(updatedLine!.tags.length === 4 && updatedLine!.tags.includes('sharp'), 'Tags array updated');

  // Verify persistence from DB
  const fetchedLine = await repertoireService.getLine(savedNajdorf.id);
  assert(fetchedLine?.name === 'Najdorf 6.Bg5 Mainline Preparation', 'Updated data persisted in IndexedDB');
  assert(
    new Date(fetchedLine?.updatedAt || 0).getTime() >= new Date(savedNajdorf.createdAt).getTime(),
    'updatedAt timestamp refreshed'
  );

  const blackLines = await repertoireService.getLinesForRepertoire(blackRep.id);
  assert(blackLines.length === 1, 'getLinesForRepertoire returns exactly 1 line for blackRep');

  // -------------------------------------------------------------------------
  // 6. CASCADE DELETION & LINE DELETION
  // -------------------------------------------------------------------------
  console.log('\n6. CASCADE DELETION & LINE DELETION');
  // First test deleting single line
  const whiteLinesBefore = await repertoireService.getLinesForRepertoire(whiteRep.id);
  assert(whiteLinesBefore.length === 2, 'White repertoire currently has 2 lines (Ruy Lopez + Najdorf prep)');

  const lineToDelete = whiteLinesBefore.find(l => l.name.includes('Spanish'))!;
  await repertoireService.deleteLine(lineToDelete.id);

  const whiteLinesAfter = await repertoireService.getLinesForRepertoire(whiteRep.id);
  assert(whiteLinesAfter.length === 1, 'Single line deleted successfully from White repertoire');
  const deletedFetch = await repertoireService.getLine(lineToDelete.id);
  assert(deletedFetch === undefined, 'Deleted line no longer accessible in DB');

  // Now test cascade deletion: create temp repertoire with 3 lines and delete repertoire
  const tempRep = await repertoireService.createRepertoire('Temporary Repertoire', 'white');
  await repertoireService.saveLine({ repertoireId: tempRep.id, movesSan: ['d4', 'd5'] });
  await repertoireService.saveLine({ repertoireId: tempRep.id, movesSan: ['c4', 'e5'] });
  await repertoireService.saveLine({ repertoireId: tempRep.id, movesSan: ['Nf3', 'd5'] });

  const tempLinesBefore = await repertoireService.getLinesForRepertoire(tempRep.id);
  assert(tempLinesBefore.length === 3, 'Temporary repertoire holds 3 lines');

  // Delete repertoire
  await repertoireService.deleteRepertoire(tempRep.id);
  const tempRepCheck = await repertoireService.getRepertoire(tempRep.id);
  assert(tempRepCheck === undefined, 'Repertoire successfully deleted');

  const orphanedLines = await db.repertoireLines.where('repertoireId').equals(tempRep.id).toArray();
  assert(orphanedLines.length === 0, 'Cascade delete eliminated all associated repertoire lines');

  // -------------------------------------------------------------------------
  // 7. BOARD SYNCHRONIZATION WITH CHESSSERVICE
  // -------------------------------------------------------------------------
  console.log('\n7. BOARD SYNCHRONIZATION WITH CHESSSERVICE');
  const chess = new ChessService();
  const lineToLoad = (await repertoireService.getLinesForRepertoire(blackRep.id))[0];

  const loadRes = chess.loadMoveSequence(lineToLoad.movesSan);
  assert(loadRes.success === true, 'ChessService successfully loaded repertoire line move sequence');
  assert(chess.getFen() === lineToLoad.finalFen, 'ChessService board FEN matches saved repertoire line FEN');
  assert(chess.getSnapshots().length === lineToLoad.movesSan.length, 'Move history snapshots length matches line move count');

  // Check out-of-book detection against OpeningDatabaseService
  const recognized = openingDatabase.recognize(lineToLoad.movesSan, chess.getEpd());
  assert(recognized.matched === true, 'Loaded line correctly recognized by OpeningDatabaseService');
  assert(recognized.opening?.eco === lineToLoad.eco, 'Recognized ECO matches line ECO');

  // -------------------------------------------------------------------------
  // 8. JSON EXPORT & IMPORT ROUND-TRIP
  // -------------------------------------------------------------------------
  console.log('\n8. JSON EXPORT & IMPORT ROUND-TRIP');
  // Add a second line to blackRep so export contains multiple lines
  await repertoireService.saveLine({
    repertoireId: blackRep.id,
    movesSan: ['d4', 'Nf6', 'c4', 'g6', 'Nc3', 'Bg7', 'e4', 'd6'],
    name: "King's Indian Defense Main Line",
    tags: ['kid', 'hypermodern']
  });

  const jsonString = await repertoireService.exportRepertoireToJson(blackRep.id);
  const exportData = JSON.parse(jsonString);
  assert(exportData.schemaVersion === 1, 'Export JSON schemaVersion is 1');
  assert(exportData.repertoire.name === blackRep.name, 'Export JSON repertoire name matches');
  assert(exportData.lines.length === 2, 'Export JSON contains both saved lines');

  // Import under a new repertoire
  const importResult = await repertoireService.importRepertoireFromJson(exportData);
  assert(importResult.success === true, 'Import from JSON succeeded');
  assert(importResult.repertoire !== undefined, 'Imported repertoire created');
  assert(importResult.repertoire!.id !== blackRep.id, 'Imported repertoire receives new unique UUID (no collision)');
  assert(importResult.repertoire!.name.includes('(Imported)'), 'Imported repertoire name reflects imported status');
  assert(importResult.linesCount === 2, 'Both lines successfully imported');

  const importedLines = await repertoireService.getLinesForRepertoire(importResult.repertoire!.id);
  assert(importedLines.length === 2, 'IndexedDB holds 2 imported lines');
  assert(importedLines[0].id !== lineToLoad.id, 'Imported lines have fresh UUIDs');
  assert(importedLines[0].repertoireId === importResult.repertoire!.id, 'Imported lines bound to new repertoire ID');
  assert(importedLines.some(l => l.name.includes('Najdorf')), 'Imported lines retain opening names');

  // -------------------------------------------------------------------------
  // 9. PGN EXPORT
  // -------------------------------------------------------------------------
  console.log('\n9. PGN EXPORT');
  const pgnExport = await repertoireService.exportRepertoireToPgn(blackRep.id);
  assert(typeof pgnExport === 'string' && pgnExport.length > 0, 'PGN export produced non-empty string');
  assert(pgnExport.includes('[Event "Sicilian & King\'s Indian"]'), 'PGN contains Event header with repertoire name');
  assert(pgnExport.includes('[Site "Chess Opening Academy"]'), 'PGN contains Site header');
  assert(pgnExport.includes('[ECO "B90"]') || pgnExport.includes('[ECO "'), 'PGN contains ECO header');
  assert(pgnExport.includes('1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6'), 'PGN contains numbered move notation');
  assert(pgnExport.includes('{ Updated analysis: Watch out for 6.h3 Adams Attack') || pgnExport.includes('{'), 'PGN contains move commentary brackets');

  // Verify that exported PGN is legally parseable by Chess.js
  const testChess = new ChessService();
  // Extract first game from PGN export
  const pgnGames = pgnExport.trim().split('\n\n\n');
  assert(pgnGames.length === 2, 'PGN export separates individual lines by triple newline');
  const parsePgnRes = testChess.loadPgn(pgnGames[0]);
  assert(parsePgnRes.success === true, 'Exported PGN game 1 is 100% legally parseable by Chess.js');

  console.log('\n================================================================');
  console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(' PROMPT 11 PERSONAL REPERTOIRE BUILDER SUITE: 100% VERIFIED     ');
  console.log('================================================================\n');
}

runRepertoireBuilderTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
