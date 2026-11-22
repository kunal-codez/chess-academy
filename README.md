# Chess Opening Academy

A professional, offline-first Chess Opening Academy, repertoire preparation, analysis, and training platform built with **React**, **TypeScript**, **Vite**, **Chessground**, **Chess.js**, **Stockfish WebAssembly**, and **Dexie.js (IndexedDB)**.

> **STRICT BUDGET: ₹0.00**  
> This project is designed to run entirely on open-source software, browser WebAssembly, client-side IndexedDB persistence, and free public APIs without paid subscriptions, cloud databases, or AI API token costs.

---

## Tech Stack & Core Dependencies

| Component | Technology | Licence | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework & Build** | React 18, TypeScript 5.4, Vite 5 | MIT | Fast component architecture, strict typing, sub-second HMR |
| **Chess Logic** | `chess.js` (1.0.0-beta.6) | BSD-2-Clause | Rules engine, FEN/PGN, legal move validation, castling, promotion, checkmate |
| **Board Viewport** | `chessground` (9.1.1) | GPL-3.0 | 60 FPS board animations, touch & drag on mobile, arrows, and legal dots |
| **Local Engine** | Stockfish 16/17 (WASM) | GPL-3.0 | Client-side Web Worker engine; centipawns, mate scores, PV candidate lines |
| **Offline Database** | Dexie.js (IndexedDB 4.0) | Apache-2.0 | Persistent local storage for repertoires, lessons, and cached opening stats |
| **Statistics** | Lichess Opening Explorer API | CC0 / Free | Master game win/draw percentages with local rate limiting and caching |
| **Styling** | Tailwind CSS 3.4, Lucide React | MIT | Clean, responsive desktop and Android UI, dark/light themes |

---

## Prerequisites

* **Node.js**: `v20.0.0` or higher (tested on Node.js `v24.18.0`).
* **Package Manager**: `npm` `10.0.0` or higher (tested on npm `11.16.0`).
* **Operating System**: Windows, macOS, or Linux.

---

## Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/your-username/chess-academy.git
cd chess-academy
npm install
```

### 2. Run Development Server

```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Run Verification Tests

Run the complete 23-point automated integration test suite:

```bash
npm test
```

### 4. Build for Production

```bash
npm run build
```
Generates an optimized, tree-shaken static production bundle in `dist/`.

### 5. Preview Production Build

```bash
npm run preview
```

---

## Project Structure

```
chess-academy/
├── public/
│   └── engine/
│       ├── stockfish.js               # Stockfish WASM wrapper script
│       ├── stockfish.wasm             # Compiled Stockfish 16/17 WebAssembly binary
│       └── stockfish.wasm.js          # Web Worker glue script
├── src/
│   ├── components/                    # Modular React components
│   │   └── ChessboardTest.tsx         # Verified interactive board viewport
│   ├── services/
│   │   ├── ChessService.ts            # chess.js rules & legal move calculator
│   │   ├── StockfishService.ts        # Web Worker UCI protocol communication
│   │   └── LichessService.ts          # Lichess Explorer API client & rate limiter
│   ├── db/
│   │   └── db.ts                      # Dexie.js IndexedDB schema & models
│   ├── types/                         # Shared TypeScript interfaces
│   ├── hooks/                         # Custom React hooks
│   ├── data/                          # Curated ECO A00–E99 opening datasets
│   ├── workers/                       # Dedicated Web Worker scripts
│   ├── App.tsx                        # Root application component
│   ├── main.tsx                       # React DOM entry point
│   └── index.css                      # Tailwind base & Chessground CSS themes
├── tests/
│   ├── integration/
│   │   └── run-all-integration-tests.ts # 23-point verification test runner
│   └── unit/                          # Individual module test specifications
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Licence

Licensed under the [GNU General Public License v3.0 (GPL-3.0)](LICENSE).  
Aligned with the licencing obligations of **Chessground** and **Stockfish**.
