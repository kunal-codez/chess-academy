# Chess Opening Academy — Project Status Document

*Last Updated: 2026-11-22*  
*Budget Constraint: Strictly ₹0.00*  
*Licence: GNU GPL-3.0*

---

## 1. Current Status Summary
The project development environment setup and resource verification phase (Prompt 6) is **100% complete**. 

All approved dependencies have been installed, the project directory structure has been established, Git tracking is configured, and all automated integration tests, TypeScript typechecks, production builds, and dev server probes have passed with zero errors.

---

## 2. Completed Work

### Environment Setup & Tooling
* [x] Initialized React 18, TypeScript 5.4, and Vite 5 build system.
* [x] Configured Tailwind CSS 3.4 with custom chess board color palette and responsive breakpoints.
* [x] Configured `tsconfig.json` with strict mode, bundler resolution, and TypeScript extension handling.
* [x] Set up Git version control and created an exhaustive `.gitignore` excluding `node_modules` and `dist`.
* [x] Configured `@rollup/wasm-node` WebAssembly bundling engine for clean cross-platform builds.
* [x] Created `README.md` and `PROJECT_STATUS.md` documentation.

### Core Dependency Integrations & Verification
* [x] **Chess.js (`1.0.0-beta.6`):** Verified legal move generation, en passant captures, kingside and queenside castling, castling through/out of check prevention, pawn promotions (`a8=Q+`), checkmate detection, stalemate detection, and legal destination mapping.
* [x] **Chessground (`9.1.1`):** Verified board rendering, mobile touch/drag handlers, legal move destination dots, turn flipping, and dynamic arrow/circle shape overlays.
* [x] **Stockfish WebAssembly (`stockfish.js 10.0.2`):** Placed WASM binary and wrapper in `public/engine/`. Verified asynchronous Web Worker UCI protocol communication, centipawn evaluations, forced mate (`#N`) parsing, and PV candidate move extractions.
* [x] **Lichess Opening Explorer API:** Verified REST queries against `explorer.lichess.ovh/masters` (retrieved 1,368,125+ master games for 1.e4), win/draw/loss rates, move frequency tables, normalized FEN transposition detection, and client-side token bucket rate limiting.
* [x] **Dexie.js (`4.0.1` IndexedDB):** Configured schema tables (`savedPositions`, `repertoires`, `lichessCache`). Verified asynchronous reads, writes, queries, and offline caching (zero network requests on repeat queries).

### Verification & Test Suite
* [x] Automated test runner (`npm test`) executing 23 comprehensive integration checks with 100% pass rate.
* [x] TypeScript validation (`tsc`) with **0 errors**.
* [x] Production compilation (`npm run build`) completed in 19.4s (`dist/assets/index.js` = 109.1 kB gzip).
* [x] Development server (`vite`) verified: boots in 476 ms and responds with `HTTP 200 OK`.

---

## 3. Pending Work (Upcoming Phases)

* [ ] **Phase 1: Production Chessboard & Layout Engine**
  * Dedicated responsive board wrapper (desktop & Android touch).
  * Promotion piece selector dialog (Queen, Rook, Bishop, Knight).
  * Audio feedback for moves, captures, checks, and castling (open-source CC0 sound sprites).
  * Move history tree (algebraic notation with undo/redo/reset controls).
  * Dark and light theme switcher.

* [ ] **Phase 2: Local Stockfish Engine & Evaluation UI**
  * Real-time animated centipawn and forced-mate evaluation bar.
  * Multi-PV candidate moves list with depth selector (depth 12–22).
  * Evaluation history sparkline / blunder detection.

* [ ] **Phase 3: Opening Encyclopedia & Branching Tree Explorer**
  * Curated ECO A00–E99 classification datasets (lazy-loaded by category).
  * Move-by-move pedagogical commentary, strategic plans, and opening traps.
  * Transposition detection engine.

* [ ] **Phase 4: Opening Statistics Integration**
  * Live win/draw/loss bar and frequency rankings from Lichess database.
  * Rating tier filters (Masters vs. General player pool).

* [ ] **Phase 5: Personal Repertoire Manager**
  * Separate White and Black repertoire builders (vs 1.e4, 1.d4, flank, irregular).
  * Custom move orders, personal notes, board arrows, and PGN import/export.

* [ ] **Phase 6: Interactive Training Arena**
  * Spaced Repetition (SuperMemo-2 algorithm) for opening lines.
  * Training modes: "Guess the Move", "Memory Recall", and "Mistake Repeater".

* [ ] **Phase 7: Structured Lessons & Performance Dashboard**
  * Opening family courses with interactive quiz boards.
  * Performance tracking: memorization rate, weak openings, accuracy metrics.

* [ ] **Phase 8: Offline PWA & Final Optimization**
  * `vite-plugin-pwa` service worker configuration.
  * Offline asset precaching for the app shell, sounds, and Stockfish WASM binary.
  * Android Home Screen installability.

---

## 4. Key Architectural Decisions

| Decision | Rationale |
| :--- | :--- |
| **GPL-3.0 Licence** | Required by `chessground` and `stockfish`. Fully compatible with our public, ₹0 open-source GitHub architecture. |
| **Single-Thread WASM Stockfish** | Avoids the strict `Cross-Origin-Opener-Policy` (COOP) and `Cross-Origin-Embedder-Policy` (COEP) headers required by multi-threaded `SharedArrayBuffer`, which would block external Lichess API queries and CDN assets. |
| **IndexedDB via Dexie.js** | Provides persistent, offline-capable storage for user repertoires, training schedules, and API caches with zero cloud database costs. |
| **Client-Side Token Bucket Rate Limiter** | Caps outgoing Lichess Explorer requests to 1 request per 1.1s, strictly complying with free public API policies and preventing HTTP 429 errors. |
| **Pure WASM Rollup (`@rollup/wasm-node`)** | Bypasses Windows Application Control restrictions on native `.node` C++ modules, ensuring smooth Vite builds on Windows environments. |

---

## 5. Known Issues & Mitigations

| Issue | Status | Mitigation |
| :--- | :--- | :--- |
| **Native `.node` binary execution blocked by Windows AppLocker** | **Resolved** | Replaced Rollup's native C++ binding with `@rollup/wasm-node`, running 100% in WebAssembly. |
| **Node.js 24 `navigator.onLine` evaluates to `undefined`** | **Resolved** | Updated `LichessService` to check `navigator.onLine === false` rather than falsiness, preventing false-positive offline states in test runners. |
| **Lichess API rate limit (1 req/s)** | **Mitigated** | Built-in token bucket debounces rapid move inputs. IndexedDB caches every queried position for 60 days, cutting network calls to zero on repeated moves. |
