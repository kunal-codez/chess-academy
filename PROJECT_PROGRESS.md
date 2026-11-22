# Chess Opening Academy — Project Progress & Milestone Tracker

## 1. Project Overview & Rules
* **Budget Constraint:** Strictly **₹0** (no paid subscriptions, APIs, hosting, databases, or AI tokens).
* **Licensing:** GPL-3.0 (aligned with Chessground and Stockfish).
* **Architecture:** Offline-First PWA (React + TypeScript + Vite + Tailwind CSS + Dexie.js IndexedDB + Stockfish Web Worker).

---

## 2. Resource Verification Status (Milestone 0)
* **Chess.js (`1.4.0` / BSD-2-Clause):** Fully verified rules engine, FEN/PGN, legal move calculation.
* **Chessground (`9.2.1` / GPL-3.0):** Native board viewport, drag/drop, touch events, coordinates, arrows.
* **Stockfish WASM (`10.0.2` / GPL-3.0):** WebAssembly engine binary verified in `public/engine/stockfish.wasm` with `\0asm` magic header.
* **Lichess API & Cache:** Lichess Masters Explorer queries verified with token-bucket limiter and Dexie caching.
* **Dexie.js (`4.0.1` / Apache-2.0):** Persistent IndexedDB storage verified.

---

## 3. Milestones Roadmap

- [x] **Milestone 0: Resource Integration & Verification Suite**
- [x] **Phase 1 (Prompt 7): Interactive Chessboard & Controls Engine**
  - [x] Full standard 8×8 board with all 32 pieces in initial position.
  - [x] Authoritative rules engine powered by `chess.js` (turns, legal moves, castling, en passant, promotion, checkmate, stalemate, draws).
  - [x] Interactive pawn promotion modal with Queen, Rook, Bishop, Knight choices.
  - [x] Board controls (New game, Reset, Undo, Redo with stack branch handling, Flip board, Copy FEN, Copy PGN, Load FEN, Load PGN).
  - [x] Numbered move history table (SAN) with step-by-step history navigation (First, Prev, Next, Last, and click-to-move).
  - [x] Dynamic Game Status Badge (Turn indicator, Check, Checkmate, Draws, Fullmove & halfmove count).
  - [x] Responsive layout for mobile and desktop with zero horizontal overflow.
  - [x] Dark and Light theme toggle support.
  - [x] 65-point comprehensive integration test suite passing with 100% success rate.
- [ ] **Phase 2: Local Stockfish Engine & Evaluation Bar** (Continuous evaluation, multi-PV candidate lines, depth controls, blunder detector).
- [ ] **Phase 3: Opening Encyclopedia & Variation Explorer** (Curated ECO A00–E99 taxonomy, plans, traps, transpositions).
- [ ] **Phase 4: Opening Statistics Dashboard** (Lichess master/player database stats, rating filters, win percentage charts).
- [ ] **Phase 5: Personal Repertoire Builder** (White & Black repertoires, custom notes, PGN import/export, Dexie persistence).
- [ ] **Phase 6: Interactive Training Arena** (Spaced Repetition SM-2, guess the move, memory recall, blunder repetition).
- [ ] **Phase 7: Structured Lessons & Performance Dashboard** (Curated courses, quizzes, mastery metrics).
- [ ] **Phase 8: Offline PWA & Final Polish** (Workbox service worker, Android installability, audit).
