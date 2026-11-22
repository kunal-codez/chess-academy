# Chess Opening Academy

A professional, offline-first Chess Opening Academy, repertoire preparation, analysis, and training platform built with **React**, **TypeScript**, **Vite**, **Chessground**, **Chess.js**, **Stockfish WebAssembly**, and **Dexie.js (IndexedDB)**.

> **STRICT BUDGET: ₹0.00**  
> This project operates entirely on open-source software, browser WebAssembly, client-side IndexedDB persistence, and free public APIs without paid subscriptions, cloud databases, or AI API token costs.

---

## Current Status: Phase 2 (Opening Database & ECO System) Complete

The platform contains the complete official Lichess opening classification dataset with 100% ECO coverage and an intelligent real-time opening recognition engine:

* **Official Sourced Dataset:** Sourced from [`lichess-org/chess-openings`](https://github.com/lichess-org/chess-openings) (CC0 Public Domain).
* **3,865 Verified Opening Records:** Every move sequence is simulated and validated by `chess.js` (0 illegal moves).
* **100% ECO Coverage:** Full coverage across all 500 ECO codes from **A00 to E99** without gaps.
* **Intelligent Recognition Engine:** Identifies exact lines, deepest matching variations, transpositions via EPD, and continuations in real time as moves are played or stepped through.
* **Search & Retrieval:** Search by Opening Name, ECO Code, Family, Variation, or ECO Range.
* **Offline-First:** Available 100% offline via local bundled JSON chunks and IndexedDB (`Dexie.js`).
* **Interactive Chessboard:** 60 FPS board viewport with legal move validation, castling, en passant, promotion modal, history navigation, FEN/PGN utilities, and dark/light themes.

---

## Tech Stack & Core Dependencies

| Component | Technology | Licence | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework & Build** | React 18, TypeScript 5.4, Vite 5 | MIT | Fast component architecture, strict typing, sub-second HMR |
| **Chess Logic** | `chess.js` (1.4.0) | BSD-2-Clause | Authoritative rules engine, FEN/PGN, legal move validation |
| **Opening Database** | `lichess-org/chess-openings` | CC0 Public Domain | 3,865 opening records across 500 ECO codes (A00–E99) |
| **Board Viewport** | `chessground` (9.2.1) | GPL-3.0 | 60 FPS board animations, touch & drag on mobile, arrows, legal dots |
| **Local Engine** | Stockfish 16/17 (WASM) | GPL-3.0 | Client-side Web Worker engine (Phase 4 integration) |
| **Offline Database** | Dexie.js (IndexedDB 4.0) | Apache-2.0 | Persistent local storage for repertoires, lessons, and openings |
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

Run the complete 140-point automated test suite:

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
Aligned with the licencing obligations of **Chessground** and **Stockfish**. Opening classification dataset is under **CC0 1.0 Universal (Public Domain)**.
