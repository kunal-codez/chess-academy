# Chess Opening Academy

A professional, offline-first Chess Opening Academy, repertoire preparation, analysis, and training platform built with **React**, **TypeScript**, **Vite**, **Chessground**, **Chess.js**, **Stockfish WebAssembly**, and **Dexie.js (IndexedDB)**.

> **STRICT BUDGET: ₹0.00**  
> This project operates entirely on open-source software, browser WebAssembly, client-side IndexedDB persistence, and free public APIs without paid subscriptions, cloud databases, or AI API token costs.

---

## Current Status: Phase 1 (Interactive Chessboard & Controls) Complete

The platform features a fully functional, mobile-responsive interactive chessboard with strict chess rule validation, complete controls, history navigation, and FEN/PGN utilities:

* **Board Engine:** Powered by `chessground` with 60 FPS animations, drag-and-drop, click-to-move, legal move highlights, last move highlights, check highlights, and orientation flipping.
* **Rules Authority:** Powered by `chess.js` covering legal/illegal moves, castling (kingside/queenside), en passant, pawn promotion with piece picker (Queen, Rook, Bishop, Knight), check, checkmate, stalemate, threefold repetition, fifty-move rule, and insufficient material draws.
* **Controls:** New Game, Reset, Undo, Redo (with branching redo stack), Flip Board, Copy FEN, Copy PGN, Load FEN (with presets), and Load PGN.
* **History Navigation:** Numbered SAN move list with jump-to-move and navigation controls (`|<`, `<`, `>`, `>|`).
* **Themes:** Dark and Light interface options.

---

## Tech Stack & Core Dependencies

| Component | Technology | Licence | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework & Build** | React 18, TypeScript 5.4, Vite 5 | MIT | Fast component architecture, strict typing, sub-second HMR |
| **Chess Logic** | `chess.js` (1.4.0) | BSD-2-Clause | Authoritative rules engine, FEN/PGN, legal move validation |
| **Board Viewport** | `chessground` (9.2.1) | GPL-3.0 | 60 FPS board animations, touch & drag on mobile, arrows, legal dots |
| **Local Engine** | Stockfish 16/17 (WASM) | GPL-3.0 | Client-side Web Worker engine (Phase 2 integration) |
| **Offline Database** | Dexie.js (IndexedDB 4.0) | Apache-2.0 | Persistent local storage for repertoires, lessons, and stats cache |
| **Statistics** | Lichess Opening Explorer API | CC0 / Free | Master game win/draw percentages with local rate limiting and caching |
| **Styling** | Tailwind CSS 3.4, Lucide React | MIT | Clean, responsive desktop and Android UI, dark/light themes |

---

## Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Automated Tests

Run the complete 88-point automated test suite:

```bash
npm test
```

### 4. Build for Production

```bash
npm run build
```
Generates an optimized, tree-shaken static production bundle in `dist/`.

---

## Licence

Licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).  
Aligned with the licencing obligations of **Chessground** and **Stockfish**.
