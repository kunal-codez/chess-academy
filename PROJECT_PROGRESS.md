# Chess Opening Academy — Project Progress & Milestone Tracker

## 1. Project Overview & Rules
* **Budget Constraint:** Strictly **₹0** (no paid subscriptions, APIs, hosting, databases, or AI tokens).
* **Licensing:** GPL-3.0 (aligned with Chessground and Stockfish).
* **Architecture:** Offline-First PWA (React + TypeScript + Vite + Tailwind CSS + Dexie.js IndexedDB + Stockfish Web Worker).

---

## 2. Resource Verification Status (Milestone 0)

| Resource | Package / Source | Version | License | Test Status | Verified Capabilities |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Chess.js** | `chess.js` | `^1.0.0-beta.6` | BSD-2-Clause | **PASSED (10/10)** | Legal move validation, en passant, kingside/queenside castling, castling through/out of check blocked, promotion (`a8=Q+`), checkmate detection, stalemate detection, legal destination mapping. |
| **Chessground** | `chessground` | `^9.1.1` | GPL-3.0 | **PASSED (2/2)** | Board rendering, touch & drag events, legal move destination highlighting, turn flipping, dynamic arrows/circles overlay (`drawable.shapes`). |
| **Stockfish** | `stockfish.js` | `^10.0.2` (WASM) | GPL-3.0 | **PASSED (3/3)** | WebAssembly engine binary in `public/engine/`, Web Worker communication via UCI protocol, centipawn evaluations, forced mate (`#N`) parsing, PV lines extraction. |
| **Lichess** | `explorer.lichess.ovh/masters` | REST Public API | CC0 / Free | **PASSED (4/4)** | Query master game stats (1,368,125+ games verified for 1.e4), win/draw/loss percentages, move frequency, normalized FEN transposition detection, token-bucket rate limiter. |
| **Dexie.js** | `dexie` | `^4.0.1` | Apache-2.0 | **PASSED (4/4)** | IndexedDB table creation (`savedPositions`, `repertoires`, `lichessCache`), position saving, queries, offline cache retrieval (0 network requests). |

**Total Integration Tests:** **23 PASSED, 0 FAILED** (Automated runner: `run-all-integration-tests.ts`).
**Production Build:** **SUCCESS** (`tsc && vite build` completed in 21.9s, bundle size: 109.1 kB gzip).

---

## 3. Milestones Roadmap

- [x] **Milestone 0: Resource Integration & Verification Suite**
- [ ] **Phase 1: Interactive Board & Controls** (Promotion dialog, sound sprites, move history tree, keyboard controls, responsive layout).
- [ ] **Phase 2: Local Stockfish Engine & Evaluation Bar** (Continuous evaluation, multi-PV lines, depth controls, blunder detector).
- [ ] **Phase 3: Opening Encyclopedia & Variation Explorer** (Curated ECO A00–E99 taxonomy, plans, traps, transpositions).
- [ ] **Phase 4: Opening Statistics Dashboard** (Lichess master/player database stats, rating filters, win percentage charts).
- [ ] **Phase 5: Personal Repertoire Builder** (White & Black repertoires, custom notes, PGN import/export, Dexie persistence).
- [ ] **Phase 6: Interactive Training Arena** (Spaced Repetition SM-2, guess the move, memory recall, blunder repetition).
- [ ] **Phase 7: Structured Lessons & Performance Dashboard** (Curated courses, quizzes, mastery metrics).
- [ ] **Phase 8: Offline PWA & Final Polish** (Workbox service worker, Android installability, audit).
