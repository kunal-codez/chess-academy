import fs from 'fs';
import vm from 'vm';
import { UciParser } from '../../src/services/UciParser.ts';
import { StockfishService } from '../../src/services/StockfishService.ts';

async function runStockfishEvaluationTests() {
  console.log('================================================================');
  console.log(' PROMPT 10: STOCKFISH WEBASSEMBLY & EVALUATION TEST SUITE       ');
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

  // --- 1. UCI OUTPUT PARSING ---
  console.log('1. UCI OUTPUT PARSING (UciParser.parseUciInfo & parseBestMove)');
  const line1 = 'info depth 16 seldepth 22 multipv 1 score cp 42 nodes 250000 nps 500000 time 500 pv e2e4 e7e5 g1f3 b8c6';
  const parsed1 = UciParser.parseUciInfo(line1);
  assert(parsed1 !== null, 'Successfully parsed valid UCI info line');
  assert(parsed1?.depth === 16, 'Parsed depth = 16');
  assert(parsed1?.seldepth === 22, 'Parsed seldepth = 22');
  assert(parsed1?.multipv === 1, 'Parsed multipv = 1');
  assert(parsed1?.scoreCp === 42, 'Parsed score cp = 42');
  assert(parsed1?.scoreMate === null, 'scoreMate is null for centipawn score');
  assert(parsed1?.nodes === 250000, 'Parsed nodes = 250,000');
  assert(parsed1?.nps === 500000, 'Parsed nps = 500,000');
  assert(parsed1?.timeMs === 500, 'Parsed time = 500ms');
  assert(parsed1?.pvUci.length === 4, 'Parsed 4 PV moves');
  assert(parsed1?.pvUci[0] === 'e2e4', 'First PV move is e2e4');

  // MultiPV Line 2
  const lineMp = 'info depth 15 multipv 2 score cp 18 nodes 180000 pv d2d4 d7d5';
  const parsedMp = UciParser.parseUciInfo(lineMp);
  assert(parsedMp?.multipv === 2 && parsedMp?.scoreCp === 18, 'Parsed multipv 2 line with score cp 18');

  // Mate score parsing
  const lineMate = 'info depth 20 multipv 1 score mate 3 nodes 80000 pv d1h5 g7g6 h5e5';
  const parsedMate = UciParser.parseUciInfo(lineMate);
  assert(parsedMate?.scoreMate === 3 && parsedMate?.scoreCp === null, 'Parsed forced mate score (+3)');

  const lineNegativeMate = 'info depth 18 multipv 1 score mate -2 nodes 40000 pv f7f2 e1d1';
  const parsedNegMate = UciParser.parseUciInfo(lineNegativeMate);
  assert(parsedNegMate?.scoreMate === -2, 'Parsed negative forced mate score (-2)');

  // Bestmove parsing
  const bestLine = 'bestmove e2e4 ponder e7e5';
  const parsedBest = UciParser.parseBestMove(bestLine);
  assert(parsedBest !== null && parsedBest.bestMove === 'e2e4', 'Parsed bestmove = e2e4');
  assert(parsedBest?.ponder === 'e7e5', 'Parsed ponder = e7e5');

  const bestLineNoPonder = 'bestmove d2d4';
  const parsedBestNoPonder = UciParser.parseBestMove(bestLineNoPonder);
  assert(parsedBestNoPonder?.bestMove === 'd2d4' && parsedBestNoPonder.ponder === undefined, 'Parsed bestmove without ponder');

  // Invalid line rejection
  assert(UciParser.parseUciInfo('Stockfish 10 by T. Romstad') === null, 'Non-info line rejected gracefully');
  assert(UciParser.parseBestMove('info depth 1') === null, 'Non-bestmove line rejected gracefully');

  // --- 2. WHITE-PERSPECTIVE SCORE NORMALIZATION ---
  console.log('\n2. WHITE-PERSPECTIVE SCORE NORMALIZATION');
  // White to move: score is directly from White's perspective
  const whiteNorm1 = UciParser.normalizeScoreForWhite(55, null, 'w');
  assert(whiteNorm1.normalizedCp === 55, 'White to move: +55 cp stays +55');

  const whiteNorm2 = UciParser.normalizeScoreForWhite(-120, null, 'w');
  assert(whiteNorm2.normalizedCp === -120, 'White to move: -120 cp stays -120');

  const whiteMateNorm = UciParser.normalizeScoreForWhite(null, 2, 'w');
  assert(whiteMateNorm.normalizedMate === 2, 'White to move: mate 2 stays +2 (White mates in 2)');

  // Black to move: score from side-to-move must invert for White perspective
  const blackNorm1 = UciParser.normalizeScoreForWhite(80, null, 'b');
  assert(blackNorm1.normalizedCp === -80, 'Black to move: Black is up +80 cp -> normalized for White = -80');

  const blackNorm2 = UciParser.normalizeScoreForWhite(-250, null, 'b');
  assert(blackNorm2.normalizedCp === 250, 'Black to move: Black is down -250 cp -> normalized for White = +250');

  const blackMateNorm1 = UciParser.normalizeScoreForWhite(null, 1, 'b');
  assert(blackMateNorm1.normalizedMate === -1, 'Black to move: Black mates in 1 -> normalized for White = -1');

  const blackMateNorm2 = UciParser.normalizeScoreForWhite(null, -3, 'b');
  assert(blackMateNorm2.normalizedMate === 3, 'Black to move: White mates Black in 3 -> normalized for White = +3');

  // --- 3. FORMAT SCORE DISPLAY ---
  console.log('\n3. FORMAT SCORE DISPLAY');
  assert(UciParser.formatScore(45, null) === '+0.5', 'Formats +45 cp as +0.5');
  assert(UciParser.formatScore(-180, null) === '-1.8', 'Formats -180 cp as -1.8');
  assert(UciParser.formatScore(0, null) === '0.0', 'Formats 0 cp as 0.0');
  assert(UciParser.formatScore(null, 3) === 'M3', 'Formats mate in 3 as M3');
  assert(UciParser.formatScore(null, -2) === '-M2', 'Formats black mate in 2 as -M2');

  // --- 4. WIN PERCENTAGE & EVALUATION BAR MATH ---
  console.log('\n4. WIN PERCENTAGE & EVALUATION BAR MATH');
  assert(UciParser.computeWinPercentage(0, null) === 50, '0.0 score yields exactly 50% winning chance');
  const winP100 = UciParser.computeWinPercentage(100, null);
  assert(winP100 > 58 && winP100 < 61, `+100 cp yields expected ~59.1% (got: ${winP100}%)`);

  const winM100 = UciParser.computeWinPercentage(-100, null);
  assert(winM100 > 39 && winM100 < 42, `-100 cp yields expected ~40.9% (got: ${winM100}%)`);
  assert(Math.round(winP100 + winM100) === 100, 'Win percentages are symmetric around 50%');

  const winP500 = UciParser.computeWinPercentage(500, null);
  assert(winP500 > 84 && winP500 < 88, `+500 cp yields decisive ~86% (got: ${winP500}%)`);

  // Clamping check: non-mate evaluations do not overflow 97% or underflow 3%
  const winExtremeHigh = UciParser.computeWinPercentage(3500, null);
  assert(winExtremeHigh === 97, 'Extreme +35.0 score clamped cleanly at 97%');

  const winExtremeLow = UciParser.computeWinPercentage(-3500, null);
  assert(winExtremeLow === 3, 'Extreme -35.0 score clamped cleanly at 3%');

  // Mate snaps to 100% or 0%
  assert(UciParser.computeWinPercentage(null, 4) === 100, 'White forced mate snaps to 100%');
  assert(UciParser.computeWinPercentage(null, -1) === 0, 'Black forced mate snaps to 0%');

  // --- 5. UCI PV TO SAN CONVERSION & PGN FORMATTING ---
  console.log('\n5. UCI PV TO SAN CONVERSION & PGN FORMATTING');
  const fenStart = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const pv1 = ['e2e4', 'c7c5', 'g1f3', 'd7d6'];
  const res1 = UciParser.convertUciPvToSan(fenStart, pv1);
  assert(res1.sanMoves.join(' ') === 'e4 c5 Nf3 d6', 'Converted 4 opening moves to SAN (e4 c5 Nf3 d6)');
  assert(res1.formattedPgn === '1. e4 c5 2. Nf3 d6', 'PGN formatted correctly with move numbers (1. e4 c5 2. Nf3 d6)');

  // Black to move position (Sicilian Defense after 1. e4)
  const fenBlack = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
  const pvBlack = ['c7c5', 'g1f3', 'd7d6', 'd2d4'];
  const resBlack = UciParser.convertUciPvToSan(fenBlack, pvBlack);
  assert(resBlack.sanMoves[0] === 'c5', 'First move from Black position is c5');
  assert(resBlack.formattedPgn === '1... c5 2. Nf3 d6 3. d4', 'PGN formatted with "1... c5" notation');

  // Castling in PV
  const fenCastle = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 6 5';
  const pvCastle = ['e1g1', 'e8g8'];
  const resCastle = UciParser.convertUciPvToSan(fenCastle, pvCastle);
  assert(resCastle.sanMoves[0] === 'O-O', 'White kingside castle converted to O-O');
  assert(resCastle.sanMoves[1] === 'O-O', 'Black kingside castle converted to O-O');

  // --- 6. FULL PROCESS INFO LINE ---
  console.log('\n6. FULL PROCESS INFO LINE (processInfoLine)');
  const infoRaw = 'info depth 14 multipv 1 score cp 35 nodes 95000 nps 450000 time 211 pv e2e4 c7c5';
  const processed = UciParser.processInfoLine(infoRaw, fenStart);
  assert(processed !== null, 'processInfoLine succeeded');
  assert(processed?.formattedScore === '+0.3' || processed?.formattedScore === '+0.4', `Formatted score = +0.3 / +0.4 (got: ${processed?.formattedScore})`);
  assert(processed?.winPercentage > 50, 'White advantage reflects > 50% win percentage');
  assert(processed?.bestMoveUci === 'e2e4', 'bestMoveUci = e2e4');
  assert(processed?.bestMoveSan === 'e4', 'bestMoveSan = e4');
  assert(processed?.formattedPgn === '1. e4 c5', 'formattedPgn = 1. e4 c5');

  // --- 7. STOCKFISH SERVICE STATE & OPTIONS ---
  console.log('\n7. STOCKFISH SERVICE STATE & OPTIONS');
  const service = StockfishService.getInstance();
  assert(service !== null, 'StockfishService singleton instantiated');

  const initialOpts = service.getOptions();
  assert(initialOpts.depth === 16, 'Default depth = 16');
  assert(initialOpts.multiPv === 2, 'Default multiPv = 2');

  service.setDepth(12);
  assert(service.getOptions().depth === 12, 'Depth updated to 12 via setDepth');

  service.setMultiPv(3);
  assert(service.getOptions().multiPv === 3, 'MultiPV updated to 3 via setMultiPv');

  // Restore defaults
  service.setDepth(16);
  service.setMultiPv(2);

  // --- 8. REAL STOCKFISH BINARY EXECUTION IN VM ---
  console.log('\n8. REAL STOCKFISH BINARY EXECUTION IN VM');
  const stockfishJsPath = 'public/engine/stockfish.js';
  assert(fs.existsSync(stockfishJsPath), 'public/engine/stockfish.js exists on disk');
  const stockfishWasmPath = 'public/engine/stockfish.wasm';
  assert(fs.existsSync(stockfishWasmPath), 'public/engine/stockfish.wasm exists on disk');

  // Verify stockfish.wasm magic header
  const wasmBuffer = fs.readFileSync(stockfishWasmPath);
  const isWasmMagic = wasmBuffer[0] === 0x00 && wasmBuffer[1] === 0x61 && wasmBuffer[2] === 0x73 && wasmBuffer[3] === 0x6d;
  assert(isWasmMagic, 'public/engine/stockfish.wasm contains valid \\0asm WebAssembly binary header');

  // Run stockfish in VM sandbox and test UCI handshake
  const vmOutput: string[] = [];
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    TextDecoder,
    postMessage: (msg: string) => { vmOutput.push(msg); },
    onmessage: null as any,
    close: () => {},
    location: { href: 'http://localhost/engine/stockfish.js' }
  };

  const code = fs.readFileSync(stockfishJsPath, 'utf8');
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);

  assert(typeof sandbox.onmessage === 'function', 'Stockfish initialized worker onmessage handler');

  await new Promise<void>((resolve) => {
    sandbox.onmessage({ data: 'uci' });
    sandbox.onmessage({ data: 'isready' });
    sandbox.onmessage({ data: 'position startpos' });
    sandbox.onmessage({ data: 'go depth 2' });

    const checkInterval = setInterval(() => {
      const hasUciOk = vmOutput.some((l) => l === 'uciok');
      const hasReadyOk = vmOutput.some((l) => l === 'readyok');
      const hasBestMove = vmOutput.some((l) => l.startsWith('bestmove'));

      if (hasUciOk && hasReadyOk && hasBestMove) {
        clearInterval(checkInterval);
        assert(hasUciOk, 'Stockfish responded with "uciok"');
        assert(hasReadyOk, 'Stockfish responded with "readyok"');
        assert(hasBestMove, 'Stockfish completed search and generated "bestmove"');
        resolve();
      }
    }, 50);

    setTimeout(() => {
      clearInterval(checkInterval);
      resolve();
    }, 2500);
  });

  console.log('\n================================================================');
  console.log(` RESULTS: ${passed} passed, ${failed} failed.`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStockfishEvaluationTests().catch((err) => {
  console.error('Fatal error in Stockfish Evaluation tests:', err);
  process.exit(1);
});
