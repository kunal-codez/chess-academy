# Chess Opening Academy (v1.0.0)

A professional, 100% offline-first Chess Opening Academy, repertoire preparation, analysis, and spaced repetition training platform built with **React**, **TypeScript**, **Vite**, **Chessground**, **Chess.js**, **Stockfish WebAssembly**, and **Dexie.js (IndexedDB)**.

> **STRICT BUDGET: ₹0.00**  
> This project operates entirely on open-source software, browser WebAssembly, client-side IndexedDB persistence, and free public APIs without paid subscriptions, cloud databases, or AI API token costs.

---

## Core Capabilities

* **Interactive Chessboard Arena:** 60 FPS board viewport (`chessground`) with legal move validation, castling, en passant, promotion modal, history navigation, FEN/PGN import/export, and dark/light themes.
* **Complete Opening Classification Database:** 3,865 verified legal opening records sourced from `lichess-org/chess-openings` with 100% ECO coverage across all 500 codes (A00–E99).
* **Opening Variation Tree Engine:** Trie tree with 8,802 nodes, 7,983 indexed EPD positions, real-time transposition detection, candidate continuations, and deepest book ply recovery.
* **Local Stockfish 16/17 WebAssembly Engine:** Client-side Web Worker engine running POPCNT WASM with zero SharedArrayBuffer requirements, pure UCI output parsing, white-perspective evaluation, smooth logistic win percentage curve, and dynamic Evaluation Bar.
* **Personal Repertoire Builder:** Create dedicated White and Black repertoires, save variations directly from the board or Opening Explorer, duplicate sequence protection, automatic ECO & name detection, custom study notes, tags, and portable JSON & PGN import/export.
* **Interactive Spaced Repetition (SRS) Drill Trainer:** SuperMemo SM-2 memory recall engine, automated opponent replies, two-stage hint system (square highlight & move arrow), instant snapback on mistakes, and engine spoiler protection (Stockfish suppressed during drills).
* **Offline Progressive Web App (PWA):** Standalone installability on Android, iOS, and Desktop devices with Workbox Service Worker precaching every runtime asset (including Stockfish WASM and opening datasets).
* **Safe Keyboard Navigation:** Navigate plies with `ArrowLeft`/`ArrowRight`, jump with `Home`/`End`, and flip perspective with `F` (with strict input, modal, and drill-mode guards).
* **IndexedDB Local Persistence (Dexie v4):** 100% offline persistence for openings, repertoires, saved positions, and SRS training progress records.

---

## Tech Stack & Core Dependencies

| Component | Technology | Licence | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework & Build** | React 18, TypeScript 5.4, Vite 5 | MIT | Fast component architecture, strict typing, sub-second HMR |
| **Chess Rules Logic** | `chess.js` (1.4.0) | BSD-2-Clause | Authoritative rules engine, FEN/PGN, legal move validation |
| **Opening Database** | `lichess-org/chess-openings` | CC0 Public Domain | 3,865 opening records across 500 ECO codes (A00–E99) |
| **Board Viewport** | `chessground` (9.2.1) | GPL-3.0 | 60 FPS board animations, touch & drag on mobile, arrows, legal dots |
| **Local Engine** | Stockfish 16/17 (WASM) | GPL-3.0 | Client-side Web Worker engine (POPCNT WASM + asm.js fallback) |
| **Offline Database** | Dexie.js (IndexedDB 4.0) | Apache-2.0 | Version 4 schema for repertoires, lines, progress, and openings |
| **PWA & Offline Cache** | `vite-plugin-pwa` (Workbox) | MIT | Standalone manifest, local app icons, and full offline caching |
| **Styling & Icons** | Tailwind CSS 3.4, Lucide React | MIT | Clean, responsive desktop and mobile UI, dark/light themes |

---

## Keyboard Shortcuts

| Shortcut | Action | Scope / Guard |
| :--- | :--- | :--- |
| `←` (ArrowLeft) | Step backward one ply | Disabled inside inputs, open modals, and active Drill Mode |
| `→` (ArrowRight) | Step forward one ply | Disabled inside inputs, open modals, and active Drill Mode |
| `Home` | Jump to start of move history | Disabled inside inputs, open modals, and active Drill Mode |
| `End` | Jump to latest board position | Disabled inside inputs, open modals, and active Drill Mode |
| `F` or `f` | Flip board perspective (White ⇄ Black) | Active everywhere except when typing inside input elements |

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

### 3. Run Automated Tests

Run the complete 493-point automated integration test suite:

```bash
npm test
```

### 4. Build for Production (PWA)

```bash
npm run build
```

---

## Open-Source Attributions & Licenses

* **Stockfish:** GPL-3.0 by the Stockfish Developers ([https://stockfishchess.org/](https://stockfishchess.org/)).
* **Chessground:** GPL-3.0 by Niklas Fiekas and the Lichess community ([https://github.com/lichess-org/chessground](https://github.com/lichess-org/chessground)).
* **Lichess Chess Openings:** CC0 1.0 Universal Public Domain Dedication, DOI: `10.5281/zenodo.19608774` ([https://github.com/lichess-org/chess-openings](https://github.com/lichess-org/chess-openings)).
* **Chess.js:** BSD-2-Clause by Jeff Hlywa ([https://github.com/jhlywa/chess.js](https://github.com/jhlywa/chess.js)).
* **Dexie.js:** Apache-2.0 by David Fahlander ([https://dexie.org/](https://dexie.org/)).
