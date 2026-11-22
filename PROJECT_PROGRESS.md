# Chess Opening Academy — Project Progress & Milestone Tracker

## 1. Project Overview & Rules
* **Budget Constraint:** Strictly **₹0** (no paid subscriptions, APIs, hosting, databases, or AI tokens).
* **Licensing:** GPL-3.0 (aligned with Chessground and Stockfish).
* **Architecture:** Offline-First PWA (React + TypeScript + Vite + Tailwind CSS + Dexie.js IndexedDB + Stockfish Web Worker).

---

## 2. Resource Verification Status
* **Chess.js (`1.4.0` / BSD-2-Clause):** Fully verified rules engine, FEN/PGN, legal move calculation.
* **Chessground (`9.2.1` / GPL-3.0):** Native board viewport, drag/drop, touch events, coordinates, arrows.
* **Stockfish WASM (`10.0.2` / GPL-3.0):** WebAssembly engine binary verified in `public/engine/stockfish.wasm` with `\0asm` magic header.
* **Lichess Opening Classification Dataset:** 3,865 opening records across 500 ECO codes (A00–E99) bundled locally (CC0 Public Domain).
* **Dexie.js (`4.0.1` / Apache-2.0):** Persistent IndexedDB storage with `openings`, `savedPositions`, `repertoires`, and `lichessCache` tables.

---

## 3. Milestones Roadmap

- [x] **Milestone 0: Resource Integration & Verification Suite**
- [x] **Phase 1 (Prompt 7): Interactive Chessboard & Controls Engine**
  - Full 8×8 board with legal moves, castling, en passant, promotion modal, history navigation, FEN/PGN utilities, dark/light themes.
- [x] **Phase 2 (Prompt 8): Chess Opening Database & ECO Classification System**
  - [x] Official dataset sourced from `lichess-org/chess-openings` (CC0 Public Domain, DOI: `10.5281/zenodo.19608774`).
  - [x] 3,865 verified legal opening records compiled locally into `src/data/openings/`.
  - [x] 100% ECO coverage: 500 distinct ECO codes from A00 to E99 programmatically verified.
  - [x] Opening recognition engine with exact matching, longest prefix matching, and EPD transposition detection.
  - [x] Search & retrieval service (by Name, ECO code, Family, Variation, and ECO range).
  - [x] Local storage with IndexedDB (Dexie `openings` table) and duplicate import prevention.
  - [x] Reactive recognition integration with the interactive chessboard.
  - [x] 52-point automated test suite passing with 100% success rate (140 total automated checks project-wide).
- [ ] **Phase 3: Opening Variation Tree Explorer** (Branching tree visualization, alternative moves, plans, and opening traps).
- [ ] **Phase 4: Local Stockfish Engine & Evaluation Bar** (Continuous evaluation, multi-PV candidate lines, depth controls, blunder detector).
- [ ] **Phase 5: Opening Statistics Dashboard** (Lichess master/player database stats, rating filters, win percentage charts).
- [ ] **Phase 6: Personal Repertoire Builder** (White & Black repertoires, custom notes, PGN import/export, Dexie persistence).
- [ ] **Phase 7: Interactive Training Arena** (Spaced Repetition SM-2, guess the move, memory recall, blunder repetition).
- [ ] **Phase 8: Structured Lessons & Performance Dashboard** (Curated courses, quizzes, mastery metrics).
- [ ] **Phase 9: Offline PWA & Final Polish** (Workbox service worker, Android installability, audit).
