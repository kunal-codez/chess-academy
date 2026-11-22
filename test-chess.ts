import { ChessService } from './src/services/ChessService.ts';

console.log('Testing ChessService...');
const chess = new ChessService();
console.log('Starting FEN:', chess.getFen());
const m1 = chess.makeMove('e2', 'e4');
console.log('Move e2-e4:', m1);
console.log('Legal dests count:', chess.getLegalDests().size);
